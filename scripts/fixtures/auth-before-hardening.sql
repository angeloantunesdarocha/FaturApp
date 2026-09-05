CREATE OR REPLACE FUNCTION public.app_get_session(p_token uuid)
 RETURNS TABLE(user_id uuid, login text, role text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select u.id, u.login, u.role
  from public.app_sessions s
  join public.app_users u on u.id = s.user_id
  where s.token = p_token
    and s.expires_at > now();
$function$;

CREATE OR REPLACE FUNCTION public.app_google_auth(p_email text, p_google_id text)
 RETURNS TABLE(session_token uuid, role text, login text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_catalog'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.app_login(p_login text, p_password text)
 RETURNS TABLE(user_id uuid, login text, role text, session_token uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
declare
  found_user public.app_users%rowtype;
  new_token uuid;
begin
  select * into found_user
  from public.app_users au
  where lower(au.login) = lower(trim(p_login))
    and au.password_hash = crypt(p_password, au.password_hash)
  limit 1;

  if found_user.id is null then
    return;
  end if;

  new_token := gen_random_uuid();

  insert into public.app_sessions(token, user_id, expires_at)
  values (new_token, found_user.id, now() + interval '30 days');

  return query
  select found_user.id, found_user.login, found_user.role, new_token;
end;
$function$;

CREATE OR REPLACE FUNCTION public.app_logout(p_token uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  delete from public.app_sessions where token = p_token;
$function$;

CREATE OR REPLACE FUNCTION public.app_register(p_login text, p_password text)
 RETURNS TABLE(user_id uuid, login text, role text, session_token uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
declare
  normalized text := trim(p_login);
  new_id uuid;
  t uuid;
  new_role text := 'user';
  total_users integer;
begin
  if normalized = '' or length(normalized) > 120 then
    raise exception 'Login inválido.';
  end if;

  if p_password is null
     or length(p_password) < 6
     or p_password !~ '[A-Z]'
     or p_password !~ '[0-9]'
     or p_password !~ '[^A-Za-z0-9]' then
    raise exception 'A senha deve ter no mínimo 6 caracteres, uma letra maiúscula, um número e um caractere especial.';
  end if;

  if exists (
    select 1
    from public.app_users au
    where lower(au.login) = lower(normalized)
  ) then
    raise exception 'Este login já está cadastrado.';
  end if;

  select count(*) into total_users from public.app_users;

  if total_users = 0 then
    if lower(normalized) <> lower('Angelo Antunes') then
      raise exception 'O primeiro cadastro deve ser realizado pelo administrador do aplicativo.';
    end if;
    new_role := 'admin';
  end if;

  insert into public.app_users(login, password_hash, role)
  values(normalized, crypt(p_password, gen_salt('bf', 12)), new_role)
  returning id into new_id;

  if new_role = 'admin' then
    update public.daily_entries de
    set user_id = new_id::text
    where de.user_id = 'default';
  end if;

  t := gen_random_uuid();
  insert into public.app_sessions(token, user_id, expires_at)
  values(t, new_id, now() + interval '30 days');

  return query
    select new_id, normalized, new_role, t;
end;
$function$;

CREATE OR REPLACE FUNCTION public.app_set_recovery_email(p_token uuid, p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.app_sync_recovered_password(p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_catalog'
AS $function$
declare
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Sessão de recuperação inválida.';
  end if;

  if p_password is null
     or length(p_password) < 6
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
$function$;
