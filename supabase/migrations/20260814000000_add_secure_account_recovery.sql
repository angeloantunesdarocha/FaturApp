-- Recuperação segura de acesso para contas do FaturApp.
-- A entrega do e-mail é feita pelo Supabase Auth; a tabela própria mantém
-- a sessão e a compatibilidade com o login legado do aplicativo.

create extension if not exists pgcrypto;

alter table public.app_users
  add column if not exists email text;

create index if not exists app_users_email_recovery_idx
  on public.app_users (lower(email))
  where email is not null;

create or replace function public.app_set_recovery_email(
  p_token uuid,
  p_email text
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $$
declare
  v_user_id uuid;
begin
  if p_email is null or lower(trim(p_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'E-mail inválido.';
  end if;

  select user_id into v_user_id
    from public.app_sessions
   where token = p_token and expires_at > now();

  if v_user_id is null then
    raise exception 'Sessão inválida ou expirada.';
  end if;

  update public.app_users
     set email = lower(trim(p_email))
   where id = v_user_id;

  return true;
end;
$$;

create or replace function public.app_sync_recovered_password(
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'auth', 'extensions', 'pg_catalog'
as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Sessão de recuperação inválida.';
  end if;

  if p_password is null or length(p_password) < 4
     or p_password !~ '[A-Z]'
     or p_password !~ '[0-9]'
     or p_password !~ '[^A-Za-z0-9]' then
    raise exception 'A senha não atende aos requisitos mínimos.';
  end if;

  select email into v_email
    from auth.users
   where id = auth.uid();

  if v_email is null then
    raise exception 'E-mail da conta não encontrado.';
  end if;

  update public.app_users
     set email = lower(v_email),
         password_hash = crypt(p_password, gen_salt('bf'))
   where lower(email) = lower(v_email);

  if not found then
    raise exception 'Conta do FaturApp não encontrada para este e-mail.';
  end if;

  return true;
end;
$$;

create or replace function public.app_get_recovery_identity()
returns table(login text, email text)
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog'
as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Sessão de recuperação inválida.';
  end if;

  select u.email into v_email from auth.users u where u.id = auth.uid();

  return query
    select a.login, a.email
      from public.app_users a
     where lower(a.email) = lower(v_email)
     limit 1;
end;
$$;

revoke all on function public.app_set_recovery_email(uuid, text) from public;
grant execute on function public.app_set_recovery_email(uuid, text) to anon, authenticated;

revoke all on function public.app_sync_recovered_password(text) from public, anon;
grant execute on function public.app_sync_recovered_password(text) to authenticated;

revoke all on function public.app_get_recovery_identity() from public, anon;
grant execute on function public.app_get_recovery_identity() to authenticated;
