-- ════════════════════════════════════════════════════════════════════════
-- FIX: create_social_task cobra wallets.points y NO inserta social_tasks.status
-- ════════════════════════════════════════════════════════════════════════
-- Bug 1 (saldo): validaba/descontaba el presupuesto del promotor sobre
--   `profiles.points_balance`, una columna fantasma en 0 para todos → toda
--   publicación de misión fallaba con "Insufficient balance: has 0, needs X".
--   Se unifica el cobro en `wallets.points` (con row lock), consistente con
--   grant_task_reward / grant_social_task_reward.
--
-- Bug 2 (status): el INSERT referenciaba `social_tasks.status`, columna que NO
--   existe en la tabla. Nunca se disparaba porque el chequeo de saldo (Bug 1)
--   fallaba antes; al corregir el saldo, el flujo llegaba al INSERT y reventaba
--   con: column "status" of relation "social_tasks" does not exist.
--   Ninguna función ni el frontend consume social_tasks.status → se omite.
--
-- Nota: el overload de 5 args fue eliminado en cleanup_wallet_balance_system.sql;
-- producción mantiene únicamente la firma de 8 args.
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_social_task(
  p_promoter_id uuid, p_platform text, p_target_url text,
  p_reward integer, p_max_workers integer,
  p_title text DEFAULT NULL::text,
  p_expected_username text DEFAULT NULL::text,
  p_expected_url text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_required_budget INTEGER;
  v_balance         INTEGER;
  v_task_id         UUID;
BEGIN
  v_required_budget := p_reward * p_max_workers;

  -- Balance real del promotor (fuente de verdad: wallets.points) con bloqueo
  SELECT COALESCE(points, 0)
  INTO   v_balance
  FROM   wallets
  WHERE  user_id = p_promoter_id
  FOR UPDATE;

  IF COALESCE(v_balance, 0) < v_required_budget THEN
    RAISE EXCEPTION 'Insufficient balance: has %, needs %', COALESCE(v_balance, 0), v_required_budget;
  END IF;

  -- Descontar presupuesto de wallets.points (dispara trigger de estrellas)
  UPDATE wallets
  SET    points = points - v_required_budget, updated_at = NOW()
  WHERE  user_id = p_promoter_id;

  -- social_tasks NO tiene columna status: se omite (nada la consume)
  INSERT INTO social_tasks (
    id, promoter_id, platform, target_url,
    reward, max_workers, locked_budget,
    title, expected_username, expected_url
  )
  VALUES (
    gen_random_uuid(), p_promoter_id, p_platform, p_target_url,
    p_reward, p_max_workers, v_required_budget,
    COALESCE(p_title, p_platform || ' Task'),
    p_expected_username,
    COALESCE(p_expected_url, p_target_url)
  )
  RETURNING id INTO v_task_id;

  INSERT INTO point_transactions (user_id, amount, type, reference_id)
  VALUES (p_promoter_id, -v_required_budget, 'task_creation', v_task_id);

  RETURN v_task_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_social_task(uuid, text, text, integer, integer, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_social_task(uuid, text, text, integer, integer, text, text, text) TO authenticated;
