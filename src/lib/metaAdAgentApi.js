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
// strategy → creative chain). Each artifact also arrives via the webhook relay
// before the done frame — stages 'meta_ad.diagnosis_html' ({diagnoses}),
// 'meta_ad.competitor_lens_html' ({html}), 'meta_ad.strategy_html' ({html}), and
// 'meta_ad.creative_draft' ({new|null, tune|null} — slim: generated image base64
// dropped, existing image_url/image_hash kept) — subscribe with
// subscribeProgress(taskId). The competitor lens node fetches the real competitor
// ads from Foreplay itself on its first run (no /init prefetch).

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
  form.append('tenant_id', tenant_id);
  form.append('account_id', account_id);
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
