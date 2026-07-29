// Webhook bus — Supabase Realtime subscription that replaces the old
// local Bun relay (webhook-relay/).
//
// End-to-end:
//   FastAPI node → POST {VITE_WEBHOOK_URL} (X-API-KEY) →
//   Edge Function `webhook_receiver` → INSERT webhook_events row →
//   Supabase Realtime broadcasts INSERT → this channel → onEvent(...)
//
// Each delivered `event` is reshaped back into the original camelCase
// `WebhookResponse` envelope, so existing call sites that read
// `evt.eventType` / `evt.data` / `evt.stage` keep working unchanged:
//   { eventType, taskId, status, stage, status_code, success_message,
//     error_message, data, completion_percentage, completed }

import { supabase } from './supabase';

/**
 * Subscribe to every webhook event for `taskId`.
 *
 * Usage:
 *   const sub = subscribeProgress(threadId, (event) => { ... });
 *   // ...later
 *   sub.close();
 */
export function subscribeProgress(taskId, onEvent) {
  // Local-dev fallback: when the Supabase project is unreachable, set
  // VITE_WEBHOOK_RELAY_BASE (e.g. http://localhost:3100) to route webhooks
  // through the in-repo Bun relay (webhook-relay/) over SSE instead of
  // Supabase Realtime. Blank it out to go back to Supabase.
  const relayBase = import.meta.env.VITE_WEBHOOK_RELAY_BASE;
  if (relayBase) return subscribeViaRelay(relayBase.replace(/\/$/, ''), taskId, onEvent);

  const channelName = `webhook:${taskId}`;
  // [webhookBus:diag] Temporary diagnostic logging — open devtools, run one turn,
  // and read the `[webhookBus]` lines to see (a) whether the channel connects and
  // (b) whether each event arrives. Safe to delete once the pipeline is confirmed.
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'webhook_events',
        filter: `task_id=eq.${taskId}`,
      },
      (payload) => {
        const row = payload.new;
        if (!row) {
          // Realtime replaces the row with an error when the record exceeds its
          // per-message cap (~1 MB) — e.g. a base64 image. This is where a
          // too-large `meta_ad.creative.image` silently disappears.
          console.warn('[webhookBus] event with empty payload.new (too large? dropped?)', channelName, payload?.errors);
          return;
        }
        console.debug('[webhookBus] event', channelName, {
          stage: row.stage,
          status: row.status,
          message: row.success_message,
          dataBytes: row.data ? JSON.stringify(row.data).length : 0,
        });
        onEvent({
          eventType: row.event_type,
          taskId: row.task_id,
          status: row.status,
          stage: row.stage,
          status_code: row.status_code,
          success_message: row.success_message,
          error_message: row.error_message,
          data: row.data,
          completion_percentage: row.completion_percentage,
          completed: row.completed,
        });
      },
    )
    .subscribe((status, err) => {
      // SUBSCRIBED = channel live; CHANNEL_ERROR / TIMED_OUT = nothing will arrive.
      const level = status === 'SUBSCRIBED' ? 'log' : 'warn';
      console[level]('[webhookBus] channel', channelName, 'status:', status, err || '');
    });

  return {
    close() {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to the in-repo Bun relay (webhook-relay/) over SSE.
 *
 * The relay forwards the RAW `WebhookResponse` (already camelCase), so events
 * pass straight to `onEvent` — no snake_case→camelCase reshape (that is only
 * for the Supabase row shape).
 */
function subscribeViaRelay(relayBase, taskId, onEvent) {
  const url = `${relayBase}/events/${encodeURIComponent(taskId)}`;
  const es = new EventSource(url);
  es.onopen = () => console.log('[webhookBus] relay SSE open', url);
  es.onmessage = (e) => {
    let evt;
    try {
      evt = JSON.parse(e.data);
    } catch {
      return; // keepalive / non-JSON frame
    }
    console.debug('[webhookBus] relay event', {
      stage: evt?.stage,
      message: evt?.success_message,
    });
    onEvent(evt);
  };
  es.onerror = (err) =>
    console.warn(`[webhookBus] relay SSE error — is the relay running at ${relayBase}?`, err);

  return {
    close() {
      es.close();
    },
  };
}

/**
 * Build the `webhook_request` object the backend expects in POST bodies.
 * Prefers the local Bun relay when `VITE_WEBHOOK_RELAY_BASE` is set (→ POST to
 * `<base>/receiver`); otherwise uses `VITE_WEBHOOK_URL`. Returns null when
 * neither is set — cleanly disabling webhooks for a dev session.
 */
export function buildWebhookRequest({ task_id, event_type, data }) {
  const relayBase = import.meta.env.VITE_WEBHOOK_RELAY_BASE;
  const webhook_url = relayBase
    ? `${relayBase.replace(/\/$/, '')}/receiver`
    : import.meta.env.VITE_WEBHOOK_URL;
  if (!webhook_url) return null;
  return { webhook_url, event_type, task_id, data };
}
