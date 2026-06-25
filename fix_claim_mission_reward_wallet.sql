-- ════════════════════════════════════════════════════════════════════════
-- FIX: claim_mission_reward acredita wallets.points (no wallets.pts)
-- ════════════════════════════════════════════════════════════════════════
-- Tercer bug de la misma familia (saldo en columna equivocada): la recompensa
-- de misiones diarias se acreditaba en `wallets.pts`, una columna que la UI
-- (que lee `wallets.points`) NO muestra. Resultado: las recompensas de misiones
-- diarias serían invisibles en el saldo del worker. 0 claims a la fecha del fix,
-- así que no requirió backfill.
--
-- Se unifica el crédito en `wallets.points` (fuente de verdad) y el ledger de
-- puntos en `point_transactions`, y se añade SET search_path = public.
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.claim_mission_reward(p_user_id uuid, p_mission_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_reward_pts          INTEGER;
  v_max_completions     INTEGER;
  v_current_completions INTEGER;
BEGIN
  -- 1. Misión activa
  SELECT reward_pts, max_completions, current_completions
  INTO   v_reward_pts, v_max_completions, v_current_completions
  FROM   daily_missions
  WHERE  id = p_mission_id AND status = 'active';

  IF v_reward_pts IS NULL THEN
    RAISE EXCEPTION 'Mission not available or inactive';
  END IF;

  -- 2. Límite de completions
  IF v_max_completions IS NOT NULL AND v_current_completions >= v_max_completions THEN
    RAISE EXCEPTION 'Mission has reached maximum completions';
  END IF;

  -- 3. No reclamada antes por este usuario
  IF EXISTS (
    SELECT 1 FROM daily_mission_claims
    WHERE user_id = p_user_id AND mission_id = p_mission_id
  ) THEN
    RAISE EXCEPTION 'Mission already claimed by this user';
  END IF;

  -- 4. Registrar claim
  INSERT INTO daily_mission_claims (user_id, mission_id, reward, claim_date)
  VALUES (p_user_id, p_mission_id, v_reward_pts, CURRENT_DATE);

  -- 5. CREDIT WALLET  (FIX: wallets.points, fuente de verdad — no wallets.pts)
  INSERT INTO wallets (user_id, points, updated_at)
  VALUES (p_user_id, v_reward_pts, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET points = wallets.points + v_reward_pts, updated_at = NOW();

  -- 6. Ledger de puntos
  INSERT INTO point_transactions (user_id, amount, type, reference_id)
  VALUES (p_user_id, v_reward_pts, 'daily_mission', p_mission_id);

  -- 7. Incrementar contador de la misión
  UPDATE daily_missions
  SET    current_completions = current_completions + 1
  WHERE  id = p_mission_id;

  RETURN 'SUCCESS';
END;
$function$;
