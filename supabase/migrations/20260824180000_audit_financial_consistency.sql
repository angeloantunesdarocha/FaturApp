-- Auditoria de consistência financeira.
--
-- Regras canônicas:
--   km_driven = km_final - km_initial
--   litros abastecidos = valor abastecido / preço por litro
--   consumo automático = km_driven / litros abastecidos
--   lucro líquido = receita líquida - combustível comprado - outros gastos
--
-- O custo do combustível efetivamente consumido permanece armazenado em
-- fuel_consumed_cost como métrica operacional, sem substituir a despesa de
-- combustível comprado usada no lucro líquido.

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daily_entries_km_driven_consistent'
      and conrelid = 'public.daily_entries'::regclass
  ) then
    alter table public.daily_entries
      add constraint daily_entries_km_driven_consistent
      check (abs(km_driven - (km_final - km_initial)) <= 0.01);
  end if;
end
$constraints$;

create or replace function public.app_get_month_profit(p_token uuid, p_from date, p_to date)
returns numeric
language sql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select coalesce(sum(
    case
      when jsonb_typeof(coalesce(e.revenue_details, '[]'::jsonb)) = 'array'
       and jsonb_array_length(coalesce(e.revenue_details, '[]'::jsonb)) > 0
      then coalesce((
        select sum(coalesce((item->>'liquido')::numeric, 0))
        from jsonb_array_elements(e.revenue_details) item
      ), 0)
      else coalesce(e.net_fare, coalesce(e.gross_amount, 0) * (1 - coalesce(e.fee_percent, 0) / 100))
    end
    - coalesce(e.gas_expense, 0)
    - coalesce(e.alcohol_expense, 0)
    - coalesce(nullif((
      select sum(coalesce((item->>'value')::numeric, 0))
      from jsonb_array_elements(coalesce(nullif(e.maintenance_details, '[]'::jsonb), e.manutencao_itens, '[]'::jsonb)) item
    ), 0), coalesce(e.maintenance_expense, 0))
    - coalesce((
      select sum(coalesce((item->>'value')::numeric, 0))
      from jsonb_array_elements(coalesce(nullif(e.extra_expenses, '[]'::jsonb), e.extras_itens, '[]'::jsonb)) item
    ), 0)
  ), 0)
  from public.daily_entries e
  where e.user_id = (select s.user_id::text from public.app_sessions s where s.token = p_token and s.expires_at > now())
    and e.date between p_from and p_to;
$function$;

create or replace function public.app_save_entry(p_token uuid, p_entry jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
declare
  uid text;
  entry_id uuid;
  v_initial numeric;
  v_final numeric;
  v_driven numeric;
  v_gas numeric;
  v_alcohol numeric;
  v_gas_price numeric;
  v_alcohol_price numeric;
  v_gas_liters numeric;
  v_alcohol_liters numeric;
  v_total_liters numeric;
  v_total_fuel numeric;
  v_weighted_price numeric;
  v_price_used numeric;
  v_manual_consumption numeric;
  v_consumption numeric;
  v_consumed numeric;
  v_consumed_cost numeric;
begin
  select s.user_id::text into uid
  from public.app_sessions s
  where s.token = p_token and s.expires_at > now();

  if uid is null then raise exception 'Sessão inválida ou expirada.'; end if;

  v_initial := greatest(coalesce((p_entry->>'km_initial')::numeric, 0), 0);
  v_final := greatest(coalesce((p_entry->>'km_final')::numeric, 0), 0);
  if v_final < v_initial then raise exception 'O km final não pode ser menor que o km inicial.'; end if;
  v_driven := v_final - v_initial;

  v_gas := greatest(coalesce((p_entry->>'gas_expense')::numeric, 0), 0);
  v_alcohol := greatest(coalesce((p_entry->>'alcohol_expense')::numeric, 0), 0);
  v_gas_price := greatest(coalesce((p_entry->>'gasoline_price_per_liter')::numeric, 0), 0);
  v_alcohol_price := greatest(coalesce((p_entry->>'alcohol_price_per_liter')::numeric, 0), 0);
  if v_gas > 0 and v_gas_price <= 0 then raise exception 'Informe o preço por litro da gasolina.'; end if;
  if v_alcohol > 0 and v_alcohol_price <= 0 then raise exception 'Informe o preço por litro do álcool.'; end if;

  v_gas_liters := case when v_gas_price > 0 then v_gas / v_gas_price else 0 end;
  v_alcohol_liters := case when v_alcohol_price > 0 then v_alcohol / v_alcohol_price else 0 end;
  v_total_liters := v_gas_liters + v_alcohol_liters;
  v_total_fuel := v_gas + v_alcohol;
  v_weighted_price := case when v_total_liters > 0 then v_total_fuel / v_total_liters else 0 end;
  v_price_used := case
    when v_gas > 0 and v_gas_price > 0 then v_gas_price
    when v_alcohol > 0 and v_alcohol_price > 0 then v_alcohol_price
    else v_weighted_price
  end;
  v_manual_consumption := greatest(coalesce((p_entry->>'fuel_consumption_km_per_liter')::numeric, 0), 0);
  v_consumption := case
    when v_manual_consumption > 0 then v_manual_consumption
    when v_driven > 0 and v_total_liters > 0 then v_driven / v_total_liters
    else 0
  end;
  if v_total_fuel > 0 and v_driven > 0 and v_consumption <= 0 then
    raise exception 'Informe o consumo médio ou os dados necessários para calculá-lo.';
  end if;
  v_consumed := case when v_driven > 0 and v_consumption > 0 then v_driven / v_consumption else 0 end;
  v_consumed_cost := v_consumed * v_price_used;

  insert into public.daily_entries(
    user_id, date, gross_amount, fee_percent, net_fare, revenue_details,
    gas_expense, alcohol_expense, gasoline_liters, alcohol_liters,
    gasoline_price_per_liter, alcohol_price_per_liter,
    km_initial, km_final, km_driven, hours_worked,
    fuel_consumption_km_per_liter, fuel_consumed_liters, fuel_consumed_cost,
    fuel_remaining_liters, fuel_remaining_value,
    maintenance_expense, maintenance_details, extra_expenses
  ) values (
    uid, (p_entry->>'date')::date, (p_entry->>'gross_amount')::numeric,
    least(greatest(coalesce((p_entry->>'fee_percent')::numeric, 0), 0), 100),
    greatest(coalesce((p_entry->>'net_fare')::numeric, 0), 0),
    coalesce(p_entry->'revenue_details', '[]'::jsonb),
    v_gas, v_alcohol, v_gas_liters, v_alcohol_liters,
    v_gas_price, v_alcohol_price, v_initial, v_final, v_driven,
    greatest(coalesce((p_entry->>'hours_worked')::numeric, 0), 0),
    v_consumption, v_consumed, v_consumed_cost, 0, 0,
    greatest(coalesce((p_entry->>'maintenance_expense')::numeric, 0), 0),
    coalesce(p_entry->'maintenance_details', '[]'::jsonb),
    coalesce(p_entry->'extra_expenses', '[]'::jsonb)
  ) returning id into entry_id;

  return jsonb_build_object('id', entry_id, 'km_driven', v_driven);
end;
$function$;

create or replace function public.app_update_entry(p_token uuid, p_entry_id uuid, p_entry jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
declare
  uid text;
  v_initial numeric;
  v_final numeric;
  v_driven numeric;
  v_gas numeric;
  v_alcohol numeric;
  v_gas_price numeric;
  v_alcohol_price numeric;
  v_gas_liters numeric;
  v_alcohol_liters numeric;
  v_total_liters numeric;
  v_total_fuel numeric;
  v_weighted_price numeric;
  v_price_used numeric;
  v_manual_consumption numeric;
  v_consumption numeric;
  v_consumed numeric;
  v_consumed_cost numeric;
begin
  select s.user_id::text into uid
  from public.app_sessions s
  where s.token = p_token and s.expires_at > now();
  if uid is null then raise exception using errcode = 'P0002', message = 'Recurso não encontrado.'; end if;

  v_initial := greatest(coalesce((p_entry->>'km_initial')::numeric, 0), 0);
  v_final := greatest(coalesce((p_entry->>'km_final')::numeric, 0), 0);
  if v_final < v_initial then raise exception 'O km final não pode ser menor que o km inicial.'; end if;
  v_driven := v_final - v_initial;
  v_gas := greatest(coalesce((p_entry->>'gas_expense')::numeric, 0), 0);
  v_alcohol := greatest(coalesce((p_entry->>'alcohol_expense')::numeric, 0), 0);
  v_gas_price := greatest(coalesce((p_entry->>'gasoline_price_per_liter')::numeric, 0), 0);
  v_alcohol_price := greatest(coalesce((p_entry->>'alcohol_price_per_liter')::numeric, 0), 0);
  if v_gas > 0 and v_gas_price <= 0 then raise exception 'Informe o preço por litro da gasolina.'; end if;
  if v_alcohol > 0 and v_alcohol_price <= 0 then raise exception 'Informe o preço por litro do álcool.'; end if;

  v_gas_liters := case when v_gas_price > 0 then v_gas / v_gas_price else 0 end;
  v_alcohol_liters := case when v_alcohol_price > 0 then v_alcohol / v_alcohol_price else 0 end;
  v_total_liters := v_gas_liters + v_alcohol_liters;
  v_total_fuel := v_gas + v_alcohol;
  v_weighted_price := case when v_total_liters > 0 then v_total_fuel / v_total_liters else 0 end;
  v_price_used := case
    when v_gas > 0 and v_gas_price > 0 then v_gas_price
    when v_alcohol > 0 and v_alcohol_price > 0 then v_alcohol_price
    else v_weighted_price
  end;
  v_manual_consumption := greatest(coalesce((p_entry->>'fuel_consumption_km_per_liter')::numeric, 0), 0);
  v_consumption := case
    when v_manual_consumption > 0 then v_manual_consumption
    when v_driven > 0 and v_total_liters > 0 then v_driven / v_total_liters
    else 0
  end;
  if v_total_fuel > 0 and v_driven > 0 and v_consumption <= 0 then
    raise exception 'Informe o consumo médio ou os dados necessários para calculá-lo.';
  end if;
  v_consumed := case when v_driven > 0 and v_consumption > 0 then v_driven / v_consumption else 0 end;
  v_consumed_cost := v_consumed * v_price_used;

  update public.daily_entries set
    date = (p_entry->>'date')::date,
    gross_amount = (p_entry->>'gross_amount')::numeric,
    fee_percent = least(greatest(coalesce((p_entry->>'fee_percent')::numeric, 0), 0), 100),
    net_fare = greatest(coalesce((p_entry->>'net_fare')::numeric, 0), 0),
    revenue_details = coalesce(p_entry->'revenue_details', revenue_details),
    gas_expense = v_gas, alcohol_expense = v_alcohol,
    gasoline_price_per_liter = v_gas_price, alcohol_price_per_liter = v_alcohol_price,
    gasoline_liters = v_gas_liters, alcohol_liters = v_alcohol_liters,
    km_initial = v_initial, km_final = v_final, km_driven = v_driven,
    hours_worked = greatest(coalesce((p_entry->>'hours_worked')::numeric, 0), 0),
    fuel_consumption_km_per_liter = v_consumption,
    fuel_consumed_liters = v_consumed,
    fuel_consumed_cost = v_consumed_cost,
    fuel_remaining_liters = 0, fuel_remaining_value = 0,
    maintenance_expense = greatest(coalesce((p_entry->>'maintenance_expense')::numeric, 0), 0),
    maintenance_details = coalesce(p_entry->'maintenance_details', '[]'::jsonb),
    extra_expenses = coalesce(p_entry->'extra_expenses', '[]'::jsonb)
  where id = p_entry_id and user_id = uid;

  if not found then raise exception using errcode = 'P0002', message = 'Recurso não encontrado.'; end if;
  return jsonb_build_object('success', true, 'id', p_entry_id);
end;
$function$;

revoke all on function public.app_get_month_profit(uuid, date, date) from public;
grant execute on function public.app_get_month_profit(uuid, date, date) to anon, authenticated;
revoke all on function public.app_save_entry(uuid, jsonb) from public;
grant execute on function public.app_save_entry(uuid, jsonb) to anon, authenticated;
revoke all on function public.app_update_entry(uuid, uuid, jsonb) from public;
grant execute on function public.app_update_entry(uuid, uuid, jsonb) to anon, authenticated;
