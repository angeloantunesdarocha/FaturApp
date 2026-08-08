alter table public.app_users add column if not exists recovery_email text;
create index if not exists app_users_recovery_email_lower_idx on public.app_users(lower(recovery_email)) where recovery_email is not null;

create or replace function public.app_register_with_email(p_login text, p_password text, p_email text)
returns table(user_id uuid, login text, role text, session_token uuid)
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  normalized_email text := lower(trim(p_email));
  result_row record;
begin
  if normalized_email = '' or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Informe um e-mail válido para recuperação.';
  end if;
  select * into result_row from public.app_register(trim(p_login), p_password);
  update public.app_users set recovery_email = normalized_email where id = result_row.user_id;
  return query select result_row.user_id, result_row.login, result_row.role, result_row.session_token;
end;
$$;

create or replace function public.app_get_session_with_email(p_token uuid)
returns table(user_id uuid, login text, role text, recovery_email text)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select u.id, u.login, u.role, u.recovery_email
  from public.app_sessions s
  join public.app_users u on u.id = s.user_id
  where s.token = p_token and s.expires_at > now();
$$;

create or replace function public.app_update_recovery_email(p_token uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  uid uuid;
  normalized_email text := lower(trim(p_email));
begin
  if normalized_email = '' or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Informe um e-mail válido.';
  end if;
  select s.user_id into uid from public.app_sessions s where s.token = p_token and s.expires_at > now();
  if uid is null then raise exception 'Sessão inválida ou expirada.'; end if;
  update public.app_users set recovery_email = normalized_email where id = uid;
  return true;
end;
$$;

revoke execute on function public.app_register_with_email(text,text,text) from public;
grant execute on function public.app_register_with_email(text,text,text) to anon, authenticated;
revoke execute on function public.app_get_session_with_email(uuid) from public;
grant execute on function public.app_get_session_with_email(uuid) to anon, authenticated;
revoke execute on function public.app_update_recovery_email(uuid,text) from public;
grant execute on function public.app_update_recovery_email(uuid,text) to anon, authenticated;
