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
//       Tokens for the styled HTML body fragment (with [[PREHEADER]],
//       [[CTA_N_LABEL]], [[CTA_N_HREF]] placeholders intact). `step_number`
//       is omitted (or 0) for a single email; present (1-indexed) for
//       sequence steps.
//   - { type: 'done', thread_id, ai_message, generated_kind }
//       generated_kind is 'single' | 'sequence' | null (conversational turn).
//   - { type: 'error', status, code, message }
//       Structured error frame (Timeout Error / GrowvanaException class /
//       Unknown Error). Includes the blueprint-missing message when the
//       backend can't find a blueprint for this thread.
//
// Structured email blocks (metadata, subject_lines, ctas (list-of-list),
// cta_ab_tests (slot-aligned), segmentation_strategy, warnings) do NOT
// come over this stream — they arrive via the webhook relay. Subscribe
// with `subscribeProgress(thread_id)`.

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

