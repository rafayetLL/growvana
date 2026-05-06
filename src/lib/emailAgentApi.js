// Thin client for the /api/v1/email-agent endpoints.
//
// Each yielded value is the parsed JSON object from one `data: <json>` frame.
// Frame types:
//   - { type: 'ai_message_token', content }
//       Tokens for the user-facing <message> body.
//   - { type: 'email_generation_started', kind: 'single' | 'sequence' }
//       Fired ONCE the moment the LLM's output reveals the kind. Lets
//       the UI show a 'Drafting…' indicator before any structured
//       webhook lands. Mirrors the chat stream's `milestone_drafting`.
//   - { type: 'email_body_html_token', content, step_number? }
//       Tokens for the styled HTML body fragment (with
//       `{{CTA_<NAME>_LABEL}}`, `{{CTA_<NAME>_HREF}}`, `{{IMAGE_<NAME>}}`,
//       and any other UPPERCASE `{{TOKEN}}` placeholders intact). The
//       inbox preview text is NOT a body_html placeholder — it lives on
//       the chosen subject variant's `preview_text` and is rendered
//       separately in the UI. `step_number` is omitted (or 0) for a
//       single email; present (1-indexed) for sequence steps.
//   - { type: 'done', thread_id, email_plan, generated_kind,
//                     single, sequence, segmentation_strategy, warnings,
//                     generated_images }
//       The chat reply is NOT on this frame — the frontend assembles it
//       live from the `ai_message_token` stream emitted during the
//       orchestrator's pass.
//       `generated_kind` is 'single' | 'sequence' | null (conversational).
//       `single` / `sequence` carry the full SingleEmail / Sequence payload
//       — including `body_html` (with `{{TOKEN}}` placeholders LITERAL),
//       `placeholders` (regex-extracted token list), `ctas` (list of
//       CtaSlot {name, label_token, href_token, variants} — backend ships
//       the FULL braced label/href tokens so the frontend never has to
//       concatenate `CTA_<NAME>_<suffix>`), `cta_ab_tests` (CtaAbTest
//       entries keyed by slot_name).
//       `generated_images` is a `{ "{{IMAGE_<NAME>}}": data_uri }` map
//       written by the `generate_email_images` tool — keyed by the FULL
//       braced placeholder string, so the frontend substitutes via direct
//       `replaceAll(token, dataUri)` with no name-prefix surgery.
//       Backend never substitutes them.
//   - { type: 'error', status, code, message }
//       Structured error frame (Timeout Error / GrowvanaException class /
//       Unknown Error). Includes the blueprint-missing message when the
//       backend can't find a blueprint for this thread.
//
// Structured email blocks (metadata, subject_lines, body, ctas, cta_ab_tests,
// subject_line_ab_test, segmentation_strategy, warnings, sequence_metadata,
// step_metadata) AND the slim `email.images` event (count + slot names
// only — no URIs) do NOT come over this stream — they arrive via the
// webhook relay. Subscribe with `subscribeProgress(thread_id)`.

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function* streamEmailAgent({ thread_id, user_message, webhook_request, signal }) {
  const body = { email_request: { thread_id, user_message } };
  if (webhook_request) body.webhook_request = webhook_request;

  const res = await fetch(`${API_BASE}/email-agent/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`email-agent stream failed (${res.status}): ${text || res.statusText}`);
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

