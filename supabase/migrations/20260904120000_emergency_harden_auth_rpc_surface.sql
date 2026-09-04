begin;

-- Legacy Google registration bypassed Supabase Auth identity verification.
-- The application uses app_google_auth(text, text), which validates auth.uid().
revoke all on function public.app_register_google(text, uuid)
  from public, anon, authenticated;

-- Trigger functions are invoked by PostgreSQL triggers and must not be exposed
-- as callable Data API RPCs.
revoke all on function public.app_log_daily_entry_event()
  from public, anon, authenticated;

revoke all on function public.enforce_daily_entry_financial_metrics()
  from public, anon, authenticated;

commit;
