-- Corrige o schema de produção para que o fechamento diário preserve
-- os detalhes das receitas usadas pelo formulário atual.

alter table public.daily_entries
  add column if not exists revenue_details jsonb default '[]'::jsonb not null;

create index if not exists daily_entries_revenue_details_gin_idx
  on public.daily_entries using gin (revenue_details);

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
begin
  select s.user_id::text into uid
    from public.app_sessions s
   where s.token = p_token
     and s.expires_at > now();

  if uid is null then
    raise exception 'Sessão inválida ou expirada.';
  end if;

  v_initial := greatest(coalesce((p_entry->>'km_initial')::numeric, 0), 0);
  v_final := greatest(coalesce((p_entry->>'km_final')::numeric, 0), 0);

  if v_final < v_initial then
    raise exception 'O km final não pode ser menor que o km inicial.';
  end if;

  v_driven := v_final - v_initial;

  insert into public.daily_entries(
    user_id, date, gross_amount, fee_percent, net_fare, revenue_details,
    gas_expense, alcohol_expense, gasoline_liters, alcohol_liters,
    gasoline_price_per_liter, alcohol_price_per_liter,
    km_initial, km_final, km_driven, hours_worked,
    fuel_consumption_km_per_liter, fuel_consumed_liters, fuel_consumed_cost,
    fuel_remaining_liters, fuel_remaining_value,
    maintenance_expense, maintenance_details, extra_expenses
  )
  values(
    uid,
    (p_entry->>'date')::date,
    (p_entry->>'gross_amount')::numeric,
    (p_entry->>'fee_percent')::numeric,
    (p_entry->>'net_fare')::numeric,
    coalesce(p_entry->'revenue_details', '[]'::jsonb),
    greatest(coalesce((p_entry->>'gas_expense')::numeric, 0), 0),
    greatest(coalesce((p_entry->>'alcohol_expense')::numeric, 0), 0),
    greatest(coalesce((p_entry->>'gasoline_liters')::numeric, 0), 0),
    greatest(coalesce((p_entry->>'alcohol_liters')::numeric, 0), 0),
    greatest(coalesce((p_entry->>'gasoline_price_per_liter')::numeric, 0), 0),
    greatest(coalesce((p_entry->>'alcohol_price_per_liter')::numeric, 0), 0),
    v_initial,
    v_final,
    v_driven,
    greatest(coalesce((p_entry->>'hours_worked')::numeric, 0), 0),
    greatest(coalesce((p_entry->>'fuel_consumption_km_per_liter')::numeric, 0), 0),
    greatest(coalesce((p_entry->>'fuel_consumed_liters')::numeric, 0), 0),
    greatest(coalesce((p_entry->>'fuel_consumed_cost')::numeric, 0), 0),
    greatest(coalesce((p_entry->>'fuel_remaining_liters')::numeric, 0), 0),
    greatest(coalesce((p_entry->>'fuel_remaining_value')::numeric, 0), 0),
    greatest(coalesce((p_entry->>'maintenance_expense')::numeric, 0), 0),
    coalesce(p_entry->'maintenance_details', '[]'::jsonb),
    coalesce(p_entry->'extra_expenses', '[]'::jsonb)
  )
  returning id into entry_id;

  return jsonb_build_object('id', entry_id, 'km_driven', v_driven);
end;
$function$;

revoke all on function public.app_save_entry(uuid, jsonb) from public;
grant execute on function public.app_save_entry(uuid, jsonb) to anon, authenticated;
