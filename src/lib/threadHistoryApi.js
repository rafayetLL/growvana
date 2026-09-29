// Thin client for the /api/v1/threads endpoints — every agent's past threads.
//
// READ ONLY. Nothing here creates, changes or deletes a thread; these five GETs read
// back what the agents already wrote, so calling any of them is always safe and can
// be repeated. A thread is still STARTED through its own agent's /init and still
// CONTINUED through its own agent's /stream — this only answers "what threads are
// there" and "what was on this one".
//
//   GET /api/v1/threads/{agent}?limit=50
//     agent: 'foundation' | 'email' | 'meta-ad' | 'pdp'
//     200 → [{ thread_id, title, blueprint, updated_at }]
//           Newest activity first. An agent with no threads returns [] — an empty
//           list is not an error, it just has not been used yet.
//
//           `title` is what the thread is about in the user's own terms, and it is
//           NULL on a thread that never got far enough to have one (an init that
//           failed part way). Show the id, or a placeholder, rather than an
//           empty row.
//
//           `blueprint` is the tag: 'foundation' (brand context was generated on a
//           Foundation thread, whose id this thread still carries), 'pdf' (it was
//           uploaded as a Blueprint PDF), or 'none' (this thread runs without brand
//           context, which every entry offering the choice allows).
//
//           ON A FOUNDATION THREAD IT MEANS SOMETHING ELSE, because that agent
//           produces Blueprints rather than consuming one: 'foundation' means the
//           thread has accepted deliverables and so has a Blueprint other agents can
//           be pointed at, and 'none' means it is still being built.
//
//   GET /api/v1/threads/pdp/{thread_id}
//   GET /api/v1/threads/meta-ad/{thread_id}
//   GET /api/v1/threads/email/{thread_id}
//   GET /api/v1/threads/foundation/{thread_id}
//     200 → the thread, whole. 404 → no such thread (never opened, or wrong id).
//
//     THE ARTIFACT KEYS ARE THE `done` FRAME'S KEYS, deliberately — `audit`,
//     `strategy`, `scout`, `content`, `image_sets` on PDP; `diagnosis`,
//     `competitor_lens`, `strategy`, `creative` on Meta Ad; `email_plan`, `content`,
//     `html` on Email. So a reopened thread goes through the SAME reducer the screen
//     already runs on a turn's last frame, rather than a second code path.
//
//     WHAT NULL MEANS IS THE ONE DIFFERENCE. On `done`, null means "this specialist
//     did not run this turn, keep what you have". Here there is nothing to keep, so
//     null means "this thread has none of that". Never merge a reopen into existing
//     state — replace.
//
//     `messages` is the conversation as the user saw it: a model's reply stripped
//     back to the message it actually showed, never its routing tags or working
//     notes. Roles are 'user', 'assistant' and 'summary' — and `summary` is NOT a
//     speaker. It is the note compaction left where a long thread's earliest turns
//     used to be; those turns are deleted from the thread and cannot be recovered,
//     so render it as a divider rather than as something somebody said.
//
// A Meta Ad thread's `creative` carries its generated images as base64, exactly as
// the `done` frame does — a generated picture exists nowhere else. That makes a
// reopen of a thread with a full creative draft a genuinely large response (~10 MB
// measured), so reopen on demand rather than prefetching every thread in the list.

import { apiKeyHeader } from './apiKey';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// The agent slugs the routes take. `meta-ad` is hyphenated because it is a URL
// segment; everywhere else in this app the same agent is `meta_ad`, so the two are
// mapped here rather than at each call site.
export const THREAD_AGENTS = {
  foundation: 'foundation',
  email_agent: 'email',
  meta_ad_agent: 'meta-ad',
  pdp_agent: 'pdp',
};

export const BLUEPRINT_LABELS = {
  foundation: 'Foundation',
  pdf: 'Blueprint PDF',
  none: 'No blueprint',
};

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

async function getJson(url, label, signal) {
  const res = await fetch(url, { headers: apiKeyHeader(), signal });
  if (!res.ok) await throwFromResponse(res, label);
  return res.json();
}

/**
 * Every thread this agent has, newest activity first.
 *
 * @param {string} agent One of THREAD_AGENTS' values ('pdp', 'meta-ad', …).
 * @param {string} [blueprint] Return only threads carrying this tag.
 *   **FILTER HERE, NEVER IN THE CALLER.** The server applies it before `limit`;
 *   fetching a page and filtering it in JS gives the tagged threads AMONG the
 *   newest N, not the newest N tagged threads — so anything past the cut-off
 *   becomes invisible no matter how far you scroll. That is a real bug this had:
 *   38 Blueprints existed and the picker could only ever show 28 of them.
 * @returns {Promise<Array<{thread_id: string, title: ?string, blueprint: string, updated_at: ?string}>>}
 */
export function listThreads(agent, { limit = 50, blueprint, signal } = {}) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (blueprint) query.set('blueprint', blueprint);
  return getJson(
    `${API_BASE}/threads/${agent}?${query}`,
    `thread list failed (${agent})`,
    signal,
  );
}

/**
 * One thread, whole — its conversation and every artifact on it.
 *
 * Throws with `httpStatus === 404` when the thread does not exist, which is how a
 * caller tells "this id is stale, forget it" from "the request failed, try again".
 */
export function getThread(agent, threadId, { signal } = {}) {
  return getJson(
    `${API_BASE}/threads/${agent}/${encodeURIComponent(threadId)}`,
    `thread read failed (${agent})`,
    signal,
  );
}

// ---------------------------------------------------------------------------
// Which thread each agent had open last — the half that makes a REFRESH survive.
//
// The server answers what threads exist and what is on them; it cannot know which
// one this browser was looking at, so that one fact lives here. It is a per-agent
// id and nothing else: the thread's contents are always re-read from the server, so
// what is stored can never go stale in a way that shows the user old work.
//
// Wrapped in try/catch because storage throws rather than returning null in a
// private window and wherever site data is blocked. Every failure is silent and
// leaves the app on its normal "no thread open" path.
// ---------------------------------------------------------------------------

const LAST_THREAD_KEY = 'growvana.lastThread';

function readLastThreads() {
  try {
    return JSON.parse(localStorage.getItem(LAST_THREAD_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function rememberThread(agent, threadId) {
  if (!agent || !threadId) return;
  try {
    localStorage.setItem(
      LAST_THREAD_KEY,
      JSON.stringify({ ...readLastThreads(), [agent]: threadId }),
    );
  } catch {
    /* storage unavailable — the thread simply will not reopen on refresh */
  }
}

export function recallThread(agent) {
  return readLastThreads()[agent] || null;
}

export function forgetThread(agent) {
  try {
    const all = readLastThreads();
    delete all[agent];
    localStorage.setItem(LAST_THREAD_KEY, JSON.stringify(all));
  } catch {
    /* nothing to clean up if storage is unavailable */
  }
}

// ---------------------------------------------------------------------------
// Which FLOW was open — the other half of surviving a refresh.
//
// Remembering the thread is not enough on its own. After a reload the app starts on
// the agent chooser, so no agent screen is mounted and nothing is there to reopen
// anything. This is what puts the user back in the flow they were in; the screen
// that then mounts reopens its own thread from the id above.
//
// It holds no work, only where the user was: the stage, the view, the project thread
// and the name shown in the sidebar. `projectName` is stored rather than re-fetched
// because it is a label — fetching a whole thread to render one heading would make
// every reload slower to buy nothing.
// ---------------------------------------------------------------------------

const SESSION_KEY = 'growvana.session';

export function rememberSession(session) {
  try {
    if (!session) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable — the app simply starts on the chooser next time */
  }
}

export function recallSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
