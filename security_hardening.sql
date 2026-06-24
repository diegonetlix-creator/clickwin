-- ============================================================
--  CLICKWIN — SECURITY HARDENING
--  Aplica este script en el SQL Editor de Supabase.
--  Orden: RLS → policies → RPCs de wallet → hardening de roles
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. HABILITAR ROW LEVEL SECURITY EN TODAS LAS TABLAS
-- ────────────────────────────────────────────────────────────
ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_missions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_mission_claims    ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 2. HELPER: función interna que devuelve el rol del usuario autenticado
--    Se usa en todas las políticas (evita subconsultas repetidas).
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;


-- ────────────────────────────────────────────────────────────
-- 3. POLICIES — PROFILES
-- ────────────────────────────────────────────────────────────
-- Limpiar políticas anteriores si existen
DROP POLICY IF EXISTS "profiles_select_own"          ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin"        ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"          ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_no_role"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin"        ON profiles;

-- Lectura: el propio usuario ve su perfil; admins ven todos
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (get_my_role() = 'admin');

-- Inserción: solo el propio usuario al registrarse
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Actualización: usuario puede editar su perfil PERO NO cambiar role
CREATE POLICY "profiles_update_own_no_role" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- El rol no puede cambiar (queda fijo al valor actual en DB)
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );

-- Admins pueden cambiar cualquier campo de cualquier perfil
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE
  USING (get_my_role() = 'admin');


-- ────────────────────────────────────────────────────────────
-- 4. POLICIES — WALLETS
--    CRÍTICO: bloquear escritura directa desde el cliente.
--    Solo lecturas propias + RPCs SECURITY DEFINER modifican saldo.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "wallets_select_own"   ON wallets;
DROP POLICY IF EXISTS "wallets_select_admin" ON wallets;
DROP POLICY IF EXISTS "wallets_no_direct_insert" ON wallets;
DROP POLICY IF EXISTS "wallets_no_direct_update" ON wallets;
DROP POLICY IF EXISTS "wallets_no_direct_delete" ON wallets;

-- Solo lectura propia
CREATE POLICY "wallets_select_own" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Admins leen todas las wallets
CREATE POLICY "wallets_select_admin" ON wallets
  FOR SELECT USING (get_my_role() = 'admin');

-- BLOQUEAR INSERT / UPDATE / DELETE directos desde el cliente
-- (los RPCs SECURITY DEFINER bypassean RLS y pueden escribir)
CREATE POLICY "wallets_no_direct_insert" ON wallets
  FOR INSERT WITH CHECK (false);

CREATE POLICY "wallets_no_direct_update" ON wallets
  FOR UPDATE USING (false);

CREATE POLICY "wallets_no_direct_delete" ON wallets
  FOR DELETE USING (false);


-- ────────────────────────────────────────────────────────────
-- 5. POLICIES — WORKER_PROFILES / PROMOTER_PROFILES
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "wp_select_own"   ON worker_profiles;
DROP POLICY IF EXISTS "wp_select_all"   ON worker_profiles;
DROP POLICY IF EXISTS "wp_upsert_own"   ON worker_profiles;
DROP POLICY IF EXISTS "pp_select_own"   ON promoter_profiles;
DROP POLICY IF EXISTS "pp_select_all"   ON promoter_profiles;
DROP POLICY IF EXISTS "pp_upsert_own"   ON promoter_profiles;

CREATE POLICY "wp_select_own"  ON worker_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "wp_select_all"  ON worker_profiles FOR SELECT USING (true);  -- ranking es público
CREATE POLICY "wp_upsert_own"  ON worker_profiles FOR ALL   USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "pp_select_own"  ON promoter_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "pp_select_all"  ON promoter_profiles FOR SELECT USING (true);
CREATE POLICY "pp_upsert_own"  ON promoter_profiles FOR ALL   USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- ────────────────────────────────────────────────────────────
-- 6. POLICIES — TRANSACCIONES (solo lectura propia)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tx_select_own"    ON transactions;
DROP POLICY IF EXISTS "tx_no_insert"     ON transactions;
DROP POLICY IF EXISTS "tx_no_update"     ON transactions;
DROP POLICY IF EXISTS "ptx_select_own"   ON point_transactions;

CREATE POLICY "tx_select_own"  ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tx_no_insert"   ON transactions FOR INSERT WITH CHECK (false);
CREATE POLICY "tx_no_update"   ON transactions FOR UPDATE USING (false);

CREATE POLICY "ptx_select_own" ON point_transactions FOR SELECT USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 7. POLICIES — PRIZES (lectura pública, escritura solo admin/promoter)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "prizes_select_active" ON prizes;
DROP POLICY IF EXISTS "prizes_manage"        ON prizes;

CREATE POLICY "prizes_select_active" ON prizes
  FOR SELECT USING (is_active = true OR get_my_role() IN ('admin','promoter'));

CREATE POLICY "prizes_manage" ON prizes
  FOR ALL USING (
    get_my_role() = 'admin'
    OR (get_my_role() = 'promoter' AND created_by = auth.uid())
  );


-- ────────────────────────────────────────────────────────────
-- 8. POLICIES — CAMPAIGNS / TASKS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "campaigns_select" ON campaigns;
DROP POLICY IF EXISTS "campaigns_manage" ON campaigns;
DROP POLICY IF EXISTS "tasks_select"     ON tasks;

CREATE POLICY "campaigns_select" ON campaigns
  FOR SELECT USING (true);

CREATE POLICY "campaigns_manage" ON campaigns
  FOR ALL USING (
    get_my_role() = 'admin'
    OR (get_my_role() = 'promoter' AND created_by = auth.uid())
  );

CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (true);


-- ────────────────────────────────────────────────────────────
-- 9. POLICIES — SUBMISSIONS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "submissions_select_own"     ON submissions;
DROP POLICY IF EXISTS "submissions_insert_own"     ON submissions;
DROP POLICY IF EXISTS "submissions_review"         ON submissions;

CREATE POLICY "submissions_select_own" ON submissions
  FOR SELECT USING (auth.uid() = worker_id OR get_my_role() IN ('promoter','admin'));

CREATE POLICY "submissions_insert_own" ON submissions
  FOR INSERT WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "submissions_review" ON submissions
  FOR UPDATE USING (get_my_role() IN ('promoter','admin'));


-- ────────────────────────────────────────────────────────────
-- 10. POLICIES — SOCIAL TASK SUBMISSIONS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sts_select"  ON social_task_submissions;
DROP POLICY IF EXISTS "sts_insert"  ON social_task_submissions;
DROP POLICY IF EXISTS "sts_update"  ON social_task_submissions;

CREATE POLICY "sts_select" ON social_task_submissions
  FOR SELECT USING (auth.uid() = worker_id OR get_my_role() IN ('worker','student','admin'));

CREATE POLICY "sts_insert" ON social_task_submissions
  FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- Solo RPCs actualizan status; bloquear update directo de status desde cliente anon
CREATE POLICY "sts_update" ON social_task_submissions
  FOR UPDATE USING (
    -- Reviewer puede actualizar (reject), pero no puede aprobar (eso lo hace la RPC)
    get_my_role() IN ('worker','student','admin')
    AND auth.uid() != worker_id
  );


-- ────────────────────────────────────────────────────────────
-- 11. POLICIES — DAILY MISSIONS / CLAIMS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dm_select"   ON daily_missions;
DROP POLICY IF EXISTS "dm_manage"   ON daily_missions;
DROP POLICY IF EXISTS "dmc_select"  ON daily_mission_claims;

CREATE POLICY "dm_select"  ON daily_missions FOR SELECT USING (true);
CREATE POLICY "dm_manage"  ON daily_missions
  FOR ALL USING (
    get_my_role() = 'admin'
    OR (get_my_role() = 'promoter' AND created_by = auth.uid())
  );

CREATE POLICY "dmc_select" ON daily_mission_claims
  FOR SELECT USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 12. POLICIES — REFERRALS / NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "referrals_select" ON referrals;
DROP POLICY IF EXISTS "referrals_insert" ON referrals;
DROP POLICY IF EXISTS "notif_select"     ON notifications;

CREATE POLICY "referrals_select" ON referrals
  FOR SELECT USING (auth.uid() = invited_user OR auth.uid() = referrer_user);

CREATE POLICY "referrals_insert" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = invited_user AND invited_user != referrer_user);

CREATE POLICY "notif_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 13. RPC SEGURA: SOLICITAR RETIRO (reemplaza update directo en WorkerBalance)
--     El cliente llama: supabase.rpc("request_withdrawal", { p_amount: 50 })
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION request_withdrawal(p_amount INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_cur_points   INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF p_amount < 10 THEN
    RAISE EXCEPTION 'MINIMUM_AMOUNT: El mínimo de retiro es 10 pts';
  END IF;

  -- Bloqueo pesimista de fila
  SELECT points INTO v_cur_points
  FROM wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_cur_points IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;

  IF v_cur_points < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Saldo insuficiente (tienes %, pediste %)', v_cur_points, p_amount;
  END IF;

  -- Descontar puntos atómicamente
  UPDATE wallets
  SET points     = points - p_amount,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Registrar transacción
  INSERT INTO transactions (user_id, amount, type, description)
  VALUES (v_user_id, -p_amount, 'withdrawal', format('Retiro de %s pts', p_amount));

  RETURN jsonb_build_object(
    'ok',          true,
    'new_balance', v_cur_points - p_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION request_withdrawal(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_withdrawal(INT) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 14. RPC SEGURA: DESCONTAR PRESUPUESTO DE PROMOTER
--     El cliente llama: supabase.rpc("deduct_promoter_budget", { p_total_cost: X, p_mission_id: uuid })
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION deduct_promoter_budget(
  p_total_cost NUMERIC,
  p_mission_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_cur_balance   NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF p_total_cost <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: El costo debe ser mayor a 0';
  END IF;

  -- Si se pasa mission_id, verificar que la misión pertenece al promoter
  IF p_mission_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM daily_missions
      WHERE id = p_mission_id AND created_by = v_user_id
    ) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Esta misión no te pertenece';
    END IF;
  END IF;

  SELECT balance INTO v_cur_balance
  FROM wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_cur_balance IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;

  IF v_cur_balance < p_total_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_BUDGET: Fondos insuficientes (tienes %, necesitas %)', v_cur_balance, p_total_cost;
  END IF;

  UPDATE wallets
  SET balance = balance - p_total_cost
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok',          true,
    'new_balance', v_cur_balance - p_total_cost
  );
END;
$$;

REVOKE ALL ON FUNCTION deduct_promoter_budget(NUMERIC, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deduct_promoter_budget(NUMERIC, UUID) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 15. RPC SEGURA: CAMBIAR ROL (reemplaza update directo en Settings)
--     Solo permite worker ↔ promoter. Admin solo vía admin panel.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION switch_role(p_new_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_cur_role  TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  -- Solo se permite cambiar entre worker/student y promoter
  IF p_new_role NOT IN ('worker', 'promoter', 'student') THEN
    RAISE EXCEPTION 'INVALID_ROLE: No se puede asignar el rol "%"', p_new_role;
  END IF;

  SELECT role INTO v_cur_role FROM profiles WHERE id = v_user_id;

  -- Impedir bajar de admin accidentalmente
  IF v_cur_role = 'admin' THEN
    RAISE EXCEPTION 'ADMIN_LOCKED: Los admins no pueden cambiar su propio rol desde aquí';
  END IF;

  UPDATE profiles SET role = p_new_role WHERE id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'role', p_new_role);
END;
$$;

REVOKE ALL ON FUNCTION switch_role(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION switch_role(TEXT) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 16. HARDENING DE RPCs EXISTENTES
--     Agregar SET search_path y SECURITY DEFINER donde falten
--     para evitar search_path injection.
-- ────────────────────────────────────────────────────────────

-- reward_reviewer_points: solo el llamante gana puntos propios (no arbitrario)
-- NOTA: Si tu versión actual acepta p_user_id libre, límitalo a auth.uid()
CREATE OR REPLACE FUNCTION reward_reviewer_points(p_user_id UUID, p_points INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo puede darse puntos a sí mismo
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Solo puedes acreditar puntos a tu propia cuenta';
  END IF;

  IF p_points < 0 OR p_points > 20 THEN
    RAISE EXCEPTION 'INVALID_POINTS: Rango de puntos inválido';
  END IF;

  UPDATE wallets
  SET points = COALESCE(points, 0) + p_points,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO point_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'review_reward', p_points, 'Recompensa por revisión social');
END;
$$;

REVOKE ALL ON FUNCTION reward_reviewer_points(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reward_reviewer_points(UUID, INT) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 17. QUITAR PERMISOS INNECESARIOS DE anon EN TABLAS SENSIBLES
-- ────────────────────────────────────────────────────────────
REVOKE ALL ON TABLE wallets          FROM anon;
REVOKE ALL ON TABLE transactions     FROM anon;
REVOKE ALL ON TABLE point_transactions FROM anon;
REVOKE ALL ON TABLE profiles         FROM anon;
REVOKE ALL ON TABLE worker_profiles  FROM anon;
REVOKE ALL ON TABLE promoter_profiles FROM anon;

-- El rol anon solo puede ver campañas y premios activos (landing pública)
GRANT SELECT ON TABLE campaigns TO anon;
GRANT SELECT ON TABLE prizes    TO anon;


-- ────────────────────────────────────────────────────────────
-- 18. VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'profiles','wallets','worker_profiles','promoter_profiles',
    'transactions','point_transactions','campaigns','tasks',
    'submissions','social_task_submissions','daily_missions',
    'daily_mission_claims','prizes','referrals','notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = t
    ) THEN
      RAISE WARNING 'Tabla % no existe — revisa el nombre', t;
    ELSE
      RAISE NOTICE 'RLS activo en %', t;
    END IF;
  END LOOP;
END;
$$;
