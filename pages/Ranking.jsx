import { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { Trophy, Flame, Target, Star, Medal, Crown, TrendingUp, Users } from "lucide-react";
import { formatPoints, getLevel } from "@/utils";

const LEVEL_COLORS = [
  "from-gray-400 to-gray-500",
  "from-green-400 to-emerald-500",
  "from-blue-400 to-cyan-500",
  "from-purple-400 to-violet-500",
  "from-yellow-400 to-orange-500",
  "from-red-400 to-pink-500",
];

export default function Ranking() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("global");

  useEffect(() => {
    const field = tab === "weekly" ? "-weekly_points" : "-stars";
    
    // If global, we might want to fetch from 'profiles' or join
    // For now, let's assume we want to keep it simple and use WorkerProfile if it has stars
    // OR fetch from 'profiles' directly
    const loadRanking = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(tab === "weekly" ? "worker_profiles" : "profiles")
          .select("id, name, display_name, stars, total_points, weekly_points, level, current_streak, country")
          .order(tab === "weekly" ? "weekly_points" : "stars", { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setWorkers(data || []);
      } catch (err) {
        console.error("Ranking error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRanking();
  }, [tab]);

  const top3 = workers.slice(0, 3);
  const rest = workers.slice(3);

  const getPoints = (w) => tab === "weekly" ? (w.weekly_points || 0) : (w.stars || 0);
  const getPointsLabel = () => tab === "weekly" ? "pts" : "⭐";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" /> Ranking Global
        </h1>
        <p className="text-gray-400 mt-2">Los mejores usuarios de la plataforma</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-1 flex gap-1">
          {[
            { id: "global", label: "🌍 Global" },
            { id: "weekly", label: "📅 Semanal" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div className="bg-gradient-to-b from-yellow-400/10 to-transparent border border-yellow-400/20 rounded-3xl p-8">
              <div className="flex items-end justify-center gap-4">
                {/* 2nd */}
                {top3[1] && (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center text-2xl font-black text-gray-300 mb-2">
                      {top3[1].display_name?.charAt(0) || "?"}
                    </div>
                    <Medal className="w-5 h-5 text-gray-400 mb-1" />
                    <div className="text-sm font-bold text-gray-300">{top3[1].display_name || "Usuario"}</div>
                    <div className="text-xs text-gray-500">{getPoints(top3[1])?.toLocaleString()} {getPointsLabel()}</div>
                    <div className="bg-gray-700 rounded-t-xl w-20 h-16 mt-3 flex items-center justify-center text-gray-400 font-black text-xl">#2</div>
                  </div>
                )}
                {/* 1st */}
                {top3[0] && (
                  <div className="flex flex-col items-center">
                    <Crown className="w-6 h-6 text-yellow-400 mb-1" />
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-yellow-400 flex items-center justify-center text-3xl font-black text-black mb-2">
                      {(top3[0].display_name || top3[0].name)?.charAt(0) || "?"}
                    </div>
                    <div className="text-sm font-bold text-yellow-400">{top3[0].display_name || top3[0].name || "Usuario"}</div>
                    <div className="text-xs text-yellow-400/70">{getPoints(top3[0])?.toLocaleString()} {getPointsLabel()}</div>
                    <div className="bg-gradient-to-t from-yellow-400 to-yellow-500 rounded-t-xl w-20 h-24 mt-3 flex items-center justify-center text-black font-black text-xl">#1</div>
                  </div>
                )}
                {/* 3rd */}
                {top3[2] && (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-orange-900/50 border-2 border-orange-600 flex items-center justify-center text-2xl font-black text-orange-400 mb-2">
                      {(top3[2].display_name || top3[2].name)?.charAt(0) || "?"}
                    </div>
                    <Medal className="w-5 h-5 text-orange-400 mb-1" />
                    <div className="text-sm font-bold text-orange-300">{top3[2].display_name || top3[2].name || "Usuario"}</div>
                    <div className="text-xs text-gray-500">{getPoints(top3[2])?.toLocaleString()} {getPointsLabel()}</div>
                    <div className="bg-orange-900/50 rounded-t-xl w-20 h-12 mt-3 flex items-center justify-center text-orange-400 font-black text-xl">#3</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800 text-xs text-gray-500 font-semibold uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Usuario</div>
              <div className="col-span-2 text-center">Nivel</div>
              <div className="col-span-2 text-center">Racha</div>
              <div className="col-span-2 text-right">Puntos</div>
            </div>
            {rest.length === 0 && workers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No hay usuarios en el ranking aún</p>
              </div>
            ) : (
              (rest.length > 0 ? rest : workers).map((w, i) => {
                const pos = rest.length > 0 ? i + 4 : i + 1;
                const levelColor = LEVEL_COLORS[Math.min(Math.floor((w.level || 1) / 5), LEVEL_COLORS.length - 1)];
                return (
                  <div key={w.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors items-center">
                    <div className="col-span-1 text-gray-500 font-bold text-sm">#{pos}</div>
                    <div className="col-span-5 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${levelColor} flex items-center justify-center font-bold text-sm text-white flex-shrink-0`}>
                        {(w.display_name || w.name)?.charAt(0) || "?"}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{w.display_name || w.name || "Usuario"}</div>
                        <div className="text-xs text-gray-500">{w.country || "—"}</div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={`inline-block bg-gradient-to-r ${levelColor} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
                        Nv.{getLevel(w.stars || 0)}
                      </span>
                    </div>
                    <div className="col-span-2 text-center flex items-center justify-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span className="text-sm font-medium text-orange-400">{w.current_streak || 0}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="text-yellow-400 font-bold text-sm">{getPoints(w)?.toLocaleString() || 0} {getPointsLabel()}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
