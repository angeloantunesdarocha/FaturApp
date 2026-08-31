-- Persistência detalhada para a fonte única do balanço diário.
-- Preparada para homologação na branch test/resumo-cards. Não aplicar no
-- ambiente de produção antes da aprovação funcional do preview.

alter table public.daily_entries
  add column if not exists isolated_fuel_expense numeric default 0 not null,
  add column if not exists launch_details jsonb default '[]'::jsonb not null,
  add column if not exists reopen_history jsonb default '[]'::jsonb not null;

alter table public.daily_entries
  drop constraint if exists daily_entries_isolated_fuel_expense_nonnegative;
alter table public.daily_entries
  add constraint daily_entries_isolated_fuel_expense_nonnegative
  check (isolated_fuel_expense >= 0);

alter table public.daily_entries
  drop constraint if exists daily_entries_launch_details_array;
alter table public.daily_entries
  add constraint daily_entries_launch_details_array
  check (jsonb_typeof(launch_details) = 'array');

alter table public.daily_entries
  drop constraint if exists daily_entries_reopen_history_array;
alter table public.daily_entries
  add constraint daily_entries_reopen_history_array
  check (jsonb_typeof(reopen_history) = 'array');

create or replace function public.enforce_daily_entry_financial_metrics()
returns trigger
language plpgsql
security invoker
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_total_fuel numeric;
  v_total_liters numeric;
  v_weighted_price numeric;
  v_price_used numeric;
begin
  new.km_initial := greatest(coalesce(new.km_initial, 0), 0);
  new.km_final := greatest(coalesce(new.km_final, 0), 0);
  if new.km_final < new.km_initial then
    raise exception 'O km final não pode ser menor que o km inicial.';
  end if;
  new.km_driven := new.km_final - new.km_initial;
  new.gas_expense := greatest(coalesce(new.gas_expense, 0), 0);
  new.alcohol_expense := greatest(coalesce(new.alcohol_expense, 0), 0);
  new.gasoline_price_per_liter := greatest(coalesce(new.gasoline_price_per_liter, 0), 0);
  new.alcohol_price_per_liter := greatest(coalesce(new.alcohol_price_per_liter, 0), 0);
  new.gasoline_liters := case when new.gasoline_price_per_liter > 0 then new.gas_expense / new.gasoline_price_per_liter else 0 end;
  new.alcohol_liters := case when new.alcohol_price_per_liter > 0 then new.alcohol_expense / new.alcohol_price_per_liter else 0 end;
  v_total_fuel := new.gas_expense + new.alcohol_expense;
  v_total_liters := new.gasoline_liters + new.alcohol_liters;
  v_weighted_price := case when v_total_liters > 0 then v_total_fuel / v_total_liters else 0 end;
  new.fuel_price_per_liter_current := greatest(coalesce(new.fuel_price_per_liter_current, 0), 0);
  v_price_used := case when new.fuel_price_per_liter_current > 0 then new.fuel_price_per_liter_current else v_weighted_price end;
  new.fuel_consumption_km_per_liter := greatest(coalesce(new.fuel_consumption_km_per_liter, 0), 0);
  new.fuel_consumed_liters := case when new.km_driven > 0 and new.fuel_consumption_km_per_liter > 0 then new.km_driven / new.fuel_consumption_km_per_liter else 0 end;
  new.fuel_consumed_cost := new.fuel_consumed_liters * v_price_used;
  new.isolated_fuel_expense := greatest(coalesce(new.isolated_fuel_expense, 0), 0);
  new.fuel_remaining_liters := greatest(coalesce(new.fuel_remaining_liters, 0), 0);
  new.fuel_remaining_value := greatest(coalesce(new.fuel_remaining_value, 0), 0);
  new.launch_details := coalesce(new.launch_details, '[]'::jsonb);
  new.reopen_history := coalesce(new.reopen_history, '[]'::jsonb);
  return new;
end;
$function$;

create or replace function public.app_save_entry(p_token uuid, p_entry jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid text;
  v_result jsonb;
begin
  select s.user_id::text into v_uid from public.app_sessions s where s.token = p_token and s.expires_at > now();
  if v_uid is null then raise exception 'Sessão inválida ou expirada.'; end if;
  v_result := public.app_save_entry_without_current_fuel_price(p_token, p_entry);
  update public.daily_entries
  set fuel_price_per_liter_current = greatest(coalesce((p_entry->>'fuel_price_per_liter_current')::numeric, 0), 0),
      isolated_fuel_expense = greatest(coalesce((p_entry->>'isolated_fuel_expense')::numeric, 0), 0),
      fuel_remaining_liters = greatest(coalesce((p_entry->>'fuel_remaining_liters')::numeric, 0), 0),
      fuel_remaining_value = greatest(coalesce((p_entry->>'fuel_remaining_value')::numeric, 0), 0),
      launch_details = case when jsonb_typeof(p_entry->'launch_details') = 'array' then p_entry->'launch_details' else '[]'::jsonb end,
      reopen_history = case when jsonb_typeof(p_entry->'reopen_history') = 'array' then p_entry->'reopen_history' else '[]'::jsonb end
  where id = (v_result->>'id')::uuid and user_id = v_uid;
  return v_result;
end;
$function$;

create or replace function public.app_update_entry(p_token uuid, p_entry_id uuid, p_entry jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid text;
  v_result jsonb;
begin
  select s.user_id::text into v_uid from public.app_sessions s where s.token = p_token and s.expires_at > now();
  if v_uid is null then raise exception using errcode = 'P0002', message = 'Recurso não encontrado.'; end if;
  v_result := public.app_update_entry_without_current_fuel_price(p_token, p_entry_id, p_entry);
  update public.daily_entries
  set fuel_price_per_liter_current = greatest(coalesce((p_entry->>'fuel_price_per_liter_current')::numeric, 0), 0),
      isolated_fuel_expense = greatest(coalesce((p_entry->>'isolated_fuel_expense')::numeric, 0), 0),
      fuel_remaining_liters = greatest(coalesce((p_entry->>'fuel_remaining_liters')::numeric, 0), 0),
      fuel_remaining_value = greatest(coalesce((p_entry->>'fuel_remaining_value')::numeric, 0), 0),
      launch_details = case when jsonb_typeof(p_entry->'launch_details') = 'array' then p_entry->'launch_details' else '[]'::jsonb end,
      reopen_history = case when jsonb_typeof(p_entry->'reopen_history') = 'array' then p_entry->'reopen_history' else '[]'::jsonb end
  where id = p_entry_id and user_id = v_uid;
  if not found then raise exception using errcode = 'P0002', message = 'Recurso não encontrado.'; end if;
  return v_result;
end;
$function$;

revoke all on function public.app_save_entry(uuid, jsonb) from public;
grant execute on function public.app_save_entry(uuid, jsonb) to anon, authenticated;
revoke all on function public.app_update_entry(uuid, uuid, jsonb) from public;
grant execute on function public.app_update_entry(uuid, uuid, jsonb) to anon, authenticated;
