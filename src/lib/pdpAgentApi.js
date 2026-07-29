// Thin client for the /api/v1/pdp-agent endpoints.
//
// One thread covers exactly ONE product, and INIT INPUTS ARE IMMUTABLE — nothing
// on /stream can change the audited page text or image list. A different product,
// or a different image list, means a new thread.
//
// Two entry paths at /init, both required to declare a `platform`
// ('amazon' | 'other') — Amazon is read structurally, everything else is captured
// as a full-page picture, which is the only distinction the platform makes:
//   - page_scrape → paste a public product URL. The live page is read INSIDE the
//     init request (blocking), so this call is slow; pass a `webhook_request` to
//     watch it happen rather than showing a blank spinner.
//   - raw_input   → describe the product in your own words and supply image URLs.
//     Image URLs are optional: a founder with no photos yet still gets an audit.
// A field belonging to the OTHER path is REJECTED, not ignored.
//
// BOTH paths then run the graph's gap analysis, so /init returns `ai_message` and
// `questions: [{gap, question, options}]` — generated, not templated. That call
// sits on top of an already-slow scrape, which is why it has its own progress
// stage. `questions` is empty when the call failed; init still succeeds and the
// audit still runs.
//
// The answers go back on the FIRST /stream turn as `gap_answers`, positionally
// aligned with that list. Answering is OPTIONAL: an inner `[]` skips one question,
// and an all-empty submission is still a real turn that runs the audit. It is the
// one thing a /stream turn writes back to what init produced — and it changes the
// founder's context, never the audited page.
//
// /stream SSE frame types (each yielded value is one parsed `data: <json>` frame):
//   - { type: 'ai_message_token', content }
//        The CMO's <message>, then the closing recap. They are ONE assistant turn:
//        concatenate in arrival order rather than rendering two bubbles.
//   - { type: 'auditor_researching', name }
//        The Auditor started. Fires ONCE PER TURN — not once per ReAct loop pass.
//   - { type: 'scout_researching', name }
//        The Scout started. Once per turn, and the SLOWEST step by far — it
//        searches the category, then reads each winning product page — so tell the
//        founder a few minutes is normal rather than leaving a bare spinner.
//   - { type: 'strategist_working', name }
//        The Strategist started. Also once per turn; it is a single call with no
//        loop, so there is no second pass it could fire on.
//   - { type: 'done', thread_id, audit, strategy, scout }
//        Authoritative end-of-turn snapshot. EACH is null when that artifact did
//        not move this turn — null means UNCHANGED, never "clear it".
//
//        `audit`    the WHOLE current audit, every area audited so far, so a
//                   receiver that missed an area webhook is backfilled here.
//                   THREE areas are markdown strings (seo, aeo, layout); IMAGES
//                   alone is structured, because its rows are keyed by image URL
//                   and each photograph renders beside its own judgement. It also
//                   carries `html` — all four areas composed into ONE rendered
//                   document — which is NOT an area and must be excluded from any
//                   loop over areas.
//        `strategy` `{ markdown, html }`. One document, rewritten whole, so there
//                   is nothing to merge. `html` can lag `markdown` by exactly one
//                   failed render, which is why both ride the frame.
//
//        `scout`    `{ analysis, html, queries, product_count }`. One document,
//                   replaced whole like the strategy — a run maps the field as it
//                   stands TODAY, so there is nothing to merge into. `html` is
//                   built SERVER-SIDE IN PYTHON, not composed by a model, so it
//                   cannot arrive half-rendered and needs no fallback rendering
//                   here. `analysis` rides along because the backend's own CMO and
//                   Strategist read it as text; it is not a second view of the page.
//
//        Neither the audit nor the strategy carries the rasterized PNG the backend
//        keeps for its own models to look at — that is stripped server-side,
//        because this client already has the HTML. The scout has none at all: it
//        reaches those models as text, so nothing is ever rendered for them.
//   - { type: 'error', status, code, message }
//        `message` is always phrased for a founder — show it as-is.
//
// No artifact is ever token-streamed. Only assistant messages stream.
//
// SHAPE CONTRACT (the same one the Meta Ad Agent holds): every completion
// webhook's `data` is a PARTIAL of exactly the `done` frame's `audit` value —
// `{ "<area>": … }`, keyed by the area's own field name — so ONE reducer serves
// both. No `op` / create-vs-edit marker rides the wire; that distinction is in the
// `success_message` wording alone ("is ready" / "updated").
//
// Webhook stages (subscribe with subscribeProgress(taskId)), two families:
//   Intake — fired by /init only (a multipart form carries no webhook config, so
//   /init_with_pdf fires none). The raw input path fires `thread_ready` only:
//     'pdp.intake.scrape_started'        { product_url, platform }
//     'pdp.intake.scrape_completed'      Amazon: { product_url, listing, image_urls }
//                                        capture: { product_url, has_page_capture,
//                                        image_urls } — or status 'error' + HTTP 502
//                                        when the page could not be read
//     'pdp.intake.gap_questions_started' { product_url, platform } — fires on BOTH
//                                        paths, before the gap analysis call
//     'pdp.intake.thread_ready'          the init response body VERBATIM, questions
//                                        included (completed)
//   Audit — fired by /stream:
//     'pdp.audit.tool_call'   { tool_name, args }  (before the area runs)
//     'pdp.audit.<area>'      { <area>: {…} }      (ONE area landed; never batched
//                                                   — the areas finish far apart)
//   <area> is one of the four audit field names: seo, aeo, images, layout. Nothing
//   here enumerates them — the stage suffix IS the key inside `data`, so a fifth
//   area needs no change on this side.
//   Scout — fired by /stream:
//     'pdp.scout.report'      { scout: {…} }        (the field landed)
//   ONE stage, not a per-step pipeline like the Meta Ad lens's: the Scout produces
//   ONE artifact, so there is nothing to stagger. Its `data.scout` IS the `done`
//   frame's `scout` value, so the same handler serves both — and because a Scout
//   run replaces rather than merges, that handler is a plain assignment.

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Backend errors carry `{ error, message, details }` and the `message` is already
// written for a founder. FastAPI's own request-validation failures carry `detail`
// instead, which is internal field paths — never show those.
async function errorMessageFrom(res, fallback) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    return fallback;
  }
  if (typeof body?.message === 'string' && body.message) return body.message;
  return fallback;
}

/**
 * POST /api/v1/pdp-agent/init
 *
 * `foundation_thread_id` is the phase-1 thread whose checkpoint supplies
 * brand_bible + buyer_personas (+ competitive_analysis). It is REQUIRED — a
 * founder without one uses `initPdpAgentWithPdf` instead.
 *
 * Supply `product_url` on the page scrape path, or `product_text` (+ optional
 * `image_urls`) on the raw input path. JSON.stringify drops undefined values, so
 * the other path's fields are simply absent rather than sent as null.
 *
 * Returns `{ thread_id, path, platform, ai_message, questions }`. This call is slow
 * twice over — a blocking page read, then the gap analysis on top of it — so pass a
 * `webhook_request` and show the intake stages.
 */
export async function initPdpAgent({
  thread_id,
  foundation_thread_id,
  path,
  platform,
  product_url,
  product_text,
  image_urls,
  webhook_request,
}) {
  const body = {
    init_request: {
      thread_id,
      foundation_thread_id,
      path,
      platform,
      product_url,
      product_text,
      image_urls,
    },
  };
  if (webhook_request) body.webhook_request = webhook_request;

  const res = await fetch(`${API_BASE}/pdp-agent/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      await errorMessageFrom(res, "We couldn't get your product set up. Try again in a moment.")
    );
  }
  return res.json();
}

/**
 * POST /api/v1/pdp-agent/init_with_pdf  (multipart/form-data)
 *
 * The same intake, for a founder with no Foundation thread: brand context comes
 * from an uploaded Company Blueprint PDF (headings "Competitive Analysis" →
 * "Brand Bible" → "Buyer Personas", in that order; any "Market Analysis" preamble
 * is ignored) instead of the phase-1 checkpoint. No `foundation_thread_id`, and
 * NO progress webhooks — a multipart form carries nowhere clean to put a webhook
 * config, so a page scrape here shows no intake stages. Returns the same shape.
 */
export async function initPdpAgentWithPdf({
  thread_id,
  path,
  platform,
  product_url,
  product_text,
  image_urls,
  pdfFile,
}) {
  const form = new FormData();
  form.append('thread_id', thread_id);
  form.append('path', path);
  form.append('platform', platform);
  // Append only what this path uses — FormData would stringify undefined into the
  // literal "undefined", which the backend would read as the other path's field
  // being present and reject the request.
  if (product_url) form.append('product_url', product_url);
  if (product_text) form.append('product_text', product_text);
  for (const url of image_urls || []) form.append('image_urls', url);
  form.append('pdf_file', pdfFile);

  const res = await fetch(`${API_BASE}/pdp-agent/init_with_pdf`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    throw new Error(
      await errorMessageFrom(res, "We couldn't read that Blueprint PDF. Check the file and try again.")
    );
  }
  return res.json();
}

/**
 * POST /api/v1/pdp-agent/stream — one conversation turn.
 *
 * Carries the thread, what the founder said, their gap answers on the first turn,
 * and anything they attached — and NOTHING that can mutate the audited product.
 * `attachment_urls` are per-turn conversation context only (a competitor page, a
 * brief, a screenshot): they are inlined on the CMO's call and cleared afterwards.
 * A turn with none of the three is rejected.
 *
 * `gap_answers` is sent whenever it is defined, INCLUDING an all-empty list — that
 * is a founder skipping every question, which is a real submission and opens a turn
 * like any other. Only `undefined` means "not answering this turn".
 */
export async function* streamPdpAgent({
  thread_id,
  user_message,
  gap_answers,
  attachment_urls,
  webhook_request,
  signal,
}) {
  const body = { pdp_request: { thread_id } };
  if (user_message !== undefined) body.pdp_request.user_message = user_message;
  if (gap_answers !== undefined) body.pdp_request.gap_answers = gap_answers;
  if (attachment_urls && attachment_urls.length > 0) {
    body.pdp_request.attachment_urls = attachment_urls;
  }
  if (webhook_request) body.webhook_request = webhook_request;

  const res = await fetch(`${API_BASE}/pdp-agent/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(
      await errorMessageFrom(res, "That message didn't get through. Send it again.")
    );
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
