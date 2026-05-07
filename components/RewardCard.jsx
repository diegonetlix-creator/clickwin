import "@/styles/glass.css";
import { Zap } from "lucide-react";

export default function RewardCard({ reward, onClick }) {
  const data = reward || {
    title: "Flash Deal Premium",
    description: "Duplica tus ganancias por las próximas 24 horas activando este boost.",
    cost: 500,
    image: null
  };

  return (
    <div className="glass p-4 flex flex-col gap-3 glow transition-all duration-300 hover:bg-white/[0.05]">

      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white font-black text-lg leading-tight">
            {data.title}
          </h3>

          <p className="text-gray-400 text-[11px] font-medium leading-relaxed mt-1 max-w-[180px]">
            {data.description}
          </p>
        </div>
        
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <Zap size={24} fill="currentColor" className="animate-pulse" />
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-white/5">

        <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Costo</span>
            <span className="text-purple-400 font-black text-sm">
                {data.cost?.toLocaleString() || 0} <span className="text-[10px] opacity-60">pts</span>
            </span>
        </div>

        <button 
            onClick={onClick}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2 rounded-xl text-white text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-95 transition-all hover:brightness-110"
        >
          Canjear
        </button>

      </div>

    </div>
  );
}
