// Thin client for the /api/v1/meta-ad-agent endpoints.
//
// Two entry paths at /init:
//   - create_ads  → returns { path, ai_message, questions: [{gap, question, options}] }
//   - tune_existing_ads → returns { path, ads: [{ad_id, ad_name, status, thumbnail_url,
//                                  format, objective, spend, ctr, cpc, cpm}] }
// Both assemble the account snapshot from the synced Stage-1 cache, scoped by the
// request's tenant_id + account_id (which ad account to read, since a tenant owns
// many). The Graph token is NOT sent here — it lives only on the /meta-ad-sync/run
// endpoint.
//
// /stream SSE frame types (each yielded value is one parsed `data: <json>` frame):
//   - { type: 'ai_message_token', content }       tokens for the CMO's <message> body
//   - { type: 'diagnosis_drafting', name }         the diagnosis node started (loader)
//   - { type: 'competitor_lens_drafting', name }   the competitor lens node started (loader)
//   - { type: 'strategy_drafting', name }          the strategy node started (loader)
//   - { type: 'creative_drafting', name }          the creative node started (loader)
//   - { type: 'done', thread_id, diagnosis, competitor_lens, strategy, creative }
//        diagnosis       = { diagnoses: [{ad_id, ad_name, diagnosis_html}] } | null
//                          (uniform list; the 'combined' roll-up is the entry whose
//                           ad_id === 'combined' — present only for ≥2 ads or the
//                           account-wide path; a single selected ad is its own entry)
//        competitor_lens = competitor lens HTML string | null
//        strategy        = strategy HTML string | null
//        creative        = STRUCTURED ad draft | null
//                          { new: { campaign, adset, ads: [...] } | null,
//                            tune: [ { campaign, adset, ad } ] | null }
//                          (campaign/adset/ads — NOT HTML; each ad carries
//                           image_slots[].variants[] with image_url+image_hash for
//                           existing assets or data_uri for generated ones)
//        (each is null when that agent didn't run this turn → keep the prior one)
//   - { type: 'error', status, code, message }
//
// A turn can produce several artifacts (the diagnosis → competitor lens →
// strategy → creative chain). The done frame is the authoritative end-of-turn
// snapshot; DURING the turn the same artifacts also stream, one object at a time,
// via GRANULAR webhooks (subscribe with subscribeProgress(taskId)). Every webhook
// carries a user-facing `success_message` (for the live activity feed). Rule:
// BATCH what lands together, STREAM what lands apart.
//
// SHAPE CONTRACT: every completion webhook's `data` is EXACTLY the value shape of the
// matching `done` field ("value only"), so ONE reducer serves both webhook and done.
// There is no `op` / create-vs-edit field on the wire — the `success_message` already
// conveys that ("Generated"/"Updated") and the frontend merges by id/key. Stages:
//   Tool calls (fired when a specialist invokes a tool):
//     'meta_ad.diagnosis.tool_call' / 'meta_ad.strategy.tool_call' /
//     'meta_ad.creative.tool_call'  { tool_name, args }
//   Diagnosis / strategy — one webhook PER doc, as each generates / is edited. The
//   doc rides in a one-element list, the same envelope done.diagnosis/.strategy use:
//     'meta_ad.diagnosis.doc'  { diagnoses:  [{ ad_id, ad_name, diagnosis_html }] }
//     'meta_ad.strategy.doc'   { strategies: [{ ad_id, ad_name, strategy_html }] }
//   Creative — each carries a PARTIAL { campaigns:[...] } tree (the done.creative
//   value shape); real Meta ids on tune; feed each to mergeCreativeTree:
//     'meta_ad.creative.structure'  { campaigns: [...] }  (campaign(s)+ad set(s) from
//                                     one reply, or an edit batch — all landing together)
//     'meta_ad.creative.ad'    { campaigns: [...] }  (one generated ad nested under id
//                                     locators; slim — data_uri null)
//     'meta_ad.creative.image' { campaigns: [...] }  (one image nested ad→slot→lane→variant;
//                                     the variant CARRIES data_uri)
//   Competitor lens — discovery-pipeline progress then serial artifacts:
//     'meta_ad.competitor_lens.planning'  { queries }
//     'meta_ad.competitor_lens.search'    { source, count }        (per source, as each lands)
//     'meta_ad.competitor_lens.filtering' { source, kept, total }  (per source, as each lands)
//     'meta_ad.competitor_lens.ads'       { ads, queries }         (merged + capped clean cards)
//     'meta_ad.competitor_lens.analysis'  { long_runner_notes, open_lanes, honest_read }
//     'meta_ad.competitor_lens.html'      { competitor_lens }      (same HTML string as done.competitor_lens)
// The competitor lens node fetches the real competitor ads from WinningHunter
// itself on its first run (no /init prefetch).

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * POST /api/v1/meta-ad-agent/init
 * `path` is 'create_ads' or 'tune_existing_ads'. `tenant_id` + `account_id` scope
 * the synced ad data the snapshot is assembled from (`account_id` picks which ad
 * account; accepts `act_…` or the bare id). `foundation_thread_id` is the phase-1
 * thread whose checkpoint supplies brand_bible + buyer_personas.
 */
export async function initMetaAdAgent({
  thread_id,
  foundation_thread_id,
  path,
  tenant_id,
  account_id,
}) {
  // NO-ACCOUNT mode: the backend takes tenant_id/account_id as an optional PAIR
  // — pass both undefined to start without a connected ad account (create path
  // only). JSON.stringify drops undefined values, so the keys are simply absent.
  const res = await fetch(`${API_BASE}/meta-ad-agent/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thread_id,
      foundation_thread_id,
      path,
      tenant_id,
      account_id,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`meta-ad-agent init failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

/**
 * POST /api/v1/meta-ad-agent/init_with_pdf  (multipart/form-data)
 * Same as /init, but brand_bible + buyer_personas + competitive_analysis are
 * sourced from the uploaded Company Blueprint PDF (sections "Competitive
 * Analysis" → "Brand Bible" → "Buyer Personas"; any "Market Analysis" preamble
 * is ignored) instead of the phase-1 checkpoint. No foundation_thread_id.
 * Returns the same shape as /init.
 */
export async function initMetaAdAgentWithPdf({
  thread_id,
  path,
  tenant_id,
  account_id,
  pdfFile,
}) {
  const form = new FormData();
  form.append('thread_id', thread_id);
  form.append('path', path);
  // NO-ACCOUNT mode: append the pair only when present — FormData would
  // stringify undefined into the literal "undefined" otherwise.
  if (tenant_id != null && account_id != null) {
    form.append('tenant_id', tenant_id);
    form.append('account_id', account_id);
  }
  form.append('pdf_file', pdfFile);
  const res = await fetch(`${API_BASE}/meta-ad-agent/init_with_pdf`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`meta-ad-agent init_with_pdf failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

export async function* streamMetaAdAgent({
  thread_id,
  user_message,
  gap_answers,
  selected_ad_ids,
  attachment_urls,
  webhook_request,
  signal,
}) {
  const body = { meta_ad_request: { thread_id } };
  if (user_message !== undefined) body.meta_ad_request.user_message = user_message;
  if (gap_answers !== undefined) body.meta_ad_request.gap_answers = gap_answers;
  if (selected_ad_ids !== undefined) body.meta_ad_request.selected_ad_ids = selected_ad_ids;
  // Per-turn chat attachments (image/PDF URLs): the backend downloads them and
  // inlines the bytes as multimodal parts on the SQL + CMO agents' LLM calls;
  // they do not persist across turns.
  if (attachment_urls && attachment_urls.length > 0) {
    body.meta_ad_request.attachment_urls = attachment_urls;
  }
  if (webhook_request) body.webhook_request = webhook_request;

  const res = await fetch(`${API_BASE}/meta-ad-agent/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`meta-ad-agent stream failed (${res.status}): ${text || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop() ?? '';
    for (const p of parts) {
      const line = p.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trimStart();
      if (!payload) continue;
      try {
        yield JSON.parse(payload);
      } catch {
        /* ignore malformed chunk */
      }
    }
  }
}
