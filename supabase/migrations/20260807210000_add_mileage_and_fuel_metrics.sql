alter table public.daily_entries
  add column if not exists gasoline_liters numeric default 0 not null,
  add column if not exists alcohol_liters numeric default 0 not null,
  add column if not exists km_initial numeric default 0 not null,
  add column if not exists km_final numeric default 0 not null,
  add column if not exists km_driven numeric default 0 not null;

alter table public.daily_entries
  add constraint daily_entries_km_initial_nonnegative check (km_initial >= 0),
  add constraint daily_entries_km_final_nonnegative check (km_final >= 0),
  add constraint daily_entries_km_driven_nonnegative check (km_driven >= 0),
  add constraint daily_entries_gasoline_liters_nonnegative check (gasoline_liters >= 0),
  add constraint daily_entries_alcohol_liters_nonnegative check (alcohol_liters >= 0),
  add constraint daily_entries_km_range_valid check (km_final >= km_initial);

create or replace function public.app_save_entry(p_token uuid, p_entry jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
declare
  uid text;
  entry_id uuid;
  v_km_initial numeric;
  v_km_final numeric;
  v_km_driven numeric;
begin
  select s.user_id::text into uid
  from public.app_sessions s
  where s.token=p_token and s.expires_at>now();

  if uid is null then raise exception 'Sessão inválida ou expirada.'; end if;

  v_km_initial := greatest(coalesce((p_entry->>'km_initial')::numeric,0),0);
  v_km_final := greatest(coalesce((p_entry->>'km_final')::numeric,0),0);
  if v_km_final < v_km_initial then raise exception 'O km final não pode ser menor que o km inicial.'; end if;
  v_km_driven := v_km_final - v_km_initial;

  insert into public.daily_entries(
    user_id,date,gross_amount,fee_percent,net_fare,
    gas_expense,alcohol_expense,gasoline_liters,alcohol_liters,
    km_initial,km_final,km_driven,
    maintenance_expense,maintenance_details,extra_expenses
  )
  values(
    uid,
    (p_entry->>'date')::date,
    (p_entry->>'gross_amount')::numeric,
    (p_entry->>'fee_percent')::numeric,
    (p_entry->>'net_fare')::numeric,
    coalesce((p_entry->>'gas_expense')::numeric,0),
    coalesce((p_entry->>'alcohol_expense')::numeric,0),
    greatest(coalesce((p_entry->>'gasoline_liters')::numeric,0),0),
    greatest(coalesce((p_entry->>'alcohol_liters')::numeric,0),0),
    v_km_initial,
    v_km_final,
    v_km_driven,
    coalesce((p_entry->>'maintenance_expense')::numeric,0),
    coalesce(p_entry->'maintenance_details','[]'::jsonb),
    coalesce(p_entry->'extra_expenses','[]'::jsonb)
  )
  returning id into entry_id;

  return jsonb_build_object('id',entry_id,'km_driven',v_km_driven);
end;
$function$;
