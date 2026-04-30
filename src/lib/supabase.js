import { createClient } from '@supabase/supabase-js';

// Single shared client used by every Realtime subscription. The publishable
// key is safe to ship in the bundle — `webhook_events` has RLS enabled with
// a SELECT-only policy, and inserts only happen from the
// `webhook_receiver` Edge Function with the service_role key.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
