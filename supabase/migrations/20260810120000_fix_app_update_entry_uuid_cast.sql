-- fix(definitivo): corrige "operator does not exist: text = uuid" em app_update_entry
--
-- Causa raiz:
--   daily_entries.user_id é do tipo TEXT (não uuid).
--   A versão anterior declarava uid como uuid, gerando a comparação
--   WHERE user_id (text) = uid (uuid) → erro de tipo.
--
-- Solução:
--   Declarar uid como text e fazer s.user_id::text ao buscar na sessão.
--   Assim todas as comparações ficam com tipos compatíveis:
--     s.token = p_token    → uuid = uuid ✅
--     user_id = uid        → text = text ✅
--     id      = p_entry_id → uuid = uuid ✅

CREATE OR REPLACE FUNCTION public.app_update_entry(
  p_token    uuid,
  p_entry_id uuid,
  p_entry    jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $$
DECLARE
  uid        text;
  manutencao jsonb;
  extras     jsonb;
BEGIN
  SELECT s.user_id::text INTO uid
    FROM public.app_sessions s
   WHERE s.token = p_token
     AND s.expires_at > now();

  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou expirada.';
  END IF;

  manutencao := COALESCE(p_entry->'maintenance_details', p_entry->'manutencao_itens', '[]'::jsonb);
  extras     := COALESCE(p_entry->'extra_expenses',      p_entry->'extras_itens',      '[]'::jsonb);

  UPDATE public.daily_entries SET
    date                     = (p_entry->>'date')::date,
    gross_amount             = (p_entry->>'gross_amount')::numeric,
    fee_percent              = (p_entry->>'fee_percent')::numeric,
    net_fare                 = (p_entry->>'net_fare')::numeric,
    gas_expense              = GREATEST(COALESCE((p_entry->>'gas_expense')::numeric,              0), 0),
    alcohol_expense          = GREATEST(COALESCE((p_entry->>'alcohol_expense')::numeric,          0), 0),
    gasoline_price_per_liter = GREATEST(COALESCE((p_entry->>'gasoline_price_per_liter')::numeric, 0), 0),
    alcohol_price_per_liter  = GREATEST(COALESCE((p_entry->>'alcohol_price_per_liter')::numeric,  0), 0),
    gasoline_liters          = GREATEST(COALESCE((p_entry->>'gasoline_liters')::numeric,          0), 0),
    alcohol_liters           = GREATEST(COALESCE((p_entry->>'alcohol_liters')::numeric,           0), 0),
    km_initial               = GREATEST(COALESCE((p_entry->>'km_initial')::numeric,               0), 0),
    km_final                 = GREATEST(COALESCE((p_entry->>'km_final')::numeric,                 0), 0),
    km_driven                = GREATEST(COALESCE((p_entry->>'km_driven')::numeric,                0), 0),
    hours_worked             = GREATEST(COALESCE((p_entry->>'hours_worked')::numeric,             0), 0),
    maintenance_expense      = GREATEST(COALESCE((p_entry->>'maintenance_expense')::numeric,      0), 0),
    maintenance_details      = manutencao,
    extra_expenses           = extras,
    manutencao_itens         = manutencao,
    extras_itens             = extras
  WHERE id      = p_entry_id
    AND user_id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento não encontrado ou não pertence ao usuário.';
  END IF;

  RETURN jsonb_build_object('success', true, 'id', p_entry_id);
END;
$$;
