-- Alinha a persistência com o motor financeiro encadeado.
-- Esta migração foi preparada para a branch de teste e não deve ser aplicada
-- em produção antes da validação funcional do fluxo de lançamentos.

alter table public.daily_entries
  add column if not exists fuel_price_per_liter_current numeric default 0 not null;

alter table public.daily_entries
  drop constraint if exists daily_entries_current_fuel_price_nonnegative;
alter table public.daily_entries
  add constraint daily_entries_current_fuel_price_nonnegative
  check (fuel_price_per_liter_current >= 0);

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
  new.gasoline_liters := case
    when new.gasoline_price_per_liter > 0 then new.gas_expense / new.gasoline_price_per_liter
    else 0
  end;
  new.alcohol_liters := case
    when new.alcohol_price_per_liter > 0 then new.alcohol_expense / new.alcohol_price_per_liter
    else 0
  end;

  v_total_fuel := new.gas_expense + new.alcohol_expense;
  v_total_liters := new.gasoline_liters + new.alcohol_liters;
  v_weighted_price := case when v_total_liters > 0 then v_total_fuel / v_total_liters else 0 end;
  new.fuel_price_per_liter_current := greatest(coalesce(new.fuel_price_per_liter_current, 0), 0);
  v_price_used := case
    when new.fuel_price_per_liter_current > 0 then new.fuel_price_per_liter_current
    else v_weighted_price
  end;

  new.fuel_consumption_km_per_liter := greatest(coalesce(new.fuel_consumption_km_per_liter, 0), 0);
  new.fuel_consumed_liters := case
    when new.km_driven > 0 and new.fuel_consumption_km_per_liter > 0
      then new.km_driven / new.fuel_consumption_km_per_liter
    else 0
  end;
  new.fuel_consumed_cost := new.fuel_consumed_liters * v_price_used;
  new.fuel_remaining_liters := 0;
  new.fuel_remaining_value := 0;

  return new;
end;
$function$;

drop trigger if exists daily_entries_financial_metrics on public.daily_entries;
create trigger daily_entries_financial_metrics
before insert or update of
  km_initial,
  km_final,
  km_driven,
  gas_expense,
  alcohol_expense,
  gasoline_price_per_liter,
  alcohol_price_per_liter,
  fuel_price_per_liter_current,
  gasoline_liters,
  alcohol_liters,
  fuel_consumption_km_per_liter,
  fuel_consumed_liters,
  fuel_consumed_cost
on public.daily_entries
for each row
execute function public.enforce_daily_entry_financial_metrics();

revoke all on function public.enforce_daily_entry_financial_metrics() from public;

-- Mantém as RPCs existentes e acrescenta a persistência do preço vigente sem
-- duplicar as regras de autenticação/ownership já auditadas nelas.
alter function public.app_save_entry(uuid, jsonb)
  rename to app_save_entry_without_current_fuel_price;
alter function public.app_update_entry(uuid, uuid, jsonb)
  rename to app_update_entry_without_current_fuel_price;

revoke all on function public.app_save_entry_without_current_fuel_price(uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.app_update_entry_without_current_fuel_price(uuid, uuid, jsonb)
  from public, anon, authenticated;

create function public.app_save_entry(p_token uuid, p_entry jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid text;
  v_result jsonb;
  v_price numeric;
begin
  select s.user_id::text into v_uid
  from public.app_sessions s
  where s.token = p_token and s.expires_at > now();
  if v_uid is null then raise exception 'Sessão inválida ou expirada.'; end if;

  v_result := public.app_save_entry_without_current_fuel_price(p_token, p_entry);
  v_price := greatest(coalesce((p_entry->>'fuel_price_per_liter_current')::numeric, 0), 0);

  update public.daily_entries
  set fuel_price_per_liter_current = v_price
  where id = (v_result->>'id')::uuid and user_id = v_uid;

  return v_result;
end;
$function$;

create function public.app_update_entry(p_token uuid, p_entry_id uuid, p_entry jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid text;
  v_result jsonb;
  v_price numeric;
begin
  select s.user_id::text into v_uid
  from public.app_sessions s
  where s.token = p_token and s.expires_at > now();
  if v_uid is null then
    raise exception using errcode = 'P0002', message = 'Recurso não encontrado.';
  end if;

  v_result := public.app_update_entry_without_current_fuel_price(p_token, p_entry_id, p_entry);
  v_price := greatest(coalesce((p_entry->>'fuel_price_per_liter_current')::numeric, 0), 0);

  update public.daily_entries
  set fuel_price_per_liter_current = v_price
  where id = p_entry_id and user_id = v_uid;
  if not found then
    raise exception using errcode = 'P0002', message = 'Recurso não encontrado.';
  end if;

  return v_result;
end;
$function$;

revoke all on function public.app_save_entry(uuid, jsonb) from public;
grant execute on function public.app_save_entry(uuid, jsonb) to anon, authenticated;
revoke all on function public.app_update_entry(uuid, uuid, jsonb) from public;
grant execute on function public.app_update_entry(uuid, uuid, jsonb) to anon, authenticated;
