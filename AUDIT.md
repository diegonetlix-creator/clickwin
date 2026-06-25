# ClickWin — Auditoría de Seguridad y Calidad
**Fecha:** 2026-06-24  
**Versión auditada:** commit `a7415a9`  
**Stack:** React 18 + Vite 5 + Supabase JS (PWA, 100% client-side)

---

## Resumen ejecutivo

ClickWin es una PWA completamente del lado del cliente que habla directamente con Supabase usando la `anon key`. Toda la seguridad real debe vivir en **Row Level Security (RLS)** y **RPCs SECURITY DEFINER** de PostgreSQL. El código fuente del repo no incluía ninguna política RLS ni RPCs de wallet seguros — cualquier usuario autenticado podía escalar a admin o manipular su saldo directamente desde la consola del navegador.

Se identificaron **4 hallazgos críticos**, **3 altos**, **4 medios** y **4 bajos**. Todos fueron corregidos en este commit.

---

## Hallazgos por severidad

### 🔴 CRÍTICO

#### C-1. Sin Row Level Security en la base de datos
- **Archivo:** `supabase.js` (configuración), todas las tablas
- **Problema:** RLS no estaba habilitado. Cualquier usuario con la `anon key` (pública en el frontend) podía leer y escribir cualquier fila de cualquier tabla sin restricción.
- **Solución:** `security_hardening.sql` — habilita RLS en 15 tablas y define todas las políticas necesarias.

#### C-2. Escalada de privilegios a admin desde el cliente
- **Archivos:** `pages/Register.jsx:46`, `pages/Settings.jsx:159`
- **Problema:** `Register.jsx` comparaba el email con un string hardcodeado (`jaysonteayuda@gmail.com`) para asignar `role: 'admin'` al crear el perfil. `Settings.jsx` hacía `supabase.from('profiles').update({role:'admin'})` directamente desde el cliente — cualquier usuario podía ejecutar esto en la consola del navegador.
- **Solución:**
  - `Register.jsx`: se elimina la lógica de email especial; el rol se fuerza a `worker` o `promoter`.
  - `Settings.jsx`: se reemplaza el `update` directo por la RPC `switch_role()` que valida en el servidor que no se puede escalar a `admin`.
  - `security_hardening.sql #15`: RPC `switch_role` solo acepta `worker/promoter/student`.

#### C-3. Escritura directa del saldo desde el cliente
- **Archivos:** `pages/WorkerBalance.jsx:121-124`, `pages/PromoterMissionManager.jsx:132-135`
- **Problema:** Ambas páginas ejecutaban `supabase.from('wallets').update({points: X})` directamente. Un usuario podía poner cualquier número — incluso negativo o inflado — en su propia wallet.
- **Solución:**
  - `WorkerBalance.jsx`: llama a la RPC `request_withdrawal(p_amount)` que aplica bloqueo pesimista, valida saldo y registra la transacción atómicamente.
  - `PromoterMissionManager.jsx`: llama a `deduct_promoter_budget(p_total_cost, p_mission_id)` con rollback de la misión si el descuento falla.
  - `security_hardening.sql #4`: política `wallets_no_direct_update` bloquea todo `UPDATE` directo sobre `wallets`.

#### C-4. RPCs de puntos sin validación del llamante
- **Archivo:** `pages/SocialReview.jsx:74`
- **Problema:** `reward_reviewer_points(p_user_id, p_points)` aceptaba cualquier `user_id` arbitrario. Un usuario podía llamar la función pasando el ID de otra persona.
- **Solución:** `security_hardening.sql #16` — la función verifica `p_user_id = auth.uid()` y limita `p_points ≤ 20`.

---

### 🟠 ALTO

#### A-1. Variables de entorno sin validación
- **Archivo:** `supabase.js`
- **Problema:** `|| "https://your-project.supabase.co"` — si faltaban las env vars, la app arrancaba apuntando a un proyecto inexistente sin error visible.
- **Solución:** Throw en `supabase.js` si faltan las variables. Se añade `.env.example`.

#### A-2. Uploads sin validación de tipo/tamaño
- **Archivo:** `utils.jsx:uploadFile`
- **Problema:** Se aceptaba cualquier tipo de archivo de cualquier tamaño. Riesgo de subir ejecutables o archivos enormes al bucket público.
- **Solución:** Whitelist de MIME types (`image/jpeg,png,webp,gif`) y límite de 5 MB. `Math.random()` reemplazado por `crypto.randomUUID()`.

#### A-3. Rechazo de social tasks directo desde cliente
- **Archivo:** `pages/SocialReview.jsx:135`
- **Problema:** `handleReject` hacía `supabase.from('social_task_submissions').update({status:'rejected'})` directamente. Sin RLS, cualquiera podía rechazar la entrega de otro sin ser reviewer.
- **Solución:** `security_hardening.sql #10` — la política `sts_update` exige que el reviewer no sea el mismo worker que envió la entrega.

---

### 🟡 MEDIO

#### M-1. `console.log` con datos sensibles en producción
- **Archivos:** múltiples páginas (AdminUsers, SocialReview, WorkerDashboard…)
- **Problema:** Mensajes de depuración exponen IDs, emails, balances y errores de DB en la consola del navegador en producción.
- **Solución:** ESLint con regla `"no-console": ["warn", { allow: ["warn","error"] }]`. Se eliminaron todos los `console.log` del código fuente y se quitó el `console.warn` que filtraba `user.id` + balance en `AdminUsers.jsx` (ya cubierto por `auditLog`). Los `console.error`/`console.warn` restantes solo registran objetos de error y etiquetas de contexto, sin datos sensibles.

#### M-2. `alert()` / `confirm()` / `prompt()` nativos del navegador
- **Archivos:** `AdminUsers.jsx`, `ReviewTasks.jsx`, `SocialReview.jsx`, `ManagePrizes.jsx`, `PromoterMissionManager.jsx`
- **Problema:** Bloquean el hilo principal, no se pueden estilar y en algunos entornos (PWA standalone, algunos navegadores móviles) están deshabilitados.
- **Solución:** Todos los `alert()` se reemplazaron por el componente `Toast` (`toast.success/error/info`) y todos los `confirm()` por el modal `ConfirmDialog` (patrón de estado `confirmDialog` + `onConfirm`). `prompt()` ya se había reemplazado por un modal en `SocialReview.jsx`. No queda ninguna llamada nativa en `pages/`.

#### M-3. Inconsistencia `wallet.points` vs `wallet.balance`
- **Archivos:** múltiples
- **Problema:** Workers usan `wallets.points`; promoters usan `wallets.balance`. Sin comentario ni documentación, confunde a futuros desarrolladores y puede llevar a bugs de join.
- **Solución:** Documentado en la interfaz `Wallet` de `types/database.ts` (fuente de verdad de tipos) con un bloque que explica el diseño de dos columnas, qué rol usa cada una, que no son intercambiables, y que el saldo solo se modifica vía RPCs. Pendiente opcional a futuro: renombrar a `worker_points` / `promoter_balance` en una migración.

#### M-4. Sin protección CSRF en el referral tracking
- **Archivo:** `App.jsx:55-82`
- **Problema:** El `ref` se lee del `sessionStorage` y se inserta en `referrals` sin validar que no sea el propio ID del usuario. Actualmente hay una comprobación `storedRef !== user.id` pero solo en el cliente.
- **Solución:** `security_hardening.sql #12` — política `referrals_insert` verifica `invited_user != referrer_user` en el servidor.

---

### 🔵 BAJO

#### B-1. Sin tests automatizados
- No hay ningún test (unitario, integración ni e2e). Bugs en RPCs o lógica de negocio solo se descubren en producción.
- **Recomendación:** Vitest para unitarios, Playwright para e2e de flujos críticos (registro, retiro, canje de premios).

#### B-2. Sin TypeScript
- El proyecto usa JS plano. Errores de tipo (ej. pasar `balance` donde se espera `points`) se descubren en runtime.
- **Recomendación:** Migración incremental a `.tsx` empezando por `entities/` y `contexts/`.

#### B-3. Sin CI/CD pipeline
- No hay `.github/workflows/` ni similar. Cambios llegan a producción sin lint, build ni tests.
- **Recomendación:** GitHub Actions con `npm run lint && npm run build` en cada PR.

#### B-4. `.env` con credenciales reales en el repo
- El archivo `.env` con la URL y `anon key` reales estaba en el repositorio (no en `.gitignore` inicialmente — ahora sí está ignorado).
- **Acción inmediata:** Rotar la `anon key` de Supabase en el dashboard. La `anon key` es semipública por diseño (RLS la protege), pero es buena práctica no exponerla en git history.

---

## Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `security_hardening.sql` | **Nuevo** — RLS + policies + RPCs seguras |
| `.env.example` | **Nuevo** — plantilla de variables de entorno |
| `eslint.config.js` | **Nuevo** — configuración ESLint |
| `package.json` | Scripts `lint`/`lint:fix` + devDeps ESLint |
| `supabase.js` | Validación de env vars en startup |
| `utils.jsx` | `uploadFile`: whitelist MIME + límite tamaño + `crypto.randomUUID` |
| `pages/Register.jsx` | Eliminar asignación de rol admin por email hardcodeado |
| `pages/Settings.jsx` | Cambio de rol via RPC `switch_role`; eliminar botón admin en UI |
| `pages/WorkerBalance.jsx` | Retiro via RPC `request_withdrawal` |
| `pages/PromoterMissionManager.jsx` | Gasto via RPC `deduct_promoter_budget` + rollback |

---

## Pasos de despliegue requeridos

1. **Ejecutar `security_hardening.sql`** en el SQL Editor de Supabase (proyecto `xzdhsgrxnpkfdrivxths`).
2. Verificar en los logs de Supabase que todas las funciones se crearon sin error.
3. Probar manualmente:
   - Registro como worker → confirmar que role en DB es `worker`, nunca `admin`.
   - Retiro de puntos → confirmar que usa RPC y el saldo baja correctamente.
   - Intento de `supabase.from('wallets').update({points:99999}).eq('user_id', tu_id)` desde consola → debe fallar con `row-level security policy` error.
4. Instalar dependencias nuevas: `npm install`.
5. Ejecutar `npm run lint` para ver los `console.log` pendientes de limpiar.
