// Thin client over Growvana's backend HTTP endpoints. The full base URL
// (including `/api/v1`) comes from `VITE_API_BASE_URL` in .env — no
// Vite proxy, no relative-path fallback. The browser hits the backend
// directly; CORS on the backend handles the cross-origin call.

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * POST /api/v1/chat/init
 * Returns { thread_id, ai_message, gap_questions }.
 *
 * Pass `webhook_request` to have the backend's init nodes fire progress
 * webhooks at each substep (homepage_extraction, url_mapping, etc.).
 * The webhook POSTs go to `webhook_request.webhook_url` — typically the
 * local relay (see webhook-relay/), which forwards them to any SSE
 * subscriber on `/relay/events/{task_id}`.
 */
export async function initChat({ thread_id, company_url, file_urls, webhook_request }) {
  const body = { init_request: { thread_id, company_url, file_urls } };
  if (webhook_request) body.webhook_request = webhook_request;

  const res = await fetch(`${API_BASE}/chat/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`init failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

/**
 * POST /api/v1/chat/stream — returns an async iterator of SSE events.
 * Each yielded value is the parsed JSON object from `data: <json>`.
 *
 * Exactly one of user_message or gap_answers should be supplied.
 *
 * Pass `webhook_request` to have milestone nodes fire lifecycle webhooks
 * to the configured `webhook_url`. The browser itself reads those events
 * back via the relay SSE subscription (see `subscribeProgress`); the
 * `/chat/stream` SSE channel carries tokens only.
 */
export async function* streamChat({ thread_id, user_message, gap_answers, file_urls, webhook_request, signal }) {
  const body = { chat_request: { thread_id } };
  if (user_message !== undefined) body.chat_request.user_message = user_message;
  if (gap_answers !== undefined) body.chat_request.gap_answers = gap_answers;
  if (file_urls && file_urls.length > 0) body.chat_request.file_urls = file_urls;
  if (webhook_request) body.webhook_request = webhook_request;

  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`stream failed (${res.status}): ${text || res.statusText}`);
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
