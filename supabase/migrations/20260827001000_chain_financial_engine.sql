-- Alinha a persistência com o motor financeiro encadeado.
-- Esta migração foi preparada para a branch de teste e não deve ser aplicada
-- em produção antes da validação funcional do fluxo de lançamentos.

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

  new.fuel_consumption_km_per_liter := greatest(coalesce(new.fuel_consumption_km_per_liter, 0), 0);
  new.fuel_consumed_liters := case
    when new.km_driven > 0 and new.fuel_consumption_km_per_liter > 0
      then new.km_driven / new.fuel_consumption_km_per_liter
    else 0
  end;
  new.fuel_consumed_cost := new.fuel_consumed_liters * v_weighted_price;
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
  gasoline_liters,
  alcohol_liters,
  fuel_consumption_km_per_liter,
  fuel_consumed_liters,
  fuel_consumed_cost
on public.daily_entries
for each row
execute function public.enforce_daily_entry_financial_metrics();

revoke all on function public.enforce_daily_entry_financial_metrics() from public;
