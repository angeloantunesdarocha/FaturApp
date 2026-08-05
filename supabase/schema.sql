-- Tabela de lançamentos diários
create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  user_id text not null default 'default',
  date date not null,
  gross_amount numeric,
  fee_percent numeric,
  net_fare numeric,
  gas_expense numeric default 0 not null,
  alcohol_expense numeric default 0 not null,
  maintenance_expense numeric default 0 not null,
  extra_expenses jsonb default '[]'::jsonb not null,
  unique (user_id, date)
);

-- Índices úteis
create index if not exists idx_daily_entries_date
  on public.daily_entries (date);
create index if not exists idx_daily_entries_user_id
  on public.daily_entries (user_id);

-- Desabilita RLS para uso pessoal (um único usuário fixo 'default')
alter table public.daily_entries disable row level security;

-- Política permissiva (apenas por precaução, caso ative o RLS depois)
-- drop policy if exists "all_access" on public.daily_entries;
-- create policy "all_access" on public.daily_entries
--   for all using (true) with check (true);