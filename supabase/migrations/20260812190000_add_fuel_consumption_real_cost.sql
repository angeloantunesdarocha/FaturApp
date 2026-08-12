-- Métricas avançadas de consumo de combustível.
alter table public.daily_entries
  add column if not exists fuel_consumption_km_per_liter numeric default 0 not null,
  add column if not exists fuel_consumed_liters numeric default 0 not null,
  add column if not exists fuel_consumed_cost numeric default 0 not null,
  add column if not exists fuel_remaining_liters numeric default 0 not null,
  add column if not exists fuel_remaining_value numeric default 0 not null;

-- Compatibilidade com lançamentos antigos: valores antigos continuam válidos como 0.
alter table public.daily_entries
  add constraint daily_entries_fuel_consumption_nonnegative check (fuel_consumption_km_per_liter >= 0),
  add constraint daily_entries_fuel_consumed_liters_nonnegative check (fuel_consumed_liters >= 0),
  add constraint daily_entries_fuel_consumed_cost_nonnegative check (fuel_consumed_cost >= 0),
  add constraint daily_entries_fuel_remaining_liters_nonnegative check (fuel_remaining_liters >= 0),
  add constraint daily_entries_fuel_remaining_value_nonnegative check (fuel_remaining_value >= 0);

create or replace function public.app_save_entry(p_token uuid, p_entry jsonb)
returns jsonb language plpgsql security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
declare uid text; entry_id uuid; v_initial numeric; v_final numeric; v_driven numeric;
begin
  select s.user_id::text into uid from public.app_sessions s where s.token=p_token and s.expires_at>now();
  if uid is null then raise exception 'Sessão inválida ou expirada.'; end if;
  v_initial:=greatest(coalesce((p_entry->>'km_initial')::numeric,0),0);
  v_final:=greatest(coalesce((p_entry->>'km_final')::numeric,0),0);
  if v_final<v_initial then raise exception 'O km final não pode ser menor que o km inicial.'; end if;
  v_driven:=v_final-v_initial;
  insert into public.daily_entries(
    user_id,date,gross_amount,fee_percent,net_fare,gas_expense,alcohol_expense,gasoline_liters,alcohol_liters,
    gasoline_price_per_liter,alcohol_price_per_liter,km_initial,km_final,km_driven,hours_worked,
    fuel_consumption_km_per_liter,fuel_consumed_liters,fuel_consumed_cost,fuel_remaining_liters,fuel_remaining_value,
    maintenance_expense,maintenance_details,extra_expenses
  ) values(
    uid,(p_entry->>'date')::date,(p_entry->>'gross_amount')::numeric,(p_entry->>'fee_percent')::numeric,(p_entry->>'net_fare')::numeric,
    coalesce((p_entry->>'gas_expense')::numeric,0),coalesce((p_entry->>'alcohol_expense')::numeric,0),
    greatest(coalesce((p_entry->>'gasoline_liters')::numeric,0),0),greatest(coalesce((p_entry->>'alcohol_liters')::numeric,0),0),
    greatest(coalesce((p_entry->>'gasoline_price_per_liter')::numeric,0),0),greatest(coalesce((p_entry->>'alcohol_price_per_liter')::numeric,0),0),
    v_initial,v_final,v_driven,greatest(coalesce((p_entry->>'hours_worked')::numeric,0),0),
    greatest(coalesce((p_entry->>'fuel_consumption_km_per_liter')::numeric,0),0),
    greatest(coalesce((p_entry->>'fuel_consumed_liters')::numeric,0),0),
    greatest(coalesce((p_entry->>'fuel_consumed_cost')::numeric,0),0),
    greatest(coalesce((p_entry->>'fuel_remaining_liters')::numeric,0),0),
    greatest(coalesce((p_entry->>'fuel_remaining_value')::numeric,0),0),
    coalesce((p_entry->>'maintenance_expense')::numeric,0),coalesce(p_entry->'maintenance_details','[]'::jsonb),coalesce(p_entry->'extra_expenses','[]'::jsonb)
  ) returning id into entry_id;
  return jsonb_build_object('id',entry_id,'km_driven',v_driven);
end;
$function$;

create or replace function public.app_update_entry(p_token uuid,p_entry_id uuid,p_entry jsonb)
returns jsonb language plpgsql security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
declare uid text; manutencao jsonb; extras jsonb;
begin
  select s.user_id::text into uid from public.app_sessions s where s.token=p_token and s.expires_at>now();
  if uid is null then raise exception 'Sessão inválida ou expirada.'; end if;
  manutencao:=coalesce(p_entry->'maintenance_details',p_entry->'manutencao_itens','[]'::jsonb);
  extras:=coalesce(p_entry->'extra_expenses',p_entry->'extras_itens','[]'::jsonb);
  update public.daily_entries set
    date=(p_entry->>'date')::date,gross_amount=(p_entry->>'gross_amount')::numeric,fee_percent=(p_entry->>'fee_percent')::numeric,net_fare=(p_entry->>'net_fare')::numeric,
    gas_expense=greatest(coalesce((p_entry->>'gas_expense')::numeric,0),0),alcohol_expense=greatest(coalesce((p_entry->>'alcohol_expense')::numeric,0),0),
    gasoline_price_per_liter=greatest(coalesce((p_entry->>'gasoline_price_per_liter')::numeric,0),0),alcohol_price_per_liter=greatest(coalesce((p_entry->>'alcohol_price_per_liter')::numeric,0),0),
    gasoline_liters=greatest(coalesce((p_entry->>'gasoline_liters')::numeric,0),0),alcohol_liters=greatest(coalesce((p_entry->>'alcohol_liters')::numeric,0),0),
    km_initial=greatest(coalesce((p_entry->>'km_initial')::numeric,0),0),km_final=greatest(coalesce((p_entry->>'km_final')::numeric,0),0),km_driven=greatest(coalesce((p_entry->>'km_driven')::numeric,0),0),
    hours_worked=greatest(coalesce((p_entry->>'hours_worked')::numeric,0),0),
    fuel_consumption_km_per_liter=greatest(coalesce((p_entry->>'fuel_consumption_km_per_liter')::numeric,0),0),
    fuel_consumed_liters=greatest(coalesce((p_entry->>'fuel_consumed_liters')::numeric,0),0),fuel_consumed_cost=greatest(coalesce((p_entry->>'fuel_consumed_cost')::numeric,0),0),
    fuel_remaining_liters=greatest(coalesce((p_entry->>'fuel_remaining_liters')::numeric,0),0),fuel_remaining_value=greatest(coalesce((p_entry->>'fuel_remaining_value')::numeric,0),0),
    maintenance_expense=greatest(coalesce((p_entry->>'maintenance_expense')::numeric,0),0),maintenance_details=manutencao,extra_expenses=extras,manutencao_itens=manutencao,extras_itens=extras
  where id=p_entry_id and user_id=uid;
  if not found then raise exception 'Lançamento não encontrado ou não pertence ao usuário.'; end if;
  return jsonb_build_object('success',true,'id',p_entry_id);
end;
$function$;
