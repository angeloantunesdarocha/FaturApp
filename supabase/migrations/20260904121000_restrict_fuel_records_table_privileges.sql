begin;

-- RLS does not protect table-wide TRUNCATE. Keep row-level DML available and
-- remove privileges that are not required by the application.
revoke truncate, trigger, references on table public.fuel_records
  from authenticated;

commit;
