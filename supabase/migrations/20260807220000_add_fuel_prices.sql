alter table public.daily_entries
  add column if not exists gasoline_price_per_liter numeric default 0 not null,
  add column if not exists alcohol_price_per_liter numeric default 0 not null;

alter table public.daily_entries
  add constraint daily_entries_gasoline_price_nonnegative check (gasoline_price_per_liter >= 0),
  add constraint daily_entries_alcohol_price_nonnegative check (alcohol_price_per_liter >= 0);

create or replace function public.app_save_entry(p_token uuid, p_entry jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
declare
  uid text;
  entry_id uuid;
begin
  select s.user_id::text into uid
  from public.app_sessions s
  where s.token=p_token and s.expires_at>now();

  if uid is null then raise exception 'Sessão inválida ou expirada.'; end if;

  insert into public.daily_entries(
    user_id,date,gross_amount,fee_percent,net_fare,
    gas_expense,alcohol_expense,gasoline_price_per_liter,alcohol_price_per_liter,
    gasoline_liters,alcohol_liters,km_initial,km_final,km_driven,
    maintenance_expense,maintenance_details,extra_expenses
  )
  values(
    uid,
    (p_entry->>'date')::date,
    (p_entry->>'gross_amount')::numeric,
    (p_entry->>'fee_percent')::numeric,
    (p_entry->>'net_fare')::numeric,
    greatest(coalesce((p_entry->>'gas_expense')::numeric,0),0),
    greatest(coalesce((p_entry->>'alcohol_expense')::numeric,0),0),
    greatest(coalesce((p_entry->>'gasoline_price_per_liter')::numeric,0),0),
    greatest(coalesce((p_entry->>'alcohol_price_per_liter')::numeric,0),0),
    greatest(coalesce((p_entry->>'gasoline_liters')::numeric,0),0),
    greatest(coalesce((p_entry->>'alcohol_liters')::numeric,0),0),
    greatest(coalesce((p_entry->>'km_initial')::numeric,0),0),
    greatest(coalesce((p_entry->>'km_final')::numeric,0),0),
    greatest(coalesce((p_entry->>'km_driven')::numeric,0),0),
    greatest(coalesce((p_entry->>'maintenance_expense')::numeric,0),0),
    coalesce(p_entry->'maintenance_details','[]'::jsonb),
    coalesce(p_entry->'extra_expenses','[]'::jsonb)
  )
  returning id into entry_id;

  return jsonb_build_object('id',entry_id);
end;
$function$;
