-- Torna o banco a última linha de defesa dos cálculos de quilometragem e combustível.
-- A regra automática sempre prevalece quando há km rodados e litros abastecidos:
--   km/L = (km final - km inicial) / (litros de gasolina + litros de álcool)

create or replace function public.daily_entries_enforce_calculated_metrics()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_total_liters numeric;
  v_total_fuel numeric;
  v_reference_consumption numeric;
  v_weighted_price numeric;
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

  if new.gas_expense > 0 and new.gasoline_price_per_liter <= 0 then
    raise exception 'Informe o preço por litro da gasolina.';
  end if;
  if new.alcohol_expense > 0 and new.alcohol_price_per_liter <= 0 then
    raise exception 'Informe o preço por litro do álcool.';
  end if;

  new.gasoline_liters := case
    when new.gasoline_price_per_liter > 0 then new.gas_expense / new.gasoline_price_per_liter
    else 0
  end;
  new.alcohol_liters := case
    when new.alcohol_price_per_liter > 0 then new.alcohol_expense / new.alcohol_price_per_liter
    else 0
  end;

  v_total_liters := new.gasoline_liters + new.alcohol_liters;
  v_total_fuel := new.gas_expense + new.alcohol_expense;
  v_reference_consumption := greatest(coalesce(new.fuel_consumption_km_per_liter, 0), 0);
  v_weighted_price := case when v_total_liters > 0 then v_total_fuel / v_total_liters else 0 end;

  if new.km_driven > 0 and v_reference_consumption > 0 then
    new.fuel_consumption_km_per_liter := v_reference_consumption;
    new.fuel_consumed_liters := new.km_driven / v_reference_consumption;
    new.fuel_consumed_cost := new.fuel_consumed_liters * v_weighted_price;
  elsif new.km_driven > 0 and v_total_liters > 0 then
    new.fuel_consumption_km_per_liter := new.km_driven / v_total_liters;
    new.fuel_consumed_liters := v_total_liters;
    new.fuel_consumed_cost := v_total_fuel;
  else
    new.fuel_consumption_km_per_liter := 0;
    new.fuel_consumed_liters := 0;
    new.fuel_consumed_cost := 0;
  end if;

  new.fuel_remaining_liters := 0;
  new.fuel_remaining_value := 0;
  return new;
end;
$function$;

revoke all on function public.daily_entries_enforce_calculated_metrics() from public, anon, authenticated;

drop trigger if exists daily_entries_calculated_metrics_before_write on public.daily_entries;
create trigger daily_entries_calculated_metrics_before_write
before insert or update of
  km_initial,
  km_final,
  km_driven,
  gas_expense,
  alcohol_expense,
  gasoline_price_per_liter,
  alcohol_price_per_liter,
  gasoline_liters,
  alcohol_liters,
  fuel_consumption_km_per_liter,
  fuel_consumed_liters,
  fuel_consumed_cost
on public.daily_entries
for each row execute function public.daily_entries_enforce_calculated_metrics();

-- Recalcula o histórico com a mesma regra do trigger. Não altera receitas,
-- despesas, datas nem proprietários dos lançamentos.
update public.daily_entries
set km_driven = km_final - km_initial;

alter table public.daily_entries
  add constraint daily_entries_gasoline_liters_calculated
  check (
    (gas_expense = 0 and gasoline_liters = 0)
    or (
      gas_expense > 0
      and gasoline_price_per_liter > 0
      and abs(gasoline_liters - gas_expense / gasoline_price_per_liter) <= 0.001
    )
  ) not valid;

alter table public.daily_entries
  add constraint daily_entries_alcohol_liters_calculated
  check (
    (alcohol_expense = 0 and alcohol_liters = 0)
    or (
      alcohol_expense > 0
      and alcohol_price_per_liter > 0
      and abs(alcohol_liters - alcohol_expense / alcohol_price_per_liter) <= 0.001
    )
  ) not valid;

alter table public.daily_entries
  add constraint daily_entries_automatic_consumption_calculated
  check (
    km_driven <= 0
    or gasoline_liters + alcohol_liters <= 0
    or abs(
      fuel_consumption_km_per_liter
      - km_driven / (gasoline_liters + alcohol_liters)
    ) <= 0.01
  ) not valid;

alter table public.daily_entries
  add constraint daily_entries_consumed_fuel_calculated
  check (
    km_driven <= 0
    or gasoline_liters + alcohol_liters <= 0
    or (
      abs(fuel_consumed_liters - (gasoline_liters + alcohol_liters)) <= 0.001
      and abs(fuel_consumed_cost - (gas_expense + alcohol_expense)) <= 0.01
    )
  ) not valid;

alter table public.daily_entries validate constraint daily_entries_gasoline_liters_calculated;
alter table public.daily_entries validate constraint daily_entries_alcohol_liters_calculated;
alter table public.daily_entries validate constraint daily_entries_automatic_consumption_calculated;
alter table public.daily_entries validate constraint daily_entries_consumed_fuel_calculated;

-- As RPCs continuam sendo a única superfície pública de gravação.
revoke all on function public.app_save_entry(uuid, jsonb) from public;
grant execute on function public.app_save_entry(uuid, jsonb) to anon, authenticated;
revoke all on function public.app_update_entry(uuid, uuid, jsonb) from public;
grant execute on function public.app_update_entry(uuid, uuid, jsonb) to anon, authenticated;

-- Endurecimento sem alterar a arquitetura atual de sessão por token: remove
-- concessões implícitas a todos os papéis e preserva somente os papéis usados
-- pelo aplicativo. Funções de trigger não devem ser chamáveis via RPC.
revoke all on function public.app_get_entries(uuid, date, date) from public;
grant execute on function public.app_get_entries(uuid, date, date) to anon, authenticated;
revoke all on function public.app_get_session(uuid) from public;
grant execute on function public.app_get_session(uuid) to anon, authenticated;
revoke all on function public.app_login(text, text) from public;
grant execute on function public.app_login(text, text) to anon, authenticated;
revoke all on function public.app_logout(uuid) from public;
grant execute on function public.app_logout(uuid) to anon, authenticated;
revoke all on function public.app_register(text, text) from public;
grant execute on function public.app_register(text, text) to anon, authenticated;
revoke all on function public.app_register_google(text, uuid) from public;
grant execute on function public.app_register_google(text, uuid) to anon, authenticated;
revoke all on function public.app_log_daily_entry_event() from public, anon, authenticated;
