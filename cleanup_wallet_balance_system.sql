-- ════════════════════════════════════════════════════════════════════════
-- CLEANUP del sistema de puntos/saldos: overloads y columnas fantasma
-- ════════════════════════════════════════════════════════════════════════
-- Tras corregir las 3 RPCs que acreditaban en columnas equivocadas
-- (grant_social_task_reward, create_social_task, claim_mission_reward), se
-- elimina el material muerto que mantenía vivo el riesgo de drift / reintroducción.
--
-- Fuentes de verdad reales del saldo en `wallets`:
--   • wallets.points  → puntos del worker  (UI: WorkerDashboard/Balance/Prizes)
--   • wallets.balance → dinero del promotor (UI: PromoterMissionManager/AdminUsers)
-- ════════════════════════════════════════════════════════════════════════

-- 1) Overloads legacy que el frontend NO llama (drift risk). El frontend usa
--    grant_task_reward(uuid) y create_social_task(8 args). Verificado: ninguna
--    función interna ni el frontend invoca estas firmas.
DROP FUNCTION IF EXISTS public.grant_task_reward(uuid, integer, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.create_social_task(uuid, text, text, integer, integer);

-- 2) Columna fantasma profiles.points_balance (en 0 para todos; sin lectores ni
--    escritores tras los fixes). Eliminarla hace imposible reintroducir el bug.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS points_balance;

-- 3) Columnas de saldo muertas en wallets:
--    • pts   → 0 datos; su único escritor (claim_mission_reward) ya usa points.
--    • money → abandonada (~2.7 residual), sin escritores. Duplicado de balance.
ALTER TABLE public.wallets DROP COLUMN IF EXISTS pts;
ALTER TABLE public.wallets DROP COLUMN IF EXISTS money;

-- ── Pendiente (decisión arquitectónica, NO incluida aquí) ──────────────────
-- Existen DOS tablas-ledger en uso: `transactions` (historial que lee la UI de
-- WorkerBalance) y `point_transactions` (widgets "ganado hoy"). Las RPCs están
-- repartidas entre ambas. Unificarlas en un solo ledger requiere migración de
-- datos y decisión de producto; se deja documentado, sin tocar.
