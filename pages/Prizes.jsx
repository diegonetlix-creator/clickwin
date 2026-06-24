import { useState, useEffect, useMemo } from "react";
import { 
  Trophy, Flame, Target, Star, Medal, Crown, TrendingUp, Users, 
  Gift, ShoppingBag, CreditCard, Laptop, ShieldCheck, Zap, 
  ArrowRight, Coins, Wallet, Sparkles, Check, Globe, Lock, Clock, Filter, X
} from "lucide-react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatPoints, formatCurrency } from "@/utils";
import { toast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

const LEVEL_COLORS = [
  "from-gray-400 to-gray-500",
  "from-green-400 to-emerald-500",
  "from-blue-400 to-cyan-500",
  "from-purple-400 to-violet-500",
  "from-yellow-400 to-orange-500",
  "from-red-400 to-pink-500",
];

export default function Prizes() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = searchParams.get("client");
  
  const [points, setPoints] = useState(0);
  const [prizes, setPrizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("shop");
  const [rankingTab, setRankingTab] = useState("global");
  const [rankingUsers, setRankingUsers] = useState([]);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [profile, setProfile] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    if (user) {
      loadUserData();
      loadAvailablePrizes();
    }
  }, [user, clientId]);

  useEffect(() => {
    if (user && activeTab === "ranking") {
      loadRanking();
    }
  }, [user, activeTab, rankingTab]);

  const loadUserData = async () => {
    try {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("points")
        .eq("user_id", user.id)
        .single();
      setPoints(wallet?.points || 0);

      const { data: prof } = await supabase
        .from("worker_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(prof);
    } catch (err) {
      console.error("Error loading user data:", err);
    }
  };

  const loadAvailablePrizes = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("prizes")
        .select("*")
        .eq("is_active", true);

      // Si hay clientId, filtramos por ese cliente o premios globales
      if (clientId) {
        query = query.or(`created_by.eq.${clientId},is_global.eq.true`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setPrizes(data || []);
    } catch (err) {
      console.error("Prizes load error:", err);
      setError("No se pudieron cargar los premios");
      toast.error("Error al cargar premios");
    } finally {
      setLoading(false);
    }
  };

  const loadRanking = async () => {
    try {
      const field = rankingTab === "weekly" ? "weekly_points" : "total_points";
      const { data, error: rankError } = await supabase
        .from("worker_profiles")
        .select("*")
        .order(field, { ascending: false })
        .limit(50);
      if (rankError) throw rankError;
      setRankingUsers(data || []);
    } catch (err) {
      console.error("Ranking error:", err);
    }
  };

  const handleRedeem = (prize) => {
    if (points < prize.cost) { toast.error("Saldo insuficiente"); return; }
    setConfirmDialog({
      message: `¿Canjear "${prize.title}" por ${prize.cost} puntos? Esta acción no se puede deshacer.`,
      onConfirm: () => doRedeem(prize),
    });
  };

  const doRedeem = async (prize) => {
    setIsRedeeming(true);
    try {
      const { error: redeemError } = await supabase.rpc("redeem_prize", {
        p_prize_id: prize.id,
        p_cost: prize.cost,
        p_prize_title: prize.title
      });
      if (redeemError) throw redeemError;
      toast.success("¡Canje realizado con éxito!");
      loadUserData();
      loadAvailablePrizes();
    } catch (err) {
      toast.error("Error: " + (err.message || "No se pudo procesar"));
    } finally {
      setIsRedeeming(false);
    }
  };

  const displayPrizes = useMemo(() => {
    // Ya vienen filtrados desde el query de Supabase por eficiencia
    return prizes || [];
  }, [prizes]);

  const top3 = (rankingUsers || []).slice(0, 3);
  const rest = (rankingUsers || []).slice(3);
  const getPoints = (u) => rankingTab === "weekly" ? u?.weekly_points : u?.total_points;

  if (loading) {
    return <LoadingSkeleton message="Sincronizando Tienda" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadAvailablePrizes} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32 transition-all duration-700">
      {/* Header */}
      <div className="relative flex flex-col md:flex-row justify-between items-center gap-8 bg-gradient-to-br from-indigo-950 via-gray-950 to-black border border-white/5 p-10 rounded-[3.5rem] backdrop-blur-3xl overflow-hidden shadow-2xl">
        <div className="text-center md:text-left relative z-10">
          <h1 className="text-4xl md:text-5xl font-black text-white flex items-center gap-5 justify-center md:justify-start tracking-tighter">
            <div className="p-4 bg-yellow-400/10 border border-yellow-400/20 rounded-[2rem]">
              <Trophy className="w-10 h-10 text-yellow-400" />
            </div>
            Premios ClickWin
          </h1>
          <p className="text-gray-400 mt-4 font-medium text-lg">Canjea tus puntos ganados por recompensas reales y exclusivas.</p>
        </div>
        <div className="flex gap-6 relative z-10 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-white/5 border border-white/10 px-10 py-6 rounded-[2.5rem] text-center shadow-inner">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Balance Disponible</div>
            <div className="text-4xl font-black text-yellow-400 tabular-nums">
              {points.toLocaleString()} <span className="text-sm opacity-50 ml-1">pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col items-center gap-6 sticky top-24 z-40">
        {clientId && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 px-6 py-2 rounded-full flex items-center gap-3 backdrop-blur-xl">
            <Filter className="w-4 h-4 text-yellow-400" />
            <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Filtrado por Cliente</span>
            <button 
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete("client");
                setSearchParams(newParams);
              }}
              className="p-1 hover:bg-yellow-400/20 rounded-full transition-colors"
            >
              <X className="w-3 h-3 text-yellow-400" />
            </button>
          </div>
        )}
        <div className="bg-black/80 border border-white/10 rounded-[2.5rem] p-2 flex gap-2 backdrop-blur-2xl shadow-2xl">
          <button 
            onClick={() => setActiveTab("shop")}
            className={`px-12 py-4 rounded-[2.2rem] text-sm font-black transition-all flex items-center gap-3 ${activeTab === "shop" ? "bg-white text-black shadow-xl" : "text-gray-500 hover:text-white"}`}
          >
            <ShoppingBag className="w-5 h-5" /> TIENDA
          </button>
          <button 
            onClick={() => setActiveTab("ranking")}
            className={`px-12 py-4 rounded-[2.2rem] text-sm font-black transition-all flex items-center gap-3 ${activeTab === "ranking" ? "bg-white text-black shadow-xl" : "text-gray-500 hover:text-white"}`}
          >
            <Trophy className="w-5 h-5" /> CLASIFICACIÓN
          </button>
        </div>
      </div>

      {activeTab === "shop" ? (
        <div className="space-y-12">
          {displayPrizes.length === 0 ? (
            <EmptyState 
              title="Tienda Vacía" 
              message={clientId ? "Este cliente no tiene premios disponibles por ahora." : "No hay premios disponibles. ¡Vuelve pronto!"}
              icon={ShoppingBag}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {displayPrizes.map((prize, idx) => (
                <div key={prize.id} className={`feed-gradient-subtle h-full transition-all duration-500 ${(prize.stock !== -1 && (prize.stock || 0) <= 0) ? "opacity-60" : ""}`}>
                  <div className="feed-gradient-inner flex flex-col h-full">
                    <div className="relative h-64 overflow-hidden">
                      <img src={prize.image_url || "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600"} alt={prize.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />
                      <div className="absolute top-6 left-6 flex gap-2">
                        {prize.is_global ? (
                          <div className="bg-blue-500/80 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
                            <Globe className="w-3 h-3" /> Global
                          </div>
                        ) : (
                          <div className="bg-yellow-400/80 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-black flex items-center gap-2">
                            <Lock className="w-3 h-3" /> Exclusivo
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-10 flex-1 flex flex-col">
                      <div className="mb-6">
                        <h3 className="font-black text-2xl text-white group-hover:text-yellow-400 transition-colors tracking-tight">{prize.title}</h3>
                        <div className="flex items-center gap-2 mt-2 text-white/30 text-[10px] font-bold uppercase tracking-widest">
                           {prize.stock === -1 ? <Sparkles className="w-3 h-3 text-yellow-400" /> : <Clock className="w-3 h-3" />}
                           {prize.stock === -1 ? "Stock Ilimitado" : `${prize.stock} restantes`}
                        </div>
                      </div>
                      <p className="text-gray-500 text-sm font-medium mb-10 flex-1 leading-relaxed line-clamp-3">{prize.description}</p>
                      <div className="flex items-center justify-between pt-8 border-t border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Inversión</span>
                          <span className="text-3xl font-black text-yellow-400">
                            {prize.cost?.toLocaleString()} <span className="text-xs opacity-40 ml-1">pts</span>
                          </span>
                        </div>
                        <button 
                          onClick={() => handleRedeem(prize)}
                          disabled={isRedeeming || points < prize.cost || (prize.stock !== -1 && (prize.stock || 0) <= 0)}
                          className={`px-8 py-5 rounded-[1.8rem] font-black text-xs transition-all flex items-center gap-3 ${points < prize.cost ? "bg-white/5 text-white/20" : "bg-white text-black active:scale-95 shadow-xl"}`}
                        >
                          {isRedeeming ? "..." : points >= prize.cost ? "CANJEAR" : "SALDO BAJO"}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gradient-to-br from-indigo-900/20 to-transparent border border-white/5 rounded-[4rem] p-12 flex flex-col md:flex-row items-center gap-10">
            <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
               <ShieldCheck className="w-12 h-12 text-indigo-400" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="text-2xl font-black text-white">¿Cómo ganar más puntos?</h3>
              <p className="text-gray-400 mt-2 font-medium leading-relaxed">
                Cada tarea aprobada suma puntos a tu wallet. Los premios exclusivos se desbloquean al interactuar con marcas específicas.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-12 transition-all duration-300">
          <div className="flex justify-center">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-1 flex gap-1">
              {["global", "weekly"].map(t => (
                <button key={t} onClick={() => setRankingTab(t)}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${rankingTab === t ? "bg-yellow-400 text-black" : "text-gray-500 hover:text-white"}`}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {rankingUsers.length === 0 ? (
             <div className="text-center py-40">
                <p className="text-white/20 font-black text-xl uppercase">No hay datos todavía</p>
             </div>
          ) : (
            <div className="space-y-12">
              {/* Podium */}
              <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-12 pt-10">
                {top3.map((u, i) => {
                  const order = i === 0 ? "order-2 scale-110" : i === 1 ? "order-1" : "order-3";
                  const size = i === 0 ? "w-36 h-36" : "w-28 h-28";
                  return (
                    <div key={u.id} className={`flex flex-col items-center group ${order}`}>
                      {i === 0 && <Crown className="w-12 h-12 text-yellow-400 mb-3 animate-bounce" />}
                      <div className="relative mb-6">
                        <div className={`${size} rounded-[2.5rem] bg-gray-900 border-2 ${i === 0 ? "border-yellow-400" : "border-white/10"} flex items-center justify-center text-4xl font-black text-white`}>
                          {u.display_name?.charAt(0) || "?"}
                        </div>
                        <div className={`absolute -bottom-4 -right-4 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-black border-4 border-gray-950 ${i === 0 ? "bg-yellow-400" : "bg-white text-xs"}`}>
                          {i + 1}
                        </div>
                      </div>
                      <div className="text-xl font-black text-white mb-1">{u.display_name}</div>
                      <div className="text-sm text-yellow-400/60 font-black">{getPoints(u)?.toLocaleString()} pts</div>
                    </div>
                  );
                })}
              </div>

              {/* List */}
              <div className="bg-gray-900/20 border border-white/5 rounded-[4rem] overflow-hidden backdrop-blur-xl">
                {rest.map((u, i) => {
                  const levelColor = LEVEL_COLORS[Math.min(Math.floor((u.level || 1) / 5), LEVEL_COLORS.length - 1)];
                  return (
                    <div key={u.id} className="grid grid-cols-12 gap-4 px-12 py-8 border-b border-white/5 last:border-0 hover:bg-white/5 transition-all items-center">
                      <div className="col-span-1 text-white/20 font-black text-xl italic">#{i + 4}</div>
                      <div className="col-span-11 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${levelColor} flex items-center justify-center font-black text-xl text-white shadow-xl`}>
                            {u.display_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="text-xl font-black text-white uppercase tracking-tight">{u.display_name || "Anónimo"}</div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase bg-gradient-to-r ${levelColor} text-white`}>Nivel {u.level || 1}</span>
                              <span className="flex items-center gap-1.5 text-orange-400 text-xs font-black">
                                <Flame className="w-4 h-4 fill-current" /> {u.current_streak || 0} DÍAS
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-3xl font-black text-yellow-400 tabular-nums">
                          {getPoints(u)?.toLocaleString()} <span className="text-xs opacity-30 ml-1">PTS</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          confirmLabel="Canjear"
        />
      )}
  );
}


