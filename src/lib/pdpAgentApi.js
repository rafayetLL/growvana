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
// It also returns `product_title` — the product's own name, and the ONE thing the
// response says about what was read. Null when it could not be determined, which is
// an ordinary state and not an error. The header shows it: on the capture path the
// founder never typed a title, and the thread is immutable, so it is their only
// confirmation the right page was captured.
//
// That same call is the GUARDRAIL on the page-scrape path. A link that reads fine
// but turns out to be a category page, a blog post or a brand home page is refused
// with a 422 `NotAProductPageError` rather than audited as one product — distinct
// from the 502 that means the page could not be read at all, where retrying is fair
// advice. Its message is already written for a founder, so `friendlyInitError`
// passes it straight through. Send them back to the URL field, and use a NEW
// thread_id for the corrected link: the rejected one has already been opened.
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
//   - { type: 'studio_working', name }
//        The Studio started. Once per turn, not once per ReAct loop pass. It is
//        the second-slowest step after the Scout — a batch of six images renders
//        for minutes — so say so rather than showing a bare spinner.
//   - { type: 'done', thread_id, audit, strategy, scout, content, image_sets }
//        Authoritative end-of-turn snapshot. EACH is null when that specialist did
//        not run this turn — null means UNCHANGED, never "clear it".
//
//        The Studio's two keys were `studio_content` / `studio_image_sets` between
//        2026-08-03 and 2026-08-05, named for the specialist that writes them the
//        way `audit` / `strategy` / `scout` already are. Reverted to the bare names
//        to keep an already-integrated client working. The backend's own field and
//        schema names did NOT move back — this is the wire only.
//
//        `audit`    `{ html }` — every area audited so far, composed into ONE
//                   rendered page. Replaced whole, so a receiver that missed a
//                   progress webhook loses nothing.
//
//                   The four areas' OWN output never reaches this wire. Three of
//                   them are markdown documents and Images is structured, but all
//                   of it is backend-internal: it feeds this render and each
//                   area's own next pass, and nothing else. So there is no
//                   per-area value to merge and no area key to loop over.
//        `strategy` `{ html }` — the page itself, written whole by ONE call. No
//                   markdown source rides beside it, so the two can no longer
//                   disagree about which document this is. Replaced whole.
//
//        `scout`    `{ html }` — the competitor field as ONE page. Replaced whole
//                   like the strategy: a run maps the field as it stands TODAY, so
//                   there is nothing to merge into. Built SERVER-SIDE IN PYTHON,
//                   not composed by a model, so it cannot arrive half-rendered and
//                   needs no fallback rendering here — which is also why every
//                   figure on it is computed rather than typed.
//
//                   It carried `{ analysis, queries, product_count }` too until
//                   2026-08-03, and nothing here read any of them: `analysis` is
//                   read by the backend's own CMO and Strategist as a text digest,
//                   from state, and the builder had already rendered it into the
//                   page. Now `{html}` like the audit, the strategy, and the Meta
//                   Ad competitor lens this specialist mirrors.
//
//        `content`  the DRAFT PAGE — the Studio's text artifact, `{html}` since
//                   2026-08-07. ONE self-contained document: the copy, its layout
//                   and its picture references together, styled as the storefront
//                   the product sells on. Replaced whole. Render it in an iframe
//                   sandboxed WITHOUT scripts — it is model-written, carries all
//                   its CSS inline and runs nothing.
//
//                   It was a container with one nullable side per platform until
//                   then — `amazon` (a fixed form) or `generic` (a recursive
//                   `blocks` tree) — and this file laid the page out from those
//                   fields. Both are gone.
//
//                   ITS PICTURES ARE REFERENCES, AND YOU RESOLVE THEM. An `<img>`
//                   whose src is `pdp-image:SET/SLOT` names one picture; any
//                   element carrying a keyless `data-pdp-gallery` is THE gallery, a
//                   REGION to replace with every picture on the thread, in set
//                   order. Both resolve against `image_sets` below — see
//                   `resolveContentHtml` in `PdpAgentScreen.jsx`, which is the twin
//                   of the backend's own resolver.
//
//                   RE-RESOLVE WHENEVER EITHER SIDE MOVES. The gallery region fills
//                   from whatever the sets hold right now, so a picture arriving on
//                   `pdp.studio.image` must appear on the page immediately — with
//                   no new `content` payload. That is the whole reason the page
//                   ships unresolved, and it is also what keeps a generated
//                   picture's base64 off this frame: it rides `image_sets` once.
//
//        `image_sets` the page's PICTURES — `{ sets: [...] }`. A set is a group
//                   sharing a `category` and an `aspect_ratio`; a slot is one
//                   picture; a slot's `versions` are APPEND-ONLY takes of it, so
//                   the LAST version is the current picture and nothing is ever
//                   removed. Replaced whole.
//
//                   One category can span SEVERAL sets — a gallery whose
//                   photographs are not all the same shape is one gallery across
//                   one set per shape — so group sets by `category` for display or
//                   a founder sees their gallery split in two.
//
//                   **Versions carry base64 in `data_uri`**, unlike everything
//                   else on this wire. That is unavoidable rather than an
//                   oversight: a GENERATED picture exists nowhere else and cannot
//                   be fetched by URL. A version with a `url` is one of the
//                   product's own existing photographs and carries both — prefer
//                   the url there and keep the bytes as the fallback, since a
//                   merchant CDN url can expire.
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
//     'pdp.audit.<area>'      { area }             (ONE area landed; never batched
//                                                   — the areas finish far apart)
//   <area> is one of seo, aeo, images, layout — and it names itself in `data.area`,
//   so a fifth area needs no change on this side. These are WIRE values, not the
//   backend's own field names: its state fields and tools are `audit_seo` etc., and
//   the prefix is stripped on the way out (reverted 2026-08-05). Key off what
//   arrives, never off what the backend calls it internally.
//
//   This is a PROGRESS EVENT and carries no audit content. The areas finish
//   minutes apart, so an area landing is worth showing long before the page exists
//   — but what it produced stays server-side, and the composed page arrives on the
//   `done` frame. Use it for the activity feed and a "N of 4" line, nothing more.
//   Scout — fired by /stream:
//     'pdp.scout.report'      { scout: { html } }   (the field landed)
//   ONE stage, not a per-step pipeline like the Meta Ad lens's: the Scout produces
//   ONE artifact, so there is nothing to stagger. Its `data.scout` IS the `done`
//   frame's `scout` value, so the same handler serves both — and because a Scout
//   run replaces rather than merges, that handler is a plain assignment.
//   Studio — fired by /stream:
//     'pdp.studio.tool_call'  { tool_name, args }   (before the work runs)
//     'pdp.studio.content'    { content: {…} }      (the page's words landed)
//     'pdp.studio.image'      { image_sets: {…} }    (ONE picture, as made)
//   TWO completion stages because the two artifacts land differently: the content
//   arrives whole in one call, while the pictures arrive ONE AT A TIME over several
//   minutes — which is the whole reason to subscribe rather than wait for `done`.
//
//   `pdp.studio.image`'s `data.image_sets` is a PARTIAL of the `done` frame's
//   value: the path down to the ONE new version, carrying its set's key, category
//   and aspect_ratio so a receiver that has never seen that set can create it from
//   this webhook alone. So it needs a per-set/per-slot MERGE, unlike the content
//   stage — which is a plain assignment, like the scout's.

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
 * Returns `{ thread_id, path, platform, product_title, ai_message, questions }`.
 * This call is slow
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
 *
 * `pdfFile` is OPTIONAL. Omit it and the thread opens with NO brand context —
 * `brand_bible` and `buyer_personas` are seeded as empty strings, which every
 * backend reader coalesces to "_Not available._" (a space would not: it is truthy
 * and would render a blank section instead). This is the only entry that can do
 * that; `/init` still requires its `foundation_thread_id`, as the Meta Ad init
 * does. It is what the standalone entry uses when no project backs the screen.
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
  // The PDF is OPTIONAL, so it is appended only when there is one — for the same
  // reason as the fields above: FormData stringifies null into the literal "null",
  // which would reach the backend as a file part with a filename and blow up the
  // PDF split on bytes that are not a PDF. Omitted entirely, the thread opens with
  // no brand context and both deliverables empty.
  if (pdfFile) form.append('pdf_file', pdfFile);

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
