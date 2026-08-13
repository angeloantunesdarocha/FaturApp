-- Hardening de autenticação, isolamento de dados e preservação das métricas avançadas.
-- Aplicar após todas as migrações existentes.

alter table public.daily_entries enable row level security;
alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;

revoke all on table public.daily_entries from anon, authenticated;
revoke all on table public.app_users from anon, authenticated;
revoke all on table public.app_sessions from anon, authenticated;

create or replace function public.app_google_auth(
  p_email text,
  p_google_id text
)
returns table(session_token uuid, role text, login text)
language plpgsql
security definer
set search_path to 'public', 'auth', 'extensions', 'pg_catalog'
as $$
declare
  v_user_id uuid;
  v_login text;
  v_role text;
  v_token uuid;
begin
  if auth.uid() is null or auth.uid()::text <> p_google_id then
    raise exception 'Identidade Google não validada pelo Supabase.';
  end if;

  select u.id, u.login, u.role into v_user_id, v_login, v_role
    from public.app_users u
   where u.google_id = p_google_id
   limit 1;

  if v_user_id is null then
    select u.id, u.login, u.role into v_user_id, v_login, v_role
      from public.app_users u
     where lower(u.email) = lower(p_email)
       and u.google_id is null
     limit 1;
  end if;

  if v_user_id is not null then
    update public.app_users
       set google_id = p_google_id, email = coalesce(email, p_email)
     where id = v_user_id;
  else
    v_login := split_part(p_email, '@', 1);
    v_role := 'user';
    insert into public.app_users (login, password_hash, role, google_id, email)
    values (v_login, '', v_role, p_google_id, p_email)
    returning id into v_user_id;
  end if;

  insert into public.app_sessions (user_id) values (v_user_id) returning token into v_token;
  return query select v_token, v_role, v_login;
end;
$$;

revoke all on function public.app_google_auth(text, text) from public, anon;
grant execute on function public.app_google_auth(text, text) to authenticated;

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
   where s.token = p_token and s.expires_at > now();

  if uid is null then raise exception 'Sessão inválida ou expirada.'; end if;

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
   where id = p_entry_id and user_id = uid;

  if not found then raise exception 'Lançamento não encontrado ou não pertence ao usuário.'; end if;
  return jsonb_build_object('success', true, 'id', p_entry_id);
end;
$$;
