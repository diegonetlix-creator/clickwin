-- ════════════════════════════════════════════════════════════════════════
-- FIX: grant_social_task_reward acredita en wallets.points (no points_balance)
-- ════════════════════════════════════════════════════════════════════════
-- Bug: la versión anterior acreditaba la recompensa de tareas sociales en
-- `profiles.points_balance` (paso 11, comentado erróneamente "CREDIT WORKER
-- WALLET"), una columna fantasma que la wallet/dashboard/premios NO leen. Por
-- eso los puntos de Crecimiento Social no aparecían en el saldo del worker.
--
-- Esta migración unifica el crédito en `wallets.points` (la fuente de verdad,
-- igual que grant_task_reward / claim_mission_reward / reward_referral), usando
-- el patrón canónico de upsert que dispara el trigger de sincronización de
-- estrellas (on_wallet_points_update). Añade además SET search_path = public
-- para evitar search_path injection (consistente con security_hardening.sql).
--
-- No requiere backfill: profiles.points_balance está en 0 para todos los
-- usuarios al momento de aplicar.
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.grant_social_task_reward(p_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_submission    RECORD;
  v_task          RECORD;
  v_reward        INTEGER;
  v_worker_id     UUID;
  v_task_id       UUID;
  v_reviewer_id   UUID := auth.uid();
  v_daily_count   INTEGER;
BEGIN

  -- 1. ROW LOCK
  SELECT * INTO v_submission
  FROM   social_task_submissions
  WHERE  id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBMISSION_NOT_FOUND: submission does not exist';
  END IF;

  v_worker_id := v_submission.worker_id;
  v_task_id   := v_submission.task_id;

  -- 2. PREVENT SELF-APPROVAL
  IF v_reviewer_id IS NOT NULL AND v_reviewer_id = v_worker_id THEN
    RAISE EXCEPTION 'SELF_APPROVAL_BLOCKED: cannot approve your own submission';
  END IF;

  -- 3. REVIEWER DAILY CAP (skip if reviewer unknown, e.g. server call)
  IF v_reviewer_id IS NOT NULL THEN
    v_daily_count := count_reviewer_approvals_today(v_reviewer_id);
    IF v_daily_count >= 20 THEN
      RAISE EXCEPTION 'REVIEWER_LIMIT_REACHED: max 20 approvals/day (used: %)', v_daily_count;
    END IF;
  END IF;

  -- 4. ALREADY PROCESSED
  IF v_submission.status != 'pending' THEN
    RAISE EXCEPTION 'ALREADY_PROCESSED: status is already ''%''', v_submission.status;
  END IF;

  -- 5. EVIDENCE IMAGE REQUIRED
  IF v_submission.evidence_image IS NULL OR trim(v_submission.evidence_image) = '' THEN
    RAISE EXCEPTION 'EVIDENCE_REQUIRED: no evidence image attached';
  END IF;

  -- 6. EVIDENCE HASH REQUIRED
  IF v_submission.evidence_hash IS NULL OR trim(v_submission.evidence_hash) = '' THEN
    RAISE EXCEPTION 'HASH_REQUIRED: no evidence hash — duplicate submission suspected';
  END IF;

  -- 7. UNIQUE APPROVAL PER WORKER/TASK
  IF (
    SELECT COUNT(*) FROM social_task_submissions
    WHERE  task_id   = v_task_id
      AND  worker_id = v_worker_id
      AND  status    = 'approved'
  ) > 0 THEN
    RAISE EXCEPTION 'DUPLICATE_APPROVAL: worker already approved for this task';
  END IF;

  -- 8. LOAD TASK + BUDGET LOCK
  SELECT * INTO v_task
  FROM   social_tasks
  WHERE  id = v_task_id
  FOR UPDATE;

  v_reward := COALESCE(v_task.reward, 0);

  IF COALESCE(v_task.locked_budget, 0) < v_reward THEN
    RAISE EXCEPTION 'INSUFFICIENT_BUDGET: budget=% reward=%',
      COALESCE(v_task.locked_budget, 0), v_reward;
  END IF;

  -- 9. APPROVE SUBMISSION
  UPDATE social_task_submissions
  SET    status = 'approved'
  WHERE  id = p_submission_id;

  -- 10. DEDUCT TASK BUDGET
  UPDATE social_tasks
  SET    locked_budget = locked_budget - v_reward
  WHERE  id = v_task_id;

  -- 11. CREDIT WORKER WALLET  ◀── FIX: wallets.points (fuente de verdad), no profiles.points_balance.
  --     Upsert con el patrón canónico de grant_task_reward; el trigger
  --     on_wallet_points_update sincroniza las estrellas automáticamente.
  INSERT INTO wallets (user_id, points, updated_at)
  VALUES (v_worker_id, v_reward, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET points = wallets.points + v_reward, updated_at = NOW();

  -- 12. IMMUTABLE LEDGER ENTRY
  INSERT INTO point_transactions (user_id, amount, type, reference_id)
  VALUES (v_worker_id, v_reward, 'task_reward', p_submission_id);

  -- 13. AUDIT LOG
  INSERT INTO audit_logs (action, target_id, actor_id, metadata)
  VALUES (
    'task_approved',
    p_submission_id,
    v_reviewer_id,
    jsonb_build_object(
      'worker_id',   v_worker_id,
      'reviewer_id', v_reviewer_id,
      'reward',      v_reward,
      'task_id',     v_task_id,
      'hash',        v_submission.evidence_hash
    )
  );

  -- 14. SUCCESS PAYLOAD
  RETURN jsonb_build_object(
    'ok',        true,
    'reward',    v_reward,
    'worker_id', v_worker_id,
    'message',   'Recompensa acreditada instantáneamente'
  );

END;
$function$;

REVOKE ALL ON FUNCTION public.grant_social_task_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_social_task_reward(uuid) TO authenticated;
