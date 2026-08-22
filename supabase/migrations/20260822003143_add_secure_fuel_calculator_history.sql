create table if not exists public.fuel_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  modo text not null check (modo in ('consumo', 'monitoramento')),
  valor_abastecido numeric(10,2) not null check (valor_abastecido > 0),
  preco_litro numeric(8,3) not null check (preco_litro > 0),
  litros_comprados numeric(10,3) not null check (litros_comprados > 0),
  km_rodados numeric(10,2) not null check (km_rodados > 0),
  eficiencia_calculada numeric(8,3) not null check (eficiencia_calculada > 0),
  custo_por_km numeric(10,4) not null check (custo_por_km > 0),
  litros_consumidos numeric(10,3),
  custo_trecho numeric(10,2),
  litros_restantes numeric(10,3),
  valor_restante numeric(10,2),
  autonomia_restante numeric(10,2),
  data_registro timestamptz not null default now(),
  veiculo_nome text
);

create index if not exists fuel_records_user_date_idx
  on public.fuel_records (user_id, data_registro desc);

alter table public.fuel_records enable row level security;

drop policy if exists fuel_records_owner_access on public.fuel_records;
create policy fuel_records_owner_access
  on public.fuel_records
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.fuel_records to authenticated;
revoke all on public.fuel_records from anon;

create or replace function public.app_save_fuel_record(
  p_token uuid,
  p_record jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid;
  v_mode text;
  v_amount numeric;
  v_price numeric;
  v_distance numeric;
  v_efficiency numeric;
  v_liters numeric;
  v_consumed numeric;
  v_remaining numeric;
  v_id uuid;
begin
  select s.user_id into v_user_id
  from public.app_sessions s
  where s.token = p_token and s.expires_at > now();

  if v_user_id is null then
    raise exception 'Sessão inválida ou expirada.';
  end if;

  v_mode := coalesce(p_record->>'modo', '');
  v_amount := coalesce((p_record->>'valor_abastecido')::numeric, 0);
  v_price := coalesce((p_record->>'preco_litro')::numeric, 0);
  v_distance := coalesce((p_record->>'km_rodados')::numeric, 0);

  if v_mode not in ('consumo', 'monitoramento')
    or v_amount <= 0 or v_price <= 0 or v_distance <= 0 then
    raise exception 'Informe valores positivos para calcular o combustível.';
  end if;

  v_liters := v_amount / v_price;
  v_efficiency := case
    when v_mode = 'consumo' then v_distance / v_liters
    else coalesce((p_record->>'eficiencia_veiculo')::numeric, 0)
  end;

  if v_efficiency <= 0 then
    raise exception 'Informe o consumo médio do veículo em km/L.';
  end if;

  v_consumed := v_distance / v_efficiency;
  v_remaining := greatest(v_liters - v_consumed, 0);

  insert into public.fuel_records (
    user_id, modo, valor_abastecido, preco_litro, litros_comprados,
    km_rodados, eficiencia_calculada, custo_por_km, litros_consumidos,
    custo_trecho, litros_restantes, valor_restante, autonomia_restante,
    veiculo_nome
  ) values (
    v_user_id, v_mode, round(v_amount, 2), round(v_price, 3),
    round(v_liters, 3), round(v_distance, 2), round(v_efficiency, 3),
    round(v_price / v_efficiency, 4), round(v_consumed, 3),
    round(v_consumed * v_price, 2), round(v_remaining, 3),
    round(greatest(v_amount - (v_consumed * v_price), 0), 2), round(v_remaining * v_efficiency, 2),
    nullif(left(trim(coalesce(p_record->>'veiculo_nome', '')), 100), '')
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'eficiencia_calculada', round(v_efficiency, 3));
end;
$$;

create or replace function public.app_get_fuel_records(
  p_token uuid,
  p_limit integer default 10
)
returns setof public.fuel_records
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid;
begin
  select s.user_id into v_user_id
  from public.app_sessions s
  where s.token = p_token and s.expires_at > now();

  if v_user_id is null then
    raise exception 'Sessão inválida ou expirada.';
  end if;

  return query
  select r.*
  from public.fuel_records r
  where r.user_id = v_user_id
  order by r.data_registro desc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
end;
$$;

revoke all on function public.app_save_fuel_record(uuid, jsonb) from public;
revoke all on function public.app_get_fuel_records(uuid, integer) from public;
grant execute on function public.app_save_fuel_record(uuid, jsonb) to anon, authenticated;
grant execute on function public.app_get_fuel_records(uuid, integer) to anon, authenticated;
