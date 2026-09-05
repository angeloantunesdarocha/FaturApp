-- Tabela de lançamentos diários
create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  user_id text not null default 'default',
  date date not null,
  gross_amount numeric,
  fee_percent numeric,
  net_fare numeric,
  revenue_details jsonb default '[]'::jsonb not null,
  gas_expense numeric default 0 not null,
  alcohol_expense numeric default 0 not null,
  gasoline_price_per_liter numeric default 0 not null,
  alcohol_price_per_liter numeric default 0 not null,
  gasoline_liters numeric default 0 not null,
  alcohol_liters numeric default 0 not null,
  km_initial numeric default 0 not null,
  km_final numeric default 0 not null,
  km_driven numeric default 0 not null,
  hours_worked numeric default 0 not null,
  maintenance_expense numeric default 0 not null,
  maintenance_details jsonb default '[]'::jsonb not null,
  extra_expenses jsonb default '[]'::jsonb not null
);

alter table public.daily_entries add column if not exists revenue_details jsonb default '[]'::jsonb not null;
alter table public.daily_entries add column if not exists maintenance_details jsonb default '[]'::jsonb not null;
alter table public.daily_entries add column if not exists gasoline_price_per_liter numeric default 0 not null;
alter table public.daily_entries add column if not exists alcohol_price_per_liter numeric default 0 not null;
alter table public.daily_entries add column if not exists gasoline_liters numeric default 0 not null;
alter table public.daily_entries add column if not exists alcohol_liters numeric default 0 not null;
alter table public.daily_entries add column if not exists fuel_price_per_liter_current numeric default 0 not null;
alter table public.daily_entries add column if not exists isolated_fuel_expense numeric default 0 not null;
alter table public.daily_entries add column if not exists launch_details jsonb default '[]'::jsonb not null;
alter table public.daily_entries add column if not exists reopen_history jsonb default '[]'::jsonb not null;
alter table public.daily_entries add column if not exists km_initial numeric default 0 not null;
alter table public.daily_entries add column if not exists km_final numeric default 0 not null;
alter table public.daily_entries add column if not exists km_driven numeric default 0 not null;
alter table public.daily_entries add column if not exists hours_worked numeric default 0 not null;
create index if not exists idx_daily_entries_date on public.daily_entries (date);
create index if not exists idx_daily_entries_user_id on public.daily_entries (user_id);
create index if not exists daily_entries_user_id_date_created_idx on public.daily_entries(user_id, date, created_at);
create index if not exists daily_entries_revenue_details_gin_idx on public.daily_entries using gin (revenue_details);

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  login text not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz not null default now()
);
create unique index if not exists app_users_login_lower_idx on public.app_users(lower(login));

create table if not exists public.app_sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);
create index if not exists app_sessions_user_id_idx on public.app_sessions(user_id);
create index if not exists app_sessions_expires_at_idx on public.app_sessions(expires_at);

-- As funções abaixo devem ser executadas como SECURITY DEFINER e expostas apenas via RPC.
-- A implementação de autenticação fica no banco para que senhas nunca sejam armazenadas em texto puro.

-- A identidade administrativa deve ser provisionada explicitamente e verificada.
-- Nunca conceder admin por nome de login ou ordem de cadastro.
alter table public.daily_entries enable row level security;
alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;
revoke all on public.daily_entries, public.app_users, public.app_sessions from public, anon, authenticated;
