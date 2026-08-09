-- Idempotent itemized expense migration for daily_entries.
alter table public.daily_entries
  add column if not exists manutencao_itens jsonb not null default '[]'::jsonb;

alter table public.daily_entries
  add column if not exists extras_itens jsonb not null default '[]'::jsonb;

-- Backfill the new canonical columns from the legacy JSONB columns.
update public.daily_entries
set manutencao_itens = maintenance_details
where (manutencao_itens = '[]'::jsonb or manutencao_itens is null)
  and maintenance_details is not null
  and maintenance_details <> '[]'::jsonb;

update public.daily_entries
set extras_itens = extra_expenses
where (extras_itens = '[]'::jsonb or extras_itens is null)
  and extra_expenses is not null
  and extra_expenses <> '[]'::jsonb;

create or replace function public.app_save_entry(p_token uuid, p_entry jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
declare
  uid text;
  entry_id uuid;
  manutencao jsonb;
  extras jsonb;
begin
  select s.user_id::text into uid
  from public.app_sessions s
  where s.token=p_token and s.expires_at>now();
  if uid is null then raise exception 'Sessão inválida ou expirada.'; end if;

  manutencao := coalesce(p_entry->'manutencao_itens', p_entry->'maintenance_details', '[]'::jsonb);
  extras := coalesce(p_entry->'extras_itens', p_entry->'extra_expenses', '[]'::jsonb);

  insert into public.daily_entries(
    user_id,date,gross_amount,fee_percent,net_fare,gas_expense,alcohol_expense,
    gasoline_price_per_liter,alcohol_price_per_liter,gasoline_liters,alcohol_liters,
    km_initial,km_final,km_driven,hours_worked,maintenance_expense,
    maintenance_details,extra_expenses,manutencao_itens,extras_itens
  )
  values(
    uid,(p_entry->>'date')::date,(p_entry->>'gross_amount')::numeric,
    (p_entry->>'fee_percent')::numeric,(p_entry->>'net_fare')::numeric,
    greatest(coalesce((p_entry->>'gas_expense')::numeric,0),0),
    greatest(coalesce((p_entry->>'alcohol_expense')::numeric,0),0),
    greatest(coalesce((p_entry->>'gasoline_price_per_liter')::numeric,0),0),
    greatest(coalesce((p_entry->>'alcohol_price_per_liter')::numeric,0),0),
    greatest(coalesce((p_entry->>'gasoline_liters')::numeric,0),0),
    greatest(coalesce((p_entry->>'alcohol_liters')::numeric,0),0),
    greatest(coalesce((p_entry->>'km_initial')::numeric,0),0),
    greatest(coalesce((p_entry->>'km_final')::numeric,0),0),
    greatest(coalesce((p_entry->>'km_driven')::numeric,0),0),
    greatest(coalesce((p_entry->>'hours_worked')::numeric,0),0),
    greatest(coalesce((p_entry->>'maintenance_expense')::numeric,0),0),
    manutencao,extras,manutencao,extras
  )
  returning id into entry_id;
  return jsonb_build_object('id',entry_id);
end;
$function$;

create or replace function public.app_get_entries(p_token uuid, p_from date, p_to date)
returns setof public.daily_entries
language sql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select e.*
  from public.daily_entries e
  where e.user_id=(select s.user_id::text from public.app_sessions s where s.token=p_token and s.expires_at>now())
    and e.date between p_from and p_to
  order by e.date asc, e.created_at asc, e.id asc;
$function$;
