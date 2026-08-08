-- Google users are represented in the existing FaturApp auth system.
-- The Google email becomes both login and recovery email for new Google accounts.
-- No existing user or password is changed.

alter table public.app_users
  add column if not exists google_user_id uuid;

create unique index if not exists app_users_google_user_id_uq
  on public.app_users(google_user_id)
  where google_user_id is not null;

create or replace function public.app_register_google(
  p_email text,
  p_google_user_id uuid
)
returns table(user_id uuid, login text, role text, session_token uuid)
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  normalized_email text := lower(trim(p_email));
  found_user public.app_users%rowtype;
  new_token uuid;
  generated_password text := encode(gen_random_bytes(32), 'hex');
begin
  if normalized_email = '' or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'E-mail Google inválido.';
  end if;

  select * into found_user
  from public.app_users au
  where au.google_user_id = p_google_user_id
     or lower(au.login) = normalized_email
     or lower(coalesce(au.recovery_email, '')) = normalized_email
  limit 1;

  if found_user.id is not null then
    if found_user.google_user_id is null then
      raise exception 'Já existe uma conta FaturApp usando este e-mail. Entre com seu login e senha e use o e-mail de recuperação.';
    end if;

    new_token := gen_random_uuid();
    insert into public.app_sessions(token, user_id, expires_at)
    values (new_token, found_user.id, now() + interval '30 days');

    return query select found_user.id, found_user.login, found_user.role, new_token;
    return;
  end if;

  insert into public.app_users(login, password_hash, role, recovery_email, google_user_id)
  values (
    normalized_email,
    crypt(generated_password, gen_salt('bf', 10)),
    'user',
    normalized_email,
    p_google_user_id
  )
  returning * into found_user;

  new_token := gen_random_uuid();
  insert into public.app_sessions(token, user_id, expires_at)
  values (new_token, found_user.id, now() + interval '30 days');

  return query select found_user.id, found_user.login, found_user.role, new_token;
end;
$$;

grant execute on function public.app_register_google(text, uuid) to anon, authenticated;
