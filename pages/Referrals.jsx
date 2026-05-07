import { useState } from "react";
import { Share2, Copy, Users, Trophy, Zap, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/Toast";

export default function Referrals() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const referralLink = `${window.location.origin}/register?ref=${user?.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("¡Enlace copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <div className="inline-block p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 mb-4">
          <Share2 className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">Programa de Referidos</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
          Invita a tus amigos y gana el 10% de todos los puntos que ellos generen para siempre.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Users, label: "Invita", desc: "Comparte tu enlace" },
          { icon: Zap, label: "Ellos Ganan", desc: "Completan tareas" },
          { icon: Trophy, label: "Tú Ganas", desc: "10% de comisión" },
        ].map((item, i) => (
          <div key={i} className="bg-gray-900/50 border border-white/5 p-8 rounded-[2.5rem] text-center space-y-3">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
              <item.icon className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="font-black text-white uppercase text-xs tracking-widest">{item.label}</h3>
            <p className="text-gray-500 text-xs font-medium">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-indigo-900/40 to-black/40 border border-white/5 p-10 rounded-[3.5rem] backdrop-blur-3xl space-y-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 ml-4">Tu Enlace Personal</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-gray-950 border border-white/10 rounded-3xl px-6 py-4 font-mono text-sm text-gray-400 truncate flex items-center">
              {referralLink}
            </div>
            <button 
              onClick={handleCopy}
              className="px-8 py-4 bg-white text-black rounded-3xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? "¡Copiado!" : "Copiar Enlace"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-2xl font-black text-white">0</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Amigos Invitados</div>
            </div>
            <Users className="w-8 h-8 text-gray-800" />
          </div>
          <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-2xl font-black text-white">0 pts</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Comisiones Ganadas</div>
            </div>
            <Gift className="w-8 h-8 text-gray-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
