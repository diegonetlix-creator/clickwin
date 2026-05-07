import { Shield, Loader2 } from "lucide-react";

/**
 * Visual rate limit indicator.
 * Shows remaining uses, progress bar, and blocks the CTA when limit is reached.
 */
export default function RateLimitBadge({ label, used, remaining, dailyLimit, loading, compact = false }) {
  if (loading) return (
    <div className="flex items-center gap-1.5 text-gray-500 text-xs">
      <Loader2 className="w-3 h-3 animate-spin" />
      <span>Verificando...</span>
    </div>
  );

  const pct       = Math.min((used / dailyLimit) * 100, 100);
  const isAtLimit = remaining === 0;
  const isWarning = remaining <= Math.ceil(dailyLimit * 0.2); // last 20%

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
        isAtLimit  ? "bg-red-500/20 text-red-400 border border-red-500/30" :
        isWarning  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                     "bg-green-500/20 text-green-400 border border-green-500/30"
      }`}>
        <Shield className="w-3 h-3" />
        {isAtLimit ? `Límite alcanzado` : `${remaining} ${label} restantes hoy`}
      </span>
    );
  }

  return (
    <div className={`rounded-xl p-3 border ${
      isAtLimit ? "bg-red-500/5 border-red-500/20" :
      isWarning  ? "bg-yellow-500/5 border-yellow-500/20" :
                   "bg-white/5 border-white/5"
    }`}>
      <div className="flex items-center justify-between text-[11px] font-bold mb-2">
        <span className="flex items-center gap-1.5 text-gray-400">
          <Shield className="w-3.5 h-3.5" />
          {label}
        </span>
        <span className={isAtLimit ? "text-red-400" : isWarning ? "text-yellow-400" : "text-white/60"}>
          {isAtLimit ? "¡Límite diario!" : `${remaining} de ${dailyLimit} restantes`}
        </span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isAtLimit ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-green-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-[10px] text-red-400/80 mt-1.5">
          Límite diario alcanzado. Vuelve mañana a las 00:00 UTC.
        </p>
      )}
    </div>
  );
}
