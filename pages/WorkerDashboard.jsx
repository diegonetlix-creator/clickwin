import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame, Star, CheckCircle2, Clock, Trophy,
  Settings, ChevronRight, Crown, Loader2,
  Zap, Target, TrendingUp, Award
} from "lucide-react";
import { supabase } from "@/supabase";
import { useAuth } from "@/contexts/AuthContext";
import "@/styles/profile.css";

// ─── Level system ───────────────────────────────────────────────────────────
const LEVELS = [
  { level: 1,  minPts: 0,     title: "Novato",      color: "from-gray-400 to-gray-500" },
  { level: 2,  minPts: 200,   title: "Aprendiz",    color: "from-blue-400 to-blue-600" },
  { level: 3,  minPts: 500,   title: "Worker",      color: "from-indigo-400 to-purple-500" },
  { level: 4,  minPts: 1000,  title: "Pro",         color: "from-purple-400 to-pink-500" },
  { level: 5,  minPts: 2500,  title: "Elite",       color: "from-yellow-400 to-orange-500" },
  { level: 6,  minPts: 5000,  title: "Master",      color: "from-orange-400 to-red-500" },
  { level: 7,  minPts: 10000, title: "Legend",      color: "from-red-400 to-rose-600" },
];

function getLevel(pts) {
  let current = LEVELS[0];
  for (const lv of LEVELS) {
    if (pts >= lv.minPts) current = lv;
    else break;
  }
  const nextIdx = LEVELS.findIndex(l => l.level === current.level) + 1;
  const next    = LEVELS[nextIdx] || null;
  const progress = next
    ? Math.min(((pts - current.minPts) / (next.minPts - current.minPts)) * 100, 100)
    : 100;
  return { ...current, next, progress, ptsToNext: next ? next.minPts - pts : 0 };
}

// ─── Animated counter ───────────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    const start = 0;
    const end   = value;
    let frame;
    const step  = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const pct     = Math.min(elapsed / duration, 1);
      setDisplay(Math.round(start + (end - start) * pct));
      if (pct < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return display.toLocaleString();
}

// ─── Mini stat card ──────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="stat-pro-card">
      <div className={`stat-pro-icon ${bg} ${color}`}><Icon size={18} /></div>
      <span className="stat-pro-value"><AnimatedNumber value={value} /></span>
      <span className="stat-pro-label">{label}</span>
    </div>
  );
}

export default function WorkerDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]   = useState(null);
  const [points, setPoints]     = useState(0);
  const [stats, setStats]       = useState({ completed: 0, pending: 0, rewards: 0 });
  const [pendingReviews, setPendingReviews] = useState(0);
  const [todayTasks, setTodayTasks] = useState({ done: 0, goal: 10 });
  const [loading, setLoading]   = useState(true);
  const [streak, setStreak]     = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Balance from wallets
      const { data: wallet } = await supabase
        .from("wallets")
        .select("points")
        .eq("user_id", user.id)
        .maybeSingle();

      // Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(prof);
      // wallets.points es la fuente de verdad del saldo (todas las RPCs de
      // recompensa acreditan ahí). No usar profiles.points_balance.
      const pts = wallet?.points || 0;
      setPoints(pts);
      setStreak(prof?.current_streak || 0);

      // Real submission stats
      const { data: subs } = await supabase
        .from("social_task_submissions")
        .select("id, status, created_at")
        .eq("worker_id", user.id);

      const completedCount = (subs || []).filter(s => s.status === "approved").length;
      const pendingCount   = (subs || []).filter(s => s.status === "pending").length;

      // Today's completions
      const todayStr = new Date().toISOString().split("T")[0];
      const todayDone = (subs || []).filter(s => s.status === "approved" && s.created_at?.startsWith(todayStr)).length;

      setStats({ completed: completedCount, pending: pendingCount, rewards: Math.floor(completedCount / 5) });
      setTodayTasks({ done: todayDone, goal: 10 });

      // Pending social reviews
      const { data: pend } = await supabase.rpc("get_pending_reviews").catch(() => ({ data: [] }));
      setPendingReviews(pend?.length || 0);

    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Sincronizando Perfil</p>
    </div>
  );

  const levelInfo      = getLevel(points);
  const dailyProgress  = Math.min((todayTasks.done / todayTasks.goal) * 100, 100);

  return (
    <div className="profile-pro-page animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── HEADER ── */}
      <header className="profile-header">
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar">{user.email?.charAt(0).toUpperCase()}</div>
          <div className={`profile-level-badge bg-gradient-to-r ${levelInfo.color}`}>
            Nv. {levelInfo.level}
          </div>
        </div>

        <div className="profile-info">
          <h1>{profile?.nickname || user.email?.split("@")[0]}</h1>
          <div className="profile-stats-summary">
            <span className="point-pill">
              <Zap size={13} fill="currentColor" />
              <AnimatedNumber value={points} /> pts
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${levelInfo.color} text-black`}>
              {levelInfo.title}
            </span>
          </div>
        </div>

        <button className="ml-auto p-2 text-gray-500" onClick={() => navigate("/settings")}>
          <Settings size={20} />
        </button>
      </header>

      {/* ── LEVEL PROGRESS ── */}
      <div className="daily-progress-box">
        <div className="progress-header">
          <h3 className="flex items-center gap-2">
            <Trophy size={14} className="text-yellow-400" />
            Nivel {levelInfo.level} — {levelInfo.title}
          </h3>
          {levelInfo.next ? (
            <span className="text-yellow-400">{levelInfo.ptsToNext.toLocaleString()} pts para {levelInfo.next.title}</span>
          ) : (
            <span className="text-yellow-400">¡Nivel máximo! 🏆</span>
          )}
        </div>
        <div className="ui-progress-container">
          <div
            className={`ui-progress-fill bg-gradient-to-r ${levelInfo.color}`}
            style={{ width: `${levelInfo.progress}%`, transition: "width 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
          />
        </div>
        <p className="motivational-msg" style={{ marginTop: "6px" }}>
          {levelInfo.progress >= 90 ? "¡Casi lo tienes! Estás a un paso del siguiente nivel 🚀" :
           levelInfo.progress >= 50 ? "¡Buen ritmo! Sigue completando tareas 💪" :
           "Completa tareas para subir de nivel y desbloquear recompensas ✨"}
        </p>
      </div>

      {/* ── DAILY GOAL PROGRESS ── */}
      <div className="daily-progress-box mt-3">
        <div className="progress-header">
          <h3 className="flex items-center gap-2">
            <Target size={14} className="text-indigo-400" />
            Meta diaria
          </h3>
          <span>
            <span className="text-indigo-400 font-black">{todayTasks.done}</span>
            <span className="text-white/30">/{todayTasks.goal} tareas</span>
          </span>
        </div>
        <div className="ui-progress-container">
          <div
            className="ui-progress-fill bg-gradient-to-r from-indigo-500 to-purple-500"
            style={{ width: `${dailyProgress}%`, transition: "width 1s ease-out" }}
          />
        </div>
        <p className="motivational-msg">
          {dailyProgress >= 100 ? "✅ ¡Meta completada! Reclama tu bono en Misiones." :
           `¡Faltan ${todayTasks.goal - todayTasks.done} tareas para tu recompensa diaria! 🔥`}
        </p>
      </div>

      {/* ── STATS GRID ── */}
      <div className="stats-pro-grid">
        <StatCard icon={CheckCircle2} label="Completadas"   value={stats.completed} color="text-green-500"  bg="bg-green-500/10" />
        <StatCard icon={Clock}        label="Pendientes"     value={stats.pending}   color="text-purple-500" bg="bg-purple-500/10" />
        <StatCard icon={Award}        label="Recompensas"    value={stats.rewards}   color="text-yellow-500" bg="bg-yellow-500/10" />
      </div>

      {/* ── QUICK ACTIONS ── */}
      {role === "worker" && (
        <div className="mt-6 px-1 space-y-3">
          <h3 className="text-xs font-black text-white/30 uppercase tracking-widest mb-3">Acciones rápidas</h3>

          <div
            onClick={() => navigate("/feed")}
            className="glass p-4 rounded-[1.5rem] flex justify-between items-center cursor-pointer hover:scale-[1.02] hover:bg-white/5 transition-all active:scale-95 border border-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <TrendingUp size={22} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Explorar Tareas</h4>
                <p className="text-gray-500 text-[11px]">Feed de tareas disponibles</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-500" />
          </div>

          <div
            onClick={() => navigate("/social-review")}
            className="glass p-4 rounded-[1.5rem] flex justify-between items-center cursor-pointer hover:scale-[1.02] hover:bg-white/5 transition-all active:scale-95 border border-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                  Revisión Social
                  {pendingReviews > 0 && (
                    <span className="inline-flex items-center justify-center bg-yellow-400 text-black text-[9px] font-black h-4 px-1.5 rounded-full">
                      {pendingReviews}
                    </span>
                  )}
                </h4>
                <p className="text-gray-500 text-[11px]">+5 pts por revisión</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-indigo-400 text-xs font-black">+5 pts</div>
              <ChevronRight size={16} className="text-gray-500 mt-1 ml-auto" />
            </div>
          </div>

          <div
            onClick={() => navigate("/missions")}
            className="glass p-4 rounded-[1.5rem] flex justify-between items-center cursor-pointer hover:scale-[1.02] hover:bg-white/5 transition-all active:scale-95 border border-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                <Flame size={22} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Misiones Diarias</h4>
                <p className="text-gray-500 text-[11px]">Racha: {streak} días 🔥</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-500" />
          </div>
        </div>
      )}

      {/* ── STREAK ── */}
      <div className="streak-box-pro mt-6">
        <div className="streak-info">
          <Flame size={20} className="text-orange-500" fill="currentColor" />
          <h4>Racha actual</h4>
        </div>
        <div className="streak-badge">
          {streak} día{streak !== 1 ? "s" : ""} · {streak >= 7 ? "¡Increíble! 🔥" : streak >= 3 ? "¡Sigue así! 💪" : "¡Empieza tu racha!"}
        </div>
      </div>

      {/* ── MOTIVATIONAL BANNER ── */}
      <div className="mt-6 p-6 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] text-white relative overflow-hidden group">
        <Crown className="absolute top-0 right-0 p-4 w-20 h-20 opacity-20" />
        <h4 className="font-black text-lg mb-2 relative">
          {levelInfo.progress >= 90 ? "🏆 ¡Subida de nivel inminente!" : "¡Estás subiendo de nivel!"}
        </h4>
        <p className="text-sm text-indigo-100 font-medium leading-relaxed relative">
          {levelInfo.next
            ? `Te faltan ${levelInfo.ptsToNext.toLocaleString()} pts para ser ${levelInfo.next.title}. ¡Tú puedes! 🚀`
            : "Eres un Legend. Sigue siendo un referente. 👑"}
        </p>
      </div>
    </div>
  );
}
