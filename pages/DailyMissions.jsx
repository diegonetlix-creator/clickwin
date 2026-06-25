import { useState, useEffect } from "react";
import { Zap, Trophy, Target, Star, CheckCircle, Clock, Gift, Flame, ChevronRight, Calendar } from "lucide-react";
import { formatPoints } from "@/utils";
import User from "@/entities/User";
import { MISSION_TEMPLATES } from "@/constants/missions";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/supabase";
import { toast } from "@/components/Toast";

// ─── Mission progress skeleton ────────────────────────────────────────────────
function MissionSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-white/5" />
        <div className="w-16 h-6 rounded-full bg-white/5" />
      </div>
      <div className="h-4 bg-white/5 rounded-full w-3/4 mb-2" />
      <div className="h-3 bg-white/5 rounded-full w-full mb-6" />
      <div className="h-2 bg-white/5 rounded-full w-full" />
    </div>
  );
}

export default function DailyMissions() {
  const [user, setUser]           = useState(null);
  const [streak, setStreak]       = useState(0);
  const [missions, setMissions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [promoterName, setPromoterName] = useState("");
  const [claiming, setClaiming]   = useState(null);
  const [totalEarned, setTotalEarned] = useState(0);

  const navigate                  = useNavigate();
  const [searchParams]            = useSearchParams();
  const promoterId                = searchParams.get("promoterId");
  const type                      = searchParams.get("type");

  useEffect(() => { loadData(); }, [promoterId, type]);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = await User.me();
      if (!u) { setLoading(false); return; }
      setUser(u);

      // Profile for streak
      const { data: prof } = await supabase
        .from("profiles")
        .select("current_streak")
        .eq("id", u.id)
        .maybeSingle();

      setStreak(prof?.current_streak || 0);

      // Promoter name if needed
      if (promoterId) {
        const { data: pd } = await supabase
          .from("profiles")
          .select("name, full_name, email")
          .eq("id", promoterId)
          .maybeSingle();
        if (pd) setPromoterName(pd.name || pd.full_name || "del Cliente");
      }

      // Active missions
      let query = supabase.from("daily_missions").select("*").eq("status", "active");
      if (promoterId) query = query.eq("created_by", promoterId);
      if (type)       query = query.eq("type", type);

      const { data: dbMissions, error: missionsError } = await query;
      if (missionsError) throw missionsError;

      // Today's UTC date string
      const todayStr = new Date().toISOString().split("T")[0];

      // Submissions today
      const { data: subs } = await supabase
        .from("submissions")
        .select("id, task_type, status, created_at")
        .eq("worker_id", u.id)
        .gte("created_at", `${todayStr}T00:00:00`);

      // Claims today
      const { data: claims } = await supabase
        .from("daily_mission_claims")
        .select("mission_id")
        .eq("user_id", u.id)
        .eq("claim_date", todayStr);

      // Social task submissions today (for review-based missions)
      const { data: socialSubs } = await supabase
        .from("social_task_submissions")
        .select("id, status, created_at")
        .eq("worker_id", u.id)
        .gte("created_at", `${todayStr}T00:00:00`);

      // Merge both submission types
      const allSubs = [...(subs || []), ...(socialSubs || [])];

      // Map missions with progress
      const updatedMissions = (dbMissions || []).map(m => {
        const template = MISSION_TEMPLATES.find(t => t.id === m.type) || {
          icon: Target,
          color: "from-blue-400 to-indigo-500"
        };
        if (m.type === "weekend") {
          template.icon = Calendar;
          template.color = "from-green-500 to-emerald-600";
        }

        let progress = 0;
        if (m.type === "madrugador") {
          progress = allSubs.filter(s => new Date(s.created_at).getHours() < 10).length;
        } else if (m.type === "like") {
          progress = allSubs.filter(s => s.task_type === "like" && s.status === "approved").length;
        } else if (m.type === "social" || m.type === "socializador") {
          progress = allSubs.filter(s => ["comment", "feedback"].includes(s.task_type) && s.status === "approved").length;
        } else if (m.type === "embajador") {
          progress = allSubs.filter(s => s.task_type === "share" && s.status === "approved").length;
        } else {
          progress = allSubs.filter(s => s.status === "approved").length;
        }

        const isClaimed   = (claims || []).some(c => c.mission_id === m.id);
        const isCompleted = progress >= m.required_actions;

        return {
          ...m,
          ...template,
          total:  m.required_actions,
          reward: m.reward_pts,
          progress,
          status: isClaimed ? "claimed" : isCompleted ? "completed" : "in-progress",
        };
      });

      setMissions(updatedMissions);

      // Total earned today from ledger
      const { data: ledger } = await supabase
        .from("point_transactions")
        .select("amount")
        .eq("user_id", u.id)
        .in("type", ["task_reward", "review_reward"])
        .gte("created_at", `${todayStr}T00:00:00`);
      setTotalEarned((ledger || []).reduce((s, t) => s + (t.amount || 0), 0));

    } catch (err) {
      console.error("Error cargando misiones:", err);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (missionId) => {
    setClaiming(missionId);
    try {
      const { error } = await supabase.rpc("claim_mission_reward", {
        p_user_id: user.id,
        p_mission_id: missionId,
      });
      if (error) throw error;

      // Optimistic update
      setMissions(prev => prev.map(m =>
        m.id === missionId ? { ...m, status: "claimed" } : m
      ));
    } catch (err) {
      console.error("Error al reclamar misión:", err);
      toast.error("Error: " + err.message);
    } finally {
      setClaiming(null);
    }
  };

  const claimedCount   = missions.filter(m => m.status === "claimed").length;
  const completedCount = missions.filter(m => m.status === "completed").length;
  const inProgressCount = missions.filter(m => m.status === "in-progress").length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* ── HEADER ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-[2.5rem] p-8 shadow-2xl">
        <div className="absolute top-0 right-0 p-8">
          <div className="flex flex-col items-center">
            <div className="relative">
              <Flame className="w-16 h-16 text-orange-500 animate-pulse" />
              <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full" />
            </div>
            <div className="mt-2 text-center">
              <span className="block text-3xl font-black text-white">{streak}</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-orange-500">Días de racha</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-400 px-4 py-1.5 rounded-full text-xs font-bold mb-4 border border-yellow-500/10">
            <Star className="w-4 h-4" />
            {promoterId ? "Misiones Especiales" : "Misiones Diarias"}
          </div>
          <h1 className="text-4xl font-black text-white leading-tight">
            {promoterId ? (
              <>Misiones <br /> {promoterName}</>
            ) : (
              <>Gana recompensas <br /> extras cada día</>
            )}
          </h1>
          <p className="text-gray-400 mt-4 text-sm leading-relaxed">
            {promoterId
              ? `Completa los desafíos exclusivos diseñados por ${promoterName}.`
              : "Completa desafíos diarios para obtener puntos extra y mantener tu racha."}
          </p>

          {/* Today's summary */}
          {totalEarned > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-400/10 text-green-400 px-4 py-2 rounded-xl text-sm font-bold border border-green-400/20">
              <Zap className="w-4 h-4" fill="currentColor" />
              +{totalEarned.toLocaleString()} pts ganados hoy
            </div>
          )}
        </div>
      </div>

      {/* ── PROGRESS SUMMARY ── */}
      {missions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Reclamadas", value: claimedCount, color: "text-green-400 bg-green-400/10 border-green-400/20" },
            { label: "Completadas", value: completedCount, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
            { label: "En progreso", value: inProgressCount, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 border text-center ${s.color}`}>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── MISSIONS GRID ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <MissionSkeleton key={i} />)}
        </div>
      ) : missions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-bold">No hay misiones activas</p>
          <p className="text-sm mt-1">Vuelve mañana para nuevos desafíos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {missions.map(mission => {
            const pct = Math.min((mission.progress / mission.total) * 100, 100);
            return (
              <div
                key={mission.id}
                className={`group relative bg-gray-900 border rounded-3xl p-6 transition-all hover:border-gray-700 hover:bg-gray-800/50 ${
                  mission.status === "claimed" ? "border-green-500/20 bg-green-500/5" :
                  mission.status === "completed" ? "border-yellow-500/30 bg-yellow-500/5" :
                  "border-gray-800"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mission.color} flex items-center justify-center shadow-lg text-white`}>
                    <mission.icon className="w-6 h-6" />
                  </div>
                  {mission.status === "claimed" ? (
                    <div className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3" /> Reclamada
                    </div>
                  ) : (
                    <div className="text-yellow-500 font-black text-lg">+{formatPoints(mission.reward)}</div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">{mission.title}</h3>
                <p className="text-xs text-gray-500 mt-1 mb-5 leading-relaxed">{mission.description}</p>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-gray-500">Progreso</span>
                    <span className={pct >= 100 ? "text-green-400" : "text-white"}>
                      {Math.min(mission.progress, mission.total)} / {mission.total}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${mission.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Action button */}
                {mission.status === "completed" && (
                  <button
                    onClick={() => claimReward(mission.id)}
                    disabled={claiming === mission.id}
                    className="w-full mt-5 py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/25 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                  >
                    {claiming === mission.id ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Gift className="w-4 h-4" /> Reclamar Recompensa</>
                    )}
                  </button>
                )}

                {mission.status === "claimed" && (
                  <button disabled className="w-full mt-5 py-3 bg-green-500/10 text-green-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed border border-green-500/20">
                    <CheckCircle className="w-4 h-4" /> ¡Recompensa reclamada!
                  </button>
                )}

                {mission.status === "in-progress" && (
                  <button
                    onClick={() => navigate("/tasks")}
                    className="w-full mt-5 py-3 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    Ir a completar
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── WEEKEND BONUS ── */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Bono de Fin de Semana</h3>
            <p className="text-blue-100 text-sm mt-1">Completa todas tus misiones el sábado y domingo para un multiplicador x2.</p>
          </div>
        </div>
        <div className="hidden md:block">
          <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform">
            Ver Detalles
          </button>
        </div>
      </div>
    </div>
  );
}

