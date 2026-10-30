// Thin client for the ASIN Health Checker — our TEST screen for it. The real frontend
// is built elsewhere and only calls `/daily` and `/weekly`.
//
// The daily and weekly have no thread and no stream: every call is one request and one
// JSON answer, and the backend stores nothing. The chat (below) has both.
//
//   POST /api/v1/asin-health/daily    { account_ids? }   (every company when left out)
//     → { date, accounts: [{ account_id, alerts, content, errors? }] }
//       alerts   [{ asin, rules: [{ rule_id (A1..A10), name (the spec's), severity (high | medium) }],
//                  alert_message, tags: [{ label, value, bad }], check_first }]
//                one per ASIN with an alert, its rules most severe first and one
//                message covering them all; the most severe ASIN first. Tags are the
//                model's notable figures from all the ASIN's data (empty, and
//                check_first null, when its call failed)
//       content  [{ asin, cdq: { score (null when a check is unscored),
//                  dimensions: [{ dimension, weight, points,
//                  sub_attributes: [{ sub_attribute, weight, points }] }] } }]
//                every ASIN, lowest first
//       errors   only when a model call failed for that company
//
//   POST /api/v1/asin-health/weekly   { account_ids? }   like the daily
//     The raw data's last 14 days (this week against last) and our stored dailies of the
//     week (the data API's /dailies). Per ASIN only, like the daily.
//     → { date, accounts: [{ account_id, asins: [{ asin, severity, daily_check_trend,
//         reasons, days: [{ date, severity }], summary }], errors? }] }
//       asins: every ASIN the daily alerted on this week or over a weekly threshold, the
//       most severe first; quiet ones are left out. severity, reasons and days (7, each
//       the day's worst alert or null) are code's; daily_check_trend (improving |
//       worsening | steady) and summary the model's (null when its call failed).
//     Until 2026-10-30: { account_id, act_on: [{ asin, reasons, note }] }.
//
//   Until 2026-10-30 the weekly was sent our 7 daily answers instead
//   (`{ daily_results: [...] }`) and answered `{ account_id, message, asins: [{ asin,
//   direction, note }] }`; commented below and in the backend.
//
// The chat — the one part with a thread, one company per thread:
//
//   POST /api/v1/asin-health-chat/init     { thread_id, account_id } → { thread_id, account_id }
//   POST /api/v1/asin-health-chat/stream   { thread_id, user_message } → SSE frames:
//     { type: 'ai_message_token', content }   many, in order
//     { type: 'done', thread_id, ai_message } | { type: 'error', message }
//   Until 2026-10-30 it also sent { type: 'data_query', query } per data read (commented).
//
// The test screen's own data: the raw data, from the DUMMY data API
// (`POST /api/v1/asin-health-data`) — what the data team will serve; it names the
// companies and ASINs and fills the ASIN data tab. The 7 mock daily answers it sent to
// the weekly (`src/data/asinHealthMockDailies.json`) are no longer read.

import { jsonHeaders } from './apiKey.js';

// Already ends in `/api/v1`, like every other client's base.
const API_BASE = import.meta.env.VITE_API_BASE_URL;

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

async function postJson(path, body, label, signal) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body || {}),
    signal,
  });
  if (!res.ok) await throwFromResponse(res, label);
  return res.json();
}

/** Every company's raw data from the dummy data API: { date, accounts: [{ account,
 *  snapshots, listings }] }. */
export function getAsinHealthData(signal) {
  const today = new Date().toISOString().slice(0, 10);
  return postJson('/asin-health-data', { account_ids: [], date: today }, 'Could not load the data', signal);
}

/** `run` is 'daily' | 'weekly'; `accountIds` the companies to run, every one when empty.
 *  Takes a minute or more. (Until 2026-10-30 it always ran every company.) */
export async function runAsinHealth(run, accountIds, signal) {
  const body = accountIds?.length ? { account_ids: accountIds } : {};
  if (run === 'weekly') return postJson('/asin-health/weekly', body, 'The weekly failed', signal);
  return postJson('/asin-health/daily', body, 'The daily check failed', signal);
}

/** Open a chat thread on one company. */
export function initAsinChat(threadId, accountId, signal) {
  return postJson(
    '/asin-health-chat/init',
    { thread_id: threadId, account_id: accountId },
    'Could not start the chat',
    signal,
  );
}

/** One question; yields the stream's frames as they arrive. */
export async function* streamAsinChat(threadId, userMessage, signal) {
  const res = await fetch(`${API_BASE}/asin-health-chat/stream`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ thread_id: threadId, user_message: userMessage }),
    signal,
  });
  if (!res.ok || !res.body) await throwFromResponse(res, 'The chat failed');

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

// The weekly on our 7 daily answers (until 2026-10-30): the screen sent its mock dailies.
// let mockDailies = null;
//
// /** The 7 mock daily answers, loaded once and kept out of the main bundle. */
// export function loadMockDailies() {
//   mockDailies ||= import('../data/asinHealthMockDailies.json').then((m) => m.default);
//   return mockDailies;
// }
//
// export async function runAsinHealth(run, signal) {
//   if (run === 'weekly') {
//     const dailies = await loadMockDailies();
//     return postJson('/asin-health/weekly', { daily_results: dailies }, 'The weekly review failed', signal);
//   }
//   return postJson('/asin-health/daily', {}, 'The daily check failed', signal);
// }

// Until 2026-10-29 the screen also listed the companies and loaded a free preview from
// the backend; both routes are commented out there.
// export async function getAsinHealthAccounts(signal) {
//   const res = await fetch(`${API_BASE}/asin-health/accounts`, { headers: apiKeyHeader(), signal });
//   if (!res.ok) await throwFromResponse(res, 'Could not load companies');
//   return res.json();
// }
//
// export function previewAsinHealth(run, accountIds, signal) {
//   return postJson(`/asin-health/${run}/preview`, { account_ids: accountIds }, `Could not load the ${run} data`, signal);
// }
