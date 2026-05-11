// Thin SSE client for the /api/v1/email-agent-sdk endpoint.
//
// Wire format:
//   POST /api/v1/email-agent-sdk/stream  (multipart/form-data)
//     Form parts:
//       - user_message: string  (required)
//       - session_id:   string  (optional — resume an existing session)
//       - images:       File[]  (zero or more image attachments scoped
//           to THIS turn only; backend persists each to disk and feeds
//           the bytes into the agent's prompt as image content blocks)
//
// The backend wraps the Claude Agent SDK's `query()` loop and emits one
// `data: <json>` SSE frame per event:
//
//   - { type: 'user_image', name, url, mime_type }
//       Fired once per uploaded image at the very start of the turn,
//       BEFORE the agent stream opens. The frontend renders these as
//       thumbnails next to the user's message bubble. URLs are
//       relative to the API origin.
//   - { type: 'session', session_id }
//       Fired once at session start. Persist and pass back as
//       `session_id` on subsequent turns to resume.
//   - { type: 'text_delta', content }
//       Assistant text token chunk. With `include_partial_messages=True`
//       these stream live (multiple per turn) — append.
//   - { type: 'text_final', content }
//       Canonical full text for a TextBlock at end of turn. Frontend
//       can ignore (we already rendered) or use to reconcile drops.
//   - { type: 'tool_use', id, name, input }
//   - { type: 'tool_result', tool_use_id, content, is_error }
//   - { type: 'email_file', kind, filename, rel_path, path, url }
//       Agent wrote/edited a phase artifact under `email_outputs/`.
//       `kind` is 'plan' | 'content' | 'html' so the frontend can pick
//       the right preview surface (JSON viewer for plan/content,
//       iframe for html). `url` is relative to the API origin.
//   - { type: 'done', subtype, result, session_id, total_cost_usd, num_turns }
//   - { type: 'error', message }

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function* streamEmailAgentSdk({
  user_message,
  session_id,
  images,
  signal,
}) {
  const form = new FormData();
  form.append('user_message', user_message);
  if (session_id) form.append('session_id', session_id);
  // Attach each File under the same field name; FastAPI assembles them
  // into `list[UploadFile]` server-side. `images` is optional — empty
  // or undefined means a plain text turn (string-prompt path).
  for (const file of images || []) {
    form.append('images', file, file.name);
  }

  const res = await fetch(`${API_BASE}/email-agent-sdk/stream`, {
    method: 'POST',
    // No Content-Type header — the browser sets the multipart boundary.
    body: form,
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
