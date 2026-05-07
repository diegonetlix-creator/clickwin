import { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/Toast";
import {
  Wallet, TrendingUp, ArrowDownCircle, CheckCircle, Clock,
  Zap, Gift, Flame, Users, Star, ArrowUpCircle, History, RefreshCw
} from "lucide-react";

const TYPE_ICONS = {
  task_completion:  CheckCircle,
  daily_mission:    Gift,
  streak_bonus:     Flame,
  referral:         Users,
  level_up:         Star,
  withdrawal:       ArrowDownCircle,
  reward:           Zap,
  social_reward:    Users,
};
const TYPE_LABELS = {
  task_completion:  "Tarea completada",
  daily_mission:    "Misión diaria",
  streak_bonus:     "Bono de racha",
  referral:         "Referido",
  level_up:         "Subida de nivel",
  withdrawal:       "Retiro",
  reward:           "Recompensa",
  social_reward:    "Apoyo social",
};
const TYPE_COLORS = {
  task_completion:  "text-green-400",
  daily_mission:    "text-yellow-400",
  streak_bonus:     "text-orange-400",
  referral:         "text-blue-400",
  level_up:         "text-purple-400",
  withdrawal:       "text-red-400",
  reward:           "text-green-400",
  social_reward:    "text-blue-400",
};

export default function WorkerBalance() {
  const { user, loading: authLoading } = useAuth();

  const [points,          setPoints]          = useState(0);
  const [transactions,    setTransactions]    = useState([]);
  const [totalEarned,     setTotalEarned]     = useState(0);
  const [totalWithdrawn,  setTotalWithdrawn]  = useState(0);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [withdrawAmount,  setWithdrawAmount]  = useState("");
  const [withdrawing,     setWithdrawing]     = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    loadAll();
  }, [user?.id, authLoading]);

  const loadAll = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [walletRes, txsRes] = await Promise.all([
        supabase
          .from("wallets")
          .select("points")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (walletRes.error && walletRes.code !== "PGRST116") throw walletRes.error;
      if (txsRes.error)    throw txsRes.error;

      setPoints(walletRes.data?.points || 0);

      const txList = txsRes.data ?? [];
      setTransactions(txList);

      const earned   = txList.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const withdrawn = txList.filter(t => t.type === "withdrawal").reduce((s, t) => s + Math.abs(t.amount), 0);
      setTotalEarned(earned);
      setTotalWithdrawn(withdrawn);

    } catch (err) {
      setError(err.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 10 || amount > points) {
      toast.error("Cantidad inválida o saldo insuficiente");
      return;
    }

    setWithdrawing(true);
    try {
      // 1. Insert withdrawal transaction
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id:     user.id,
        amount:      -amount,
        type:        "withdrawal",
        description: `Retiro de ${amount} pts`,
      });
      if (txErr) throw txErr;

      // 2. Deduct from wallet
      const { error: wErr } = await supabase
        .from("wallets")
        .update({ points: points - amount, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (wErr) throw wErr;

      setWithdrawAmount("");
      setWithdrawSuccess(true);
      setTimeout(() => setWithdrawSuccess(false), 4000);
      toast.success("¡Retiro solicitado! Te contactaremos en 1-3 días hábiles.");
      await loadAll();
    } catch (err) {
      toast.error("Error al procesar el retiro: " + err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="text-center py-16 text-gray-500">
      <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
      <p>Inicia sesión para ver tu balance</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-16">
      <p className="text-red-400 text-sm mb-4">{error}</p>
      <button onClick={loadAll} className="flex items-center gap-2 mx-auto px-4 py-2 bg-gray-800 rounded-xl text-sm text-gray-300 hover:text-white transition-all">
        <RefreshCw className="w-4 h-4" /> Reintentar
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Mi Balance</h1>
          <p className="text-gray-400 text-sm mt-1">Gestiona tus ganancias y retiros</p>
        </div>
        <button onClick={loadAll} disabled={loading} className="p-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Balance cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-5 text-center">
          <Wallet className="w-7 h-7 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-black text-green-400">
            {points.toLocaleString()} pts
          </div>
          <div className="text-xs text-gray-400 mt-1">Balance disponible</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-5 text-center">
          <TrendingUp className="w-7 h-7 text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-black text-yellow-400">
            {totalEarned.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">Total ganado</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-5 text-center">
          <ArrowDownCircle className="w-7 h-7 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-black text-blue-400">
            {totalWithdrawn.toLocaleString()} pts
          </div>
          <div className="text-xs text-gray-400 mt-1">Total retirado</div>
        </div>
      </div>

      {/* ── Withdraw ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <ArrowDownCircle className="w-5 h-5 text-green-400" /> Solicitar retiro
        </h2>
        {withdrawSuccess && (
          <div className="flex items-center gap-2 bg-green-400/10 border border-green-400/20 rounded-xl p-3 mb-4 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" /> ¡Solicitud enviada exitosamente!
          </div>
        )}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">pts</span>
            <input
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              placeholder="0"
              min={10}
              max={points}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
            />
          </div>
          <button
            onClick={handleWithdraw}
            disabled={!withdrawAmount || parseInt(withdrawAmount) < 10 || parseInt(withdrawAmount) > points || withdrawing}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2"
          >
            {withdrawing
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <ArrowDownCircle className="w-4 h-4" />
            }
            Retirar
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Mínimo de retiro: 10 pts · Procesamiento en 1-3 días hábiles</p>
        <div className="flex gap-2 mt-3">
          {[10, 25, 50, 100].map(v => (
            <button
              key={v}
              onClick={() => setWithdrawAmount(String(Math.min(v, points)))}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs rounded-lg transition-colors"
            >
              {v} pts
            </button>
          ))}
        </div>
      </div>

      {/* ── Transaction history ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" /> Historial de transacciones
        </h2>
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No hay transacciones aún</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx, i) => {
              const Icon     = TYPE_ICONS[tx.type]  || Zap;
              const color    = TYPE_COLORS[tx.type] || "text-gray-400";
              const isPositive = tx.amount > 0;
              return (
                <div key={tx.id ?? i} className="flex items-center gap-3 py-3 border-b border-gray-800/60 last:border-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/5">
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {tx.description || TYPE_LABELS[tx.type] || tx.type}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString("es-ES", {
                        year: "numeric", month: "short", day: "numeric"
                      })}
                    </div>
                  </div>
                  <div className={`font-bold text-sm tabular-nums ${isPositive ? "text-green-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}{tx.amount} pts
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
