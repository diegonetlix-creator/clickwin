import "@/styles/glass.css";
import { Flame, Trophy } from "lucide-react";

export default function BalanceHeader({ user }) {
  const points = user?.points || 0;
  const streak = user?.streak || 7;
  const rank = user?.rank || 12;

  return (
    <div className="glass p-4 flex justify-between items-center transition-all duration-300 hover:bg-white/[0.05]">

      <div className="flex flex-col">
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Balance actual</p>
        <h2 className="text-white text-3xl font-black flex items-baseline gap-1">
          {points.toLocaleString()} <span className="text-xs text-indigo-400 font-bold">pts</span>
        </h2>
      </div>

      <div className="flex gap-2">
        <div className="glass !rounded-xl p-2 px-3 flex items-center gap-2 bg-white/[0.02]">
          <Flame size={14} className="text-orange-500" fill="currentColor" />
          <span className="text-white text-xs font-black">{streak} <span className="text-[10px] text-gray-500">días</span></span>
        </div>

        <div className="glass !rounded-xl p-2 px-3 flex items-center gap-2 bg-white/[0.02]">
          <Trophy size={14} className="text-yellow-500" fill="currentColor" />
          <span className="text-white text-xs font-black"><span className="text-[10px] text-gray-500">#</span>{rank}</span>
        </div>
      </div>

    </div>
  );
}
