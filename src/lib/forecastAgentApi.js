// Thin client for the /api/v1/forecast-agent endpoints.
//
// Two POSTs run the conversation; three GETs read a thread back (see
// API Documenttions/Forecast Agent API Documentation V1.md). There is no
// upload endpoint and no thread roster — a thread is reopened by ID.
//
//   POST /api/v1/forecast-agent/init  (JSON)
//     { thread_id, foundation_thread_id }   — both required
//     thread_id pattern: ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$
//     200 → { thread_id, foundation_thread_id }
//     400 → { error: 'ThreadExistsError', message, details } — the thread
//       already exists; the caller treats that as "open it" (GET /history)
//       since the server keeps the whole conversation.
//     422 → FastAPI's own { detail: [...] } envelope (schema violation).
//
//   POST /api/v1/forecast-agent/stream  (JSON → SSE)
//     { thread_id, user_message, attachment_urls? }
//     attachment_urls are http(s) addresses the BACKEND downloads once at
//     turn start (50 MB gate, any MIME) — the frontend never uploads
//     bytes. A URL only needs to be alive at the instant /stream is
//     called; after that the file lives on the thread forever and an
//     identical re-send is a no-op.
//
// Every runtime failure arrives as an `error` FRAME on an HTTP 200
// stream — only a body-schema violation (empty message, bad thread_id)
// returns a non-200 (422 JSON, no stream). Frames are `data: <json>`
// lines discriminated on `type`; heartbeats are `: ping` comment lines
// (skipped by the parse loop). The dialect (2026-09-02, outputs taken OFF
// the stream — the user's call: "we only need to stream the messages, the
// outputs can be sent by get api"):
//
//   - { type: 'text_delta', content }
//       Main-agent text token — append live.
//   - { type: 'text_final', content }
//       Canonical full text of a block; deltas already built the same
//       string, so the screen ignores it.
//   - { type: 'tool_use', id, name, input }
//   - { type: 'tool_result', tool_use_id, content, is_error }
//   - { type: 'done', subtype, thread_id, session_id, result,
//       total_cost_usd, running_total_cost_usd, num_turns }
//       subtype: 'success' | 'error_max_turns' | 'error_max_budget_usd'.
//       Carries NO output list — a turn's files are read back separately
//       with `listForecastOutputs` once the turn is over.
//   - { type: 'error', status, code, message }
//       status is the exception class name — 'ValidationError' (an
//       attachment refusal names the file in `message`),
//       'ThreadBusyError', 'NotFoundError', 'StreamTimeoutError',
//       'AgentError', 'InternalServerError'. Discriminate on `status`;
//       `code` is 'error' for everything except the timeout's 'timeout'.
//       Carries no output list either — a turn that died may still have
//       produced files, read back the same way as a successful turn's.
//
// Thread-level reads (2026-09-02, user's calls: outputs shown in the UI the
// way the other agents' artifacts are, and a previous thread reopenable):
//
//   GET /api/v1/forecast-agent/threads/{thread_id}/history
//     → { thread_id, title, total_cost_usd, messages: [{ id, role, parts }] }
//       parts: { type:'text', text } | { type:'attachment_note', text } |
//              { type:'tool_use', id, name, input, result?: {content, is_error} }
//       Carries no output list — call `listForecastOutputs` separately when
//       reopening a thread.
//
//   GET /api/v1/forecast-agent/threads/{thread_id}/outputs
//     → { thread_id, outputs: [{ file_name, mime_type }] }
//       Every file the agent has produced on the thread, newest first.
//       There is no URL, path, size or modified time on the wire: a file's
//       bytes are fetched (only) from
//       GET /threads/{thread_id}/outputs/{file_name}, so the screen
//       identifies and requests a file by `file_name` alone.
//
//   GET /api/v1/forecast-agent/threads/{thread_id}/outputs/{file_name}
//     → the file's bytes, with the right Content-Type and a
//       Content-Disposition filename. `file_name` must be URL-encoded.
//     This is the ONLY way to fetch a file's bytes — `forecastOutputUrl`
//     builds this address; there is no separate preview route. The backend
//     no longer recalculates a workbook after the turn — the agent
//     calculates it DURING the turn — so a file here is final the moment
//     the turn that wrote it ends.
//
// (GET /threads — the roster — was built and dropped the same day, user's
// call; `listForecastThreads` below is commented out with it. The
// output-preview route was never built / was removed alongside the earlier
// public-URL design — `getForecastOutputPreview` stays commented out below;
// restore only alongside that GET route existing on the backend.)

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const FORECAST_THREAD_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

// Turns a non-OK response into an Error carrying the backend's own
// message. Two envelopes exist: GrowvanaException's {error, message,
// details} and FastAPI validation's {detail: [...]} — `status` carries
// the class name in the first case so callers can branch on it
// (ThreadExistsError → open the existing thread).
async function throwFromResponse(res, label) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body — fall through to statusText */
  }
  const message =
    body?.message ||
    (Array.isArray(body?.detail)
      ? body.detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
      : body?.detail) ||
    res.statusText ||
    'request failed';
  const err = new Error(`${label}: ${message}`);
  err.status = body?.error || null;
  err.httpStatus = res.status;
  throw err;
}

export async function initForecastThread({ thread_id, foundation_thread_id }) {
  const res = await fetch(`${API_BASE}/forecast-agent/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id, foundation_thread_id }),
  });
  if (!res.ok) await throwFromResponse(res, 'forecast-agent init failed');
  return res.json();
}

async function getJson(url, label) {
  const res = await fetch(url);
  if (!res.ok) await throwFromResponse(res, label);
  return res.json();
}

// export function listForecastThreads() {
//   return getJson(`${API_BASE}/forecast-agent/threads`, 'forecast-agent thread list failed');
// }

export function getForecastHistory(thread_id) {
  return getJson(
    `${API_BASE}/forecast-agent/threads/${encodeURIComponent(thread_id)}/history`,
    'forecast-agent history failed',
  );
}

// The per-thread output list — every file the agent has produced, newest
// first, as [{ file_name, mime_type }]. Restored 2026-09-02: outputs no
// longer ride the `done`/`error` frames or `GET /history`, so this is the
// only way to learn what a thread's files are.
export function listForecastOutputs(thread_id) {
  return getJson(
    `${API_BASE}/forecast-agent/threads/${encodeURIComponent(thread_id)}/outputs`,
    'forecast-agent output list failed',
  );
}

// Reversed 2026-09-02 (again): outputs are served BY FILE NAME off the
// backend, not off a permanent cloud URL — this is the one place a file's
// bytes can be fetched from.
export function forecastOutputUrl(thread_id, file_name) {
  return `${API_BASE}/forecast-agent/threads/${encodeURIComponent(thread_id)}/outputs/${encodeURIComponent(file_name)}`;
}

// PARKED — there is no server-rendered preview route; spreadsheets are
// rendered client-side (SheetJS) off the bytes from forecastOutputUrl.
// export function getForecastOutputPreview(thread_id, file_name) {
//   return getJson(
//     `${API_BASE}/forecast-agent/threads/${encodeURIComponent(thread_id)}/output-preview/${encodeURIComponent(file_name)}`,
//     'forecast-agent preview failed',
//   );
// }

export async function* streamForecastTurn({
  thread_id,
  user_message,
  attachment_urls,
  signal,
}) {
  const res = await fetch(`${API_BASE}/forecast-agent/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thread_id,
      user_message,
      attachment_urls: attachment_urls || [],
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    await throwFromResponse(res, 'forecast-agent stream failed');
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
