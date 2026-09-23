// The API key every request to the Growvana backend carries. One value, matching
// the backend's `AI_API_KEY` — it guards every `/api/v1` route, applied per router
// in `api/v1/router.py`, so a call without it comes back 401 before reaching any
// handler.
//
// WHAT THIS IS AND IS NOT. The key ships inside the browser bundle, so anyone who
// opens devtools or reads the served JS can lift it. It keeps out strangers and
// scripts that do not have this app — which is the whole point, since these
// endpoints spend real money per call — but it is NOT user-level authorization and
// must never become the only thing standing between one visitor and another
// visitor's data. Per-user auth is a separate layer on top of this one.
//
// The webhook receiver is the deliberate exception: `/api/v1/webhook/test` takes
// `WEBHOOK_API_KEY` on the same header, because it is the receiving end of the
// backend's own outbound POSTs. The frontend never calls it.

export const API_KEY_HEADER = 'X-API-KEY';

// Named to mirror the backend's `AI_API_KEY`, which holds the identical value. The
// `VITE_` prefix is NOT decoration and cannot be dropped: Vite only exposes prefixed
// variables to client code, so a plain `AI_API_KEY` in .env reads as `undefined` here
// — silently, with no build error and no warning. That filter is a feature (it stops
// server secrets leaking into the bundle by accident), so the two names differ by a
// prefix on purpose rather than by oversight.
const API_KEY = import.meta.env.VITE_AI_API_KEY;

if (!API_KEY) {
  // Loud, once, at module load. Without it every backend call 401s and the app
  // looks broken for a reason nothing on screen explains.
  console.error(
    `[growvana] VITE_AI_API_KEY is not set — every backend call will fail with 401. ` +
      `Set it in .env to the same value as the backend's AI_API_KEY.`
  );
}

/**
 * The key header alone.
 *
 * For multipart bodies ONLY, where the browser must set its own `Content-Type`:
 * that header carries the generated boundary, and any value we set would replace
 * it and break the upload.
 */
export function apiKeyHeader() {
  return API_KEY ? { [API_KEY_HEADER]: API_KEY } : {};
}

/**
 * The key header plus a JSON content type — the shape every JSON POST uses.
 * `extra` is merged last so a caller can still override.
 */
export function jsonHeaders(extra) {
  return { 'Content-Type': 'application/json', ...apiKeyHeader(), ...extra };
}
