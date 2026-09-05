-- Critical identity hardening. No financial rows, passwords or sessions are
-- changed by installation. Abort atomically if the verified owner is ambiguous.
begin;
set local lock_timeout = '5s';
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.app_owner_identity (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references public.app_users(id) on delete restrict,
  auth_user_id uuid not null unique,
  email text not null check (email = 'angeloantunesdarocha@gmail.com')
);
alter table private.app_owner_identity enable row level security;
revoke all on private.app_owner_identity from public, anon, authenticated;

insert into private.app_owner_identity(user_id, auth_user_id, email)
select a.id, u.id, lower(u.email)
from public.app_users a join auth.users u on a.google_id = u.id::text
where a.role = 'admin' and lower(a.email) = 'angeloantunesdarocha@gmail.com'
  and lower(u.email) = 'angeloantunesdarocha@gmail.com'
  and u.email_confirmed_at is not null;

do $$
begin
  if (select count(*) from private.app_owner_identity) <> 1
     or (select count(*) from public.app_users where role = 'admin') <> 1 then
    raise exception 'Identidade do administrador não confirmada; nenhuma alteração aplicada.';
  end if;
  if exists (select 1 from public.app_users where email is not null
             group by lower(trim(email)) having count(*) > 1) then
    raise exception 'E-mails duplicados exigem revisão; nenhuma conta será mesclada.';
  end if;
end $$;

create unique index app_users_one_admin on public.app_users ((role)) where role = 'admin';
create unique index app_users_unique_identity_email on public.app_users (lower(trim(email))) where email is not null;

create or replace function private.app_guard_owner()
returns trigger language plpgsql security definer set search_path = pg_catalog
as $$
declare v_owner private.app_owner_identity%rowtype;
begin
  select * into strict v_owner from private.app_owner_identity where singleton;
  if tg_op = 'DELETE' then
    if old.id = v_owner.user_id then raise exception 'A conta do administrador não pode ser removida.'; end if;
    return old;
  end if;
  if new.role = 'admin' and new.id <> v_owner.user_id then
    raise exception 'Somente o proprietário verificado pode ser administrador.';
  end if;
  if new.id = v_owner.user_id or (tg_op = 'UPDATE' and old.id = v_owner.user_id) then
    if new.id <> v_owner.user_id or new.role <> 'admin'
       or lower(trim(new.email)) is distinct from v_owner.email
       or new.google_id is distinct from v_owner.auth_user_id::text then
      raise exception 'A identidade do administrador está protegida.';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.app_guard_owner() from public, anon, authenticated;
create trigger app_users_guard_owner before insert or update or delete on public.app_users
for each row execute function private.app_guard_owner();

create or replace function private.app_require_admin(p_token uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare v_user_id uuid;
begin
  select s.user_id into v_user_id
  from public.app_sessions s join public.app_users u on u.id=s.user_id
  join private.app_owner_identity o on o.user_id=u.id
  where s.token=p_token and s.expires_at>now() and u.role='admin';
  if v_user_id is null then raise exception 'Acesso não autorizado.'; end if;
  return v_user_id;
end $$;
revoke all on function private.app_require_admin(uuid) from public, anon, authenticated;

-- The only identity source is the authenticated, confirmed Supabase user.
-- A live auth.sessions row also rejects revoked Supabase access tokens.
create or replace function private.app_verified_identity()
returns table(identity_id uuid, verified_email text)
language plpgsql security definer set search_path = pg_catalog
as $$
begin
  return query select u.id, lower(trim(u.email)) from auth.users u
  where u.id=auth.uid() and u.email_confirmed_at is not null
    and u.email is not null
    and exists (select 1 from auth.sessions s where s.user_id=u.id
      and s.id::text=auth.jwt()->>'session_id');
  if not found then raise exception 'Identidade não verificada ou sessão revogada.'; end if;
end $$;
revoke all on function private.app_verified_identity() from public, anon, authenticated;

-- Existing Google links take priority. The legacy e-mail fallback is allowed
-- only for a unique account without a different immutable identity link.
create or replace function private.app_verified_account()
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare v_identity uuid; v_email text; v_id uuid;
begin
  select identity_id, verified_email into strict v_identity,v_email from private.app_verified_identity();
  perform pg_advisory_xact_lock(hashtextextended(v_identity::text, 0));
  select a.id into v_id from public.app_users a where a.google_id=v_identity::text for update;
  if v_id is null then
    select a.id into v_id from public.app_users a
    where lower(trim(a.email))=v_email and a.google_id is null for update;
    if v_id is not null then
      update public.app_users set google_id=v_identity::text where id=v_id;
    end if;
  end if;
  return v_id;
end $$;
revoke all on function private.app_verified_account() from public, anon, authenticated;

create or replace function public.app_google_auth(p_email text, p_google_id text)
returns table(session_token uuid, role text, login text)
language plpgsql security definer set search_path = pg_catalog
as $$
declare v_identity uuid; v_email text; v_id uuid; v_login text; v_role text; v_token uuid;
begin
  select identity_id,verified_email into strict v_identity,v_email from private.app_verified_identity();
  if p_google_id is distinct from v_identity::text
     or lower(trim(p_email)) is distinct from v_email then
    raise exception 'Identidade não corresponde à sessão autenticada.';
  end if;
  v_id := private.app_verified_account();
  if v_id is null then
    -- Do not transfer an account already linked to another identity.
    if exists(select 1 from public.app_users a where lower(trim(a.email))=v_email) then
      raise exception 'Vínculo de identidade exige revisão.';
    end if;
    v_login := split_part(v_email,'@',1);
    if exists(select 1 from public.app_users a where lower(a.login)=lower(v_login)) then
      v_login := left(v_login,75) || '-' || v_identity::text;
    end if;
    insert into public.app_users(login,password_hash,role,google_id,email)
    values(v_login,'','user',v_identity::text,v_email) returning id into v_id;
  end if;
  select a.login,a.role into v_login,v_role from public.app_users a where a.id=v_id;
  insert into public.app_sessions(user_id) values(v_id) returning token into v_token;
  return query select v_token,v_role,v_login;
end $$;
revoke all on function public.app_google_auth(text,text) from public, anon;
grant execute on function public.app_google_auth(text,text) to authenticated;

-- Existing passwords and session duration are unchanged. Public registration
-- never bootstraps an administrator based on a display name or row count.
create or replace function public.app_register(p_login text,p_password text)
returns table(user_id uuid,login text,role text,session_token uuid)
language plpgsql security definer set search_path = public, extensions, pg_catalog
as $$
declare v_login text:=trim(p_login); v_id uuid; v_token uuid;
begin
  if v_login is null or v_login='' or length(v_login)>120 then raise exception 'Login inválido.'; end if;
  if p_password is null or length(p_password)<6 or p_password !~ '[A-Z]'
     or p_password !~ '[0-9]' or p_password !~ '[^A-Za-z0-9]' then
    raise exception 'A senha deve ter no mínimo 6 caracteres, uma letra maiúscula, um número e um caractere especial.';
  end if;
  if exists(select 1 from public.app_users a where lower(a.login)=lower(v_login)) then
    raise exception 'Este login já está cadastrado.';
  end if;
  insert into public.app_users(login,password_hash,role)
  values(v_login,crypt(p_password,gen_salt('bf',12)),'user') returning id into v_id;
  insert into public.app_sessions(user_id) values(v_id) returning token into v_token;
  return query select v_id,v_login,'user'::text,v_token;
end $$;
revoke all on function public.app_register(text,text) from public;
grant execute on function public.app_register(text,text) to anon,authenticated;

create or replace function public.app_set_recovery_email(p_token uuid,p_email text)
returns boolean language plpgsql security definer set search_path = pg_catalog
as $$
declare v_id uuid; v_current_email text; v_google_id text; v_email text:=lower(trim(p_email));
        v_identity uuid; v_verified_email text;
begin
  if v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail inválido.'; end if;
  select a.id,a.email,a.google_id into v_id,v_current_email,v_google_id
  from public.app_sessions s join public.app_users a on a.id=s.user_id
  where s.token=p_token and s.expires_at>now() for update of a;
  if v_id is null then raise exception 'Sessão inválida ou expirada.'; end if;
  -- Initial registration may store a contact address, not an authorization
  -- claim. Changing an existing address additionally requires verified Auth.
  if v_current_email is not null and lower(trim(v_current_email))<>v_email then
    select identity_id,verified_email into strict v_identity,v_verified_email from private.app_verified_identity();
    if v_google_id is distinct from v_identity::text or v_verified_email<>v_email then
      raise exception 'Confirme o novo e-mail antes de alterar a recuperação.';
    end if;
  end if;
  if exists(select 1 from public.app_users a where lower(trim(a.email))=v_email and a.id<>v_id) then
    raise exception 'Este e-mail já está vinculado a uma conta.';
  end if;
  update public.app_users set email=v_email,recovery_email=v_email where id=v_id;
  return true;
end $$;
revoke all on function public.app_set_recovery_email(uuid,text) from public;
grant execute on function public.app_set_recovery_email(uuid,text) to anon,authenticated;

-- Close the older alias as well, preserving its signature for older clients.
create or replace function public.app_update_recovery_email(p_token uuid,p_email text)
returns boolean language sql security definer set search_path = pg_catalog
as $$ select public.app_set_recovery_email(p_token,p_email) $$;
revoke all on function public.app_update_recovery_email(uuid,text) from public;
grant execute on function public.app_update_recovery_email(uuid,text) to anon,authenticated;

create or replace function public.app_register_with_email(p_login text,p_password text,p_email text)
returns table(user_id uuid,login text,role text,session_token uuid)
language plpgsql security definer set search_path = pg_catalog
as $$
declare v_result record;
begin
  select * into strict v_result from public.app_register(p_login,p_password);
  perform public.app_set_recovery_email(v_result.session_token,p_email);
  return query select v_result.user_id,v_result.login,v_result.role,v_result.session_token;
end $$;
revoke all on function public.app_register_with_email(text,text,text) from public;
grant execute on function public.app_register_with_email(text,text,text) to anon,authenticated;

create or replace function public.app_get_recovery_identity()
returns table(login text,email text)
language plpgsql security definer set search_path = pg_catalog
as $$
declare v_id uuid;
begin
  v_id:=private.app_verified_account();
  if v_id is null then raise exception 'Conta não encontrada para a identidade verificada.'; end if;
  return query select a.login,a.email from public.app_users a where a.id=v_id;
end $$;
revoke all on function public.app_get_recovery_identity() from public,anon;
grant execute on function public.app_get_recovery_identity() to authenticated;

create or replace function public.app_sync_recovered_password(p_password text)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_catalog
as $$
declare v_id uuid;
begin
  v_id:=private.app_verified_account();
  if v_id is null then raise exception 'Conta não encontrada para a identidade verificada.'; end if;
  if p_password is null or length(p_password)<6 or p_password !~ '[A-Z]'
     or p_password !~ '[0-9]' or p_password !~ '[^A-Za-z0-9]' then
    raise exception 'A senha não atende aos requisitos mínimos.';
  end if;
  update public.app_users set password_hash=crypt(p_password,gen_salt('bf',12)) where id=v_id;
  delete from public.app_sessions where user_id=v_id;
  return true;
end $$;
revoke all on function public.app_sync_recovered_password(text) from public,anon;
grant execute on function public.app_sync_recovered_password(text) to authenticated;

create or replace function public.app_complete_password_recovery(p_password text)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare v_id uuid; v_token uuid;
begin
  v_id:=private.app_verified_account();
  perform public.app_sync_recovered_password(p_password);
  insert into public.app_sessions(user_id) values(v_id) returning token into v_token;
  return v_token;
end $$;
revoke all on function public.app_complete_password_recovery(text) from public,anon;
grant execute on function public.app_complete_password_recovery(text) to authenticated;

-- Preserve RPC access; never grant direct reads of bearer tokens/passwords.
alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;
alter table public.daily_entries enable row level security;
revoke all on public.app_users,public.app_sessions,public.daily_entries from public,anon,authenticated;
commit;
