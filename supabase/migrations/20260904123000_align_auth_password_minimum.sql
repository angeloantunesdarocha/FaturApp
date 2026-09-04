-- Mantém o cadastro próprio e a recuperação alinhados ao mínimo do Supabase Auth.
-- A alteração vale apenas para novas senhas; credenciais e sessões existentes permanecem válidas.

create or replace function public.app_register(
  p_login text,
  p_password text
)
returns table(user_id uuid, login text, role text, session_token uuid)
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $$
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
$$;
