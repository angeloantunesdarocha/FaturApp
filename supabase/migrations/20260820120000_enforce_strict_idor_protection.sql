-- Defesa em profundidade contra IDOR/BOLA.
-- O app usa sessões próprias, portanto as tabelas permanecem inacessíveis
-- diretamente para anon/authenticated e toda autorização ocorre nas RPCs.

alter table public.daily_entries enable row level security;
alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;

revoke all on table public.daily_entries from anon, authenticated;
revoke all on table public.app_users from anon, authenticated;
revoke all on table public.app_sessions from anon, authenticated;

do $permissions$
begin
  if to_regclass('public.contributions') is not null then
    execute 'alter table public.contributions enable row level security';
    execute 'revoke all on table public.contributions from anon, authenticated';
  end if;
end
$permissions$;

create or replace function public.app_update_entry(
  p_token uuid,
  p_entry_id uuid,
  p_entry jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $$
declare
  uid text;
  manutencao jsonb;
  extras jsonb;
begin
  select s.user_id::text into uid
    from public.app_sessions s
   where s.token = p_token
     and s.expires_at > now();

  if uid is null then
    raise exception using errcode = 'P0002', message = 'Recurso não encontrado.';
  end if;

  manutencao := coalesce(p_entry->'maintenance_details', p_entry->'manutencao_itens', '[]'::jsonb);
  extras := coalesce(p_entry->'extra_expenses', p_entry->'extras_itens', '[]'::jsonb);

  update public.daily_entries set
    date = (p_entry->>'date')::date,
    gross_amount = (p_entry->>'gross_amount')::numeric,
    fee_percent = (p_entry->>'fee_percent')::numeric,
    net_fare = (p_entry->>'net_fare')::numeric,
    revenue_details = coalesce(p_entry->'revenue_details', revenue_details),
    gas_expense = greatest(coalesce((p_entry->>'gas_expense')::numeric, 0), 0),
    alcohol_expense = greatest(coalesce((p_entry->>'alcohol_expense')::numeric, 0), 0),
    gasoline_price_per_liter = greatest(coalesce((p_entry->>'gasoline_price_per_liter')::numeric, 0), 0),
    alcohol_price_per_liter = greatest(coalesce((p_entry->>'alcohol_price_per_liter')::numeric, 0), 0),
    gasoline_liters = greatest(coalesce((p_entry->>'gasoline_liters')::numeric, 0), 0),
    alcohol_liters = greatest(coalesce((p_entry->>'alcohol_liters')::numeric, 0), 0),
    km_initial = greatest(coalesce((p_entry->>'km_initial')::numeric, 0), 0),
    km_final = greatest(coalesce((p_entry->>'km_final')::numeric, 0), 0),
    km_driven = greatest(coalesce((p_entry->>'km_driven')::numeric, 0), 0),
    hours_worked = greatest(coalesce((p_entry->>'hours_worked')::numeric, 0), 0),
    fuel_consumption_km_per_liter = greatest(coalesce((p_entry->>'fuel_consumption_km_per_liter')::numeric, 0), 0),
    fuel_consumed_liters = greatest(coalesce((p_entry->>'fuel_consumed_liters')::numeric, 0), 0),
    fuel_consumed_cost = greatest(coalesce((p_entry->>'fuel_consumed_cost')::numeric, 0), 0),
    fuel_remaining_liters = greatest(coalesce((p_entry->>'fuel_remaining_liters')::numeric, 0), 0),
    fuel_remaining_value = greatest(coalesce((p_entry->>'fuel_remaining_value')::numeric, 0), 0),
    maintenance_expense = greatest(coalesce((p_entry->>'maintenance_expense')::numeric, 0), 0),
    maintenance_details = manutencao,
    extra_expenses = extras
   where id = p_entry_id
     and user_id = uid;

  if not found then
    -- Mesma resposta para ID inexistente e ID pertencente a outro usuário.
    raise exception using errcode = 'P0002', message = 'Recurso não encontrado.';
  end if;

  return jsonb_build_object('success', true, 'id', p_entry_id);
end;
$$;

revoke all on function public.app_update_entry(uuid, uuid, jsonb) from public;
grant execute on function public.app_update_entry(uuid, uuid, jsonb) to anon, authenticated;
