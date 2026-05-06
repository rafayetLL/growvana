// Thin SSE client for the /api/v1/email-agent-sdk endpoint.
//
// The backend wraps the Claude Agent SDK's `query()` loop and emits one
// `data: <json>` frame per event:
//
//   - { type: 'session', session_id }
//       Fired once at session start. The frontend persists this and
//       sends it back as `session_id` on subsequent turns to resume the
//       same agent session (keeps prior reasoning + tool history).
//   - { type: 'text_delta', content }
//       Assistant text token chunk. With `include_partial_messages=True`
//       these stream in real time (multiple per turn) — append.
//   - { type: 'text_final', content }
//       Canonical full text for a TextBlock (lands at end of turn,
//       after all `text_delta`s for it). Same string the deltas built
//       up — frontend can ignore it (we already rendered) or use it to
//       reconcile any dropped chunks.
//   - { type: 'tool_use', id, name, input }
//       Agent invoked a tool. Use `id` to correlate with the matching
//       `tool_result` frame.
//   - { type: 'tool_result', tool_use_id, content, is_error }
//       Tool returned. `content` is a string (the backend stringifies
//       list-shaped results before forwarding).
//   - { type: 'email_file', filename, path, url }
//       Agent wrote/edited an HTML file under `email_outputs/`. `url`
//       is relative to the API host — render in an iframe by prefixing
//       with `VITE_API_BASE_URL`'s origin (strip `/api/v1`).
//   - { type: 'done', subtype, result, session_id, total_cost_usd, num_turns }
//       Loop ended. `subtype === 'success'` means the task completed;
//       any other subtype is an error/limit (max_turns, max_budget,
//       refusal, internal). `result` is the final assistant text on
//       success, null otherwise.
//   - { type: 'error', message }
//       Transport-level failure (e.g. SDK threw). The stream closes
//       after this frame.

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function* streamEmailAgentSdk({ user_message, session_id, signal }) {
  const body = { user_message };
  if (session_id) body.session_id = session_id;

  const res = await fetch(`${API_BASE}/email-agent-sdk/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`email-agent-sdk stream failed (${res.status}): ${text || res.statusText}`);
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
