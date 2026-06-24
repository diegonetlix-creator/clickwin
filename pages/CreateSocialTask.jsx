import { supabase } from "@/supabase";
import { toast } from "@/components/Toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Instagram, Youtube, MessageSquare, 
  ArrowLeft, Zap, Target, Users as UsersIcon,
  ShieldCheck, Sparkles
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SocialTask } from "@/entities/SocialTask";

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
  { id: 'tiktok', name: 'TikTok', icon: MessageSquare, color: 'from-gray-900 to-black' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'from-red-500 to-red-700' },
];

export default function CreateSocialTask() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState('instagram');
  const [targetUrl, setTargetUrl] = useState('');
  const [expectedUsername, setExpectedUsername] = useState('');
  const [reward, setReward] = useState(50);
  const [maxWorkers, setMaxWorkers] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      
      const { data, error } = await supabase.rpc('create_social_task', {
        p_promoter_id: user.id,
        p_platform: platform,
        p_target_url: targetUrl,
        p_reward: parseInt(reward),
        p_max_workers: parseInt(maxWorkers),
        p_title: `${platform.toUpperCase()} Mission`,
        p_expected_username: expectedUsername,
        p_expected_url: targetUrl
      });

      if (error) throw error;

      alert("¡Misión de crecimiento publicada correctamente!");
      navigate("/social-tasks");
    } catch (err) {
      console.error("Error creating social task:", err);
      toast.error("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-widest">Volver</span>
      </button>

      <div className="bg-gray-900/50 border border-gray-800 rounded-[3rem] p-8 md:p-12 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Sparkles className="w-40 h-40 text-yellow-400 rotate-12" />
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-yellow-500/10">
            <Zap className="w-3.5 h-3.5 fill-current" />
            Nueva Misión de Crecimiento
          </div>
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Impulsa tu <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Presencia Social</span>
          </h1>
          <p className="text-gray-400 text-sm font-medium leading-relaxed mb-10">
            Crea una tarea para que otros usuarios te sigan o interactúen con tu perfil. Define una recompensa justa para incentivar el apoyo mutuo.
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Platform Selector */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Target className="w-3 h-3" /> Selecciona Plataforma
              </label>
              <div className="grid grid-cols-3 gap-4">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-2 transition-all duration-300 ${platform === p.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_20px_40px_rgba(79,70,229,0.3)] scale-105' : 'bg-gray-950/50 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                  >
                    <p.icon className={`w-8 h-8 ${platform === p.id ? 'animate-bounce-subtle' : ''}`} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

             {/* URL Input */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Enlace del Perfil o Post</label>
                <div className="relative">
                   <input 
                      type="url" 
                      required
                      placeholder={platform === 'instagram' ? "https://instagram.com/tu_usuario" : platform === 'youtube' ? "https://youtube.com/@canal" : "https://tiktok.com/@usuario"}
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      className="w-full bg-gray-950 border-2 border-gray-800 rounded-2xl p-5 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-800 shadow-inner"
                   />
                   <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-700 uppercase tracking-tighter">URL</div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Usuario a Seguir (Expected)</label>
                <div className="relative">
                   <input 
                      type="text" 
                      required
                      placeholder="ej: @tu_usuario"
                      value={expectedUsername}
                      onChange={(e) => setExpectedUsername(e.target.value)}
                      className="w-full bg-gray-950 border-2 border-gray-800 rounded-2xl p-5 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-800 shadow-inner"
                   />
                   <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-700 uppercase tracking-tighter">ID</div>
                </div>
              </div>
            </div>

            {/* Reward and Workers */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Recompensa (Pts)</label>
                <input 
                  type="number" 
                  required
                  min="10"
                  max="1000"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  className="w-full bg-gray-950 border-2 border-gray-800 rounded-2xl p-5 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                    <UsersIcon className="w-3 h-3" /> Cantidad de Apoyos
                </label>
                <input 
                  type="number" 
                  required
                  min="1"
                  max="500"
                  value={maxWorkers}
                  onChange={(e) => setMaxWorkers(e.target.value)}
                  className="w-full bg-gray-950 border-2 border-gray-800 rounded-2xl p-5 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="bg-gray-800/30 border border-gray-800 rounded-3xl p-6 flex gap-4 items-start">
                  <ShieldCheck className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                  <div>
                      <p className="text-[11px] text-white/60 leading-relaxed font-bold uppercase tracking-tight">Compromiso de Autor</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
                        Al publicar, aseguras que revisarás las pruebas y otorgarás los puntos. El incumplimiento de este acuerdo reducirá tu nivel de confianza en la plataforma.
                      </p>
                  </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="group w-full py-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:shadow-[0_20px_50px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                  <>
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> 
                    Publicar Misión
                  </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

