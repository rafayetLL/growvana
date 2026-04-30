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
  const channel = supabase
    .channel(`webhook:${taskId}`)
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
        if (!row) return;
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
    .subscribe();

  return {
    close() {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Build the `webhook_request` object the backend expects in POST bodies.
 * Returns null when `VITE_WEBHOOK_URL` is set to an empty string — useful
 * for dev sessions where you want to disable webhooks entirely.
 */
export function buildWebhookRequest({ task_id, event_type, data }) {
  const webhook_url = import.meta.env.VITE_WEBHOOK_URL;
  if (!webhook_url) return null;
  return { webhook_url, event_type, task_id, data };
}
