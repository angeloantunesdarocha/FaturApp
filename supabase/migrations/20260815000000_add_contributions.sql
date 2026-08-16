create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_subscription_id text unique,
  external_reference text not null unique,
  payer_email text not null,
  amount numeric(10,2) not null check (amount >= 3 and amount <= 500),
  currency text not null default 'BRL',
  provider_status text not null default 'pending',
  status text not null default 'pending' check (status in ('pending','active','past_due','paused','canceled','failed')),
  payment_method text,
  started_at timestamptz,
  next_payment_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contributions_user_id_created_at_idx
  on public.contributions(user_id, created_at desc);

create index if not exists contributions_provider_subscription_id_idx
  on public.contributions(provider_subscription_id);

alter table public.contributions enable row level security;

revoke all on public.contributions from anon, authenticated;