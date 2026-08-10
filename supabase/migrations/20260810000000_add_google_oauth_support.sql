-- Adiciona suporte a Google OAuth na tabela app_users
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS google_id TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_google_id_idx
  ON public.app_users(google_id)
  WHERE google_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS app_users_email_lower_idx
  ON public.app_users(lower(email))
  WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.app_google_auth(
  p_email     TEXT,
  p_google_id TEXT
)
RETURNS TABLE(session_token UUID, role TEXT, login TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_login   TEXT;
  v_role    TEXT;
  v_token   UUID;
BEGIN
  SELECT u.id, u.login, u.role
    INTO v_user_id, v_login, v_role
    FROM public.app_users u
   WHERE u.google_id = p_google_id
   LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT u.id, u.login, u.role
      INTO v_user_id, v_login, v_role
      FROM public.app_users u
     WHERE lower(u.email) = lower(p_email)
       AND u.google_id IS NULL
     LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.app_users
       SET google_id = p_google_id,
           email     = COALESCE(email, p_email)
     WHERE id = v_user_id;
  ELSE
    v_login := split_part(p_email, '@', 1);
    v_role  := 'user';
    INSERT INTO public.app_users (login, password_hash, role, google_id, email)
    VALUES (v_login, '', v_role, p_google_id, p_email)
    RETURNING id INTO v_user_id;
  END IF;

  INSERT INTO public.app_sessions (user_id)
  VALUES (v_user_id)
  RETURNING token INTO v_token;

  RETURN QUERY SELECT v_token, v_role, v_login;
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_google_auth(TEXT, TEXT) TO anon, authenticated;
