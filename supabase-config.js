/* Cold Logs browser client configuration.
   Keep this as the publishable/anon key only. NEVER put a service_role key here. */
(() => {
  const SUPABASE_URL = "https://ousyndkafoqocaahymhh.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xamCGicmmxPHNGCISPQ__w_gzuOqDqD";

  if (!window.supabase) {
    console.error("Supabase JS did not load.");
    window.coldLogsSupabase = null;
    return;
  }

  window.coldLogsSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
})();
