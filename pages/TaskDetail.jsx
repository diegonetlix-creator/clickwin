import { supabase } from "@/supabase";
import { toast } from "@/components/Toast";
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { createPageUrl, uploadFile } from "@/utils";
import User from "@/entities/User";
import { Task } from "@/entities/Task";
import { Submission } from "@/entities/Submission";
import { Campaign } from "@/entities/Campaign";
import {
  ArrowLeft, ExternalLink, Upload, CheckCircle, Clock, AlertCircle,
  Camera, Zap, Info, Share2, Users, MapPin, Hash, Star, Layout, Target
} from "lucide-react";

const NETWORK_COLORS = { 
  instagram: "text-pink-400 bg-pink-400/10", 
  youtube: "text-red-400 bg-red-400/10", 
  twitter: "text-blue-400 bg-blue-400/10", 
  facebook: "text-blue-600 bg-blue-600/10", 
  tiktok: "text-gray-100 bg-gray-500/20", 
  linkedin: "text-blue-500 bg-blue-500/10" 
};

const TASK_LABELS = { 
  like: "Dar Like", 
  comment: "Comentar", 
  follow: "Seguir", 
  share: "Compartir", 
  save: "Guardar", 
  view_story: "Ver Historia", 
  watch_video: "Ver Video", 
  screenshot: "Subir Captura", 
  specific_comment: "Comentario Específico", 
  visit_profile: "Visitar Perfil",
  custom: "Tarea Personalizada"
};

// Anti-fraud: Calculate image signature (Hash)
async function calculateImageSignature(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function TaskDetail() {
  const navigate = useNavigate();
  const { id, campaignId } = useParams();
  const [task, setTask] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [missions, setMissions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [step, setStep] = useState("view");

  useEffect(() => {
    if (!id && !campaignId) { navigate(createPageUrl("Tasks")); return; }
    
    const load = async () => {
      setLoading(true);
      try {
        const u = await User.me();
        let t = null;

        if (id && id !== "campaign") {
          t = await Task.get(id);
        } else if (campaignId) {
          const availableTasks = await Task.filter({ campaign_id: campaignId, status: "available" }, "-created_at", 1);
          if (!availableTasks || availableTasks.length === 0) {
            alert("No hay cupos disponibles para esta tarea en este momento.");
            navigate(createPageUrl("Tasks"));
            return;
          }
          t = availableTasks[0];
          window.history.replaceState(null, '', `/tasks/${t.id}`);
        }
        
        if (!t) throw new Error("No se pudo cargar la tarea.");
        
        let promoterId = t.promoter_id;
        // Load Full Campaign Data
        if (t.campaign_id) {
          try {
            const camp = await Campaign.findById(t.campaign_id);
            if (camp) {
              setCampaign(camp);
              if (camp.promoter_id) promoterId = camp.promoter_id;
              // Fill missing task info from campaign
              if (!t.target_url) t.target_url = camp.target_url;
              if (!t.reference_image_url) t.reference_image_url = camp.reference_image_url;
              if (!t.instructions) t.instructions = camp.instructions;
            }
          } catch (e) {
             console.error("[TaskDetail] Could not fetch campaign details:", e);
          }
        }
        
        setUser(u);
        setTask(t);

        // Fetch Daily Missions for the promoter
        if (promoterId) {
          
          const { data: missionsData, error: missionsError } = await supabase
            .from("daily_missions")
            .select("*")
            .eq("created_by", promoterId)
            .eq("status", "active");
          
          if (missionsError) {
            console.error("[TaskDetail] Missions error:", missionsError);
          } else {
            setMissions(missionsData || []);
          }
        }
        
        // Anti-self-completion: Don't allow promoter to do their own tasks
        if (t.promoter_id === u.id) {
          alert("No puedes completar tus propias tareas.");
          navigate(createPageUrl("Tasks"));
          return;
        }
        
        // Check submission
        
        const { data: subs, error: subsError } = await supabase
          .from("submissions")
          .select("*")
          .eq("worker_id", u.id)
          .or(`task_id.eq.${t.id},and(campaign_id.eq.${t.campaign_id})`)
          .order("created_at", { ascending: false });

        if (subsError) {
          console.error("[TaskDetail] Submissions check error:", subsError);
        } else if (subs && subs.length > 0) {
          setExistingSubmission(subs[0]);
          setStep("submitted");
        } else {
          if (t.worker_email === u.email && t.status === "claimed") setStep("claimed");
          else if (t.worker_email === u.email && t.status === "submitted") setStep("submitted");
        }
      } catch (err) {
        console.error("Error cargando detalle:", err);
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, [id, campaignId]);

  const handleSubmit = async () => {
    if (!evidenceFile) return;
    setSubmitting(true);
    setUploadProgress(0);

    try {
      const signature = await calculateImageSignature(evidenceFile);
      
      let url = "";
      const result = await uploadFile(evidenceFile, {
        isPublic: true,
        onProgress: (p) => setUploadProgress(p),
      });
      url = result.url;

      const submissionData = {
        task_id: task.id,
        campaign_id: task.campaign_id,
        campaign_title: task.campaign_title || "Campaña sin título",
        worker_id: user?.id || null,
        worker_email: user?.email || "",
        worker_name: user?.name || user?.fullName || user?.email || "Usuario",
        promoter_id: task.promoter_id || null,
        promoter_email: task.promoter_email || "",
        evidence_url: url,
        evidence_hash: signature,
        evidence_note: evidenceNote,
        task_type: task.task_type,
        social_network: task.social_network,
        reward: Number(task.reward) || 0,
        status: "pending",
      };

      await Submission.create(submissionData);
      
      await Task.update(task.id, {
        status: "submitted",
        evidence_url: url,
        evidence_note: evidenceNote,
        submitted_at: new Date().toISOString(),
      });
      
      setTask(prev => ({ 
        ...prev, 
        status: "submitted",
        evidence_url: url,
        evidence_note: evidenceNote,
        submitted_at: new Date().toISOString()
      }));

      setStep("submitted");
    } catch (err) {
      console.error("Error crítico en handleSubmit:", err);
      alert(err.message || "No se pudo enviar la tarea. Verifica tu conexión.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!task) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-gray-500">
      <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
      <p>Tarea no encontrada</p>
      <Link to={createPageUrl("Tasks")} className="mt-4 text-blue-400 hover:underline">Volver a tareas</Link>
    </div>
  );

  const currentStatus = existingSubmission?.status || task.status;
  const isExpired = campaign?.deadline && new Date(campaign.deadline) < new Date();
  const freeSpots = (campaign?.max_participants || 0) - (campaign?.current_participants || 0);
  const tags = Array.isArray(campaign?.tags) ? campaign.tags : [];

  return (
    <div className="max-w-xl mx-auto pb-24 px-4 sm:px-0">
      {/* Top Navigation */}
      <div className="flex items-center justify-between py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-all group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold text-sm">Volver</span>
        </button>
        <button className="p-2 rounded-full hover:bg-gray-800 transition-colors">
          <Share2 className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Main Image Banner */}
      <div className="group relative aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-gray-900 border border-gray-800 shadow-2xl mb-8">
        {task.reference_image_url ? (
          <img src={task.reference_image_url} alt="Task" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-700">
            <Layout className="w-16 h-16 mb-2 opacity-10" />
            <span className="text-xs font-bold uppercase tracking-widest opacity-30">Sin imagen de referencia</span>
          </div>
        )}
        
        {/* Floating Badges on Image */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <div className="bg-white/95 text-black px-4 py-2 rounded-2xl flex items-center gap-2 font-black shadow-lg backdrop-blur-md">
             <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
             {task.reward} {campaign?.reward_type || "pts"}
          </div>
          <div className="bg-indigo-600/90 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-black text-[10px] shadow-lg backdrop-blur-sm border border-white/10">
             <Star className="w-3 h-3 fill-current text-yellow-400" />
             +{ (task.reward / 100).toFixed(1) } ⭐
          </div>
        </div>
        
        <div className="absolute bottom-6 left-6 bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] text-white px-5 py-1.5 rounded-2xl text-xs font-black tracking-wide uppercase">
          {campaign?.category || "Contenido"}
        </div>
      </div>

      {/* Promoter Info Section */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-purple-500/20">
          {(campaign?.promoter_name || task.promoter_email || "C")?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="font-black text-xl text-white tracking-tight">{campaign?.promoter_name || "Empresa"}</h2>
          <p className="text-gray-500 text-sm font-medium">Publicado el {new Date(task.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-4 mb-10">
        <h1 className="text-4xl font-black text-white leading-tight">
          {task.campaign_title || TASK_LABELS[task.task_type] || task.task_type}
        </h1>
        
        <div className="text-gray-400 text-lg leading-relaxed font-medium">
          {campaign?.description || task.instructions || "Crea contenido de calidad y sube tu evidencia para ganar los puntos."}
        </div>

        {/* Tags / Hashtags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {tags.map((tag, i) => (
              <span key={i} className="flex items-center gap-1.5 text-purple-400 font-bold bg-purple-400/10 px-3 py-1.5 rounded-xl text-sm italic">
                <Hash className="w-3.5 h-3.5" /> {tag.toLowerCase().replace('#', '')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Missions & Stats Grid Section */}
      {missions && missions.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 mb-10">
          {missions.map(mission => {
            const missionIcons = {
              madrugador: "⏰",
              like: "❤️",
              social: "💬",
              embajador: "📢",
              weekend: "🏆"
            };
            return (
              <div 
                key={mission.id} 
                onClick={() => {
                  const targetPromoterId = mission.created_by || task.promoter_id;
                  navigate(`${createPageUrl("DailyMissions")}?promoterId=${targetPromoterId}&type=${mission.type}`);
                }}
                className="bg-gray-900 border border-gray-800 p-6 rounded-[2rem] hover:bg-gray-800/50 hover:border-purple-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group relative overflow-hidden shadow-sm hover:shadow-purple-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex flex-col items-center text-center relative z-10">
                  <div className="text-4xl mb-3 group-hover:scale-110 group-hover:-rotate-3 transition-transform">{missionIcons[mission.type] || "🎯"}</div>
                  <h4 className="text-sm font-black text-white mb-3 leading-tight">{mission.title}</h4>
                  <div className="flex gap-2 w-full justify-center">
                    <span className="bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-lg text-xs font-black">+{mission.reward_pts} pts</span>
                    <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg text-xs font-black">{mission.current_completions}/{mission.max_completions}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-[2rem] text-center mb-10 shadow-inner">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700/50">
            <Target className="w-8 h-8 text-gray-500 opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Sin Misiones Activas</h3>
          <p className="text-gray-400 font-medium">Este cliente no tiene misiones activas en este momento.</p>
          <p className="text-sm text-gray-500 mt-2">Puedes completar la tarea normalmente y recibir tus puntos base.</p>
        </div>
      )}

      {/* Task Link Section */}
      {task.target_url && (
        <div className="space-y-4 mb-10">
          <div className="bg-gray-950 border border-gray-800 rounded-[2rem] p-4 flex items-center justify-between gap-3 group hover:border-blue-500/30 transition-all">
             <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                   <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
                <div className="truncate text-xs font-mono text-gray-500 select-all">
                   {task.target_url}
                </div>
             </div>
             <button 
               onClick={() => {
                 navigator.clipboard.writeText(task.target_url);
                 alert("Enlace copiado al portapapeles");
               }}
               className="bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold px-4 py-2 rounded-xl text-xs transition-colors flex-shrink-0"
             >
               Copiar
             </button>
          </div>

          <a href={task.target_url.startsWith('http') ? task.target_url : `https://${task.target_url}`} 
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <ExternalLink className="w-6 h-6" />
            <span className="text-lg">Ir a la Tarea</span>
          </a>
        </div>
      )}

      {/* Submission Section */}
      {currentStatus !== "submitted" && currentStatus !== "approved" && currentStatus !== "rejected" && !isExpired && (
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 p-8 rounded-[3rem] space-y-6 shadow-2xl">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Camera className="w-5 h-5 text-blue-400" />
             </div>
             <h2 className="font-black text-2xl text-white">Sube tu evidencia</h2>
          </div>
          
          <div className={`group relative border-2 border-dashed rounded-[2.5rem] p-10 text-center transition-all duration-300 ${evidenceFile ? "border-green-400/50 bg-green-400/5" : "border-gray-800 hover:border-gray-700 hover:bg-gray-800/20"}`}>
            {evidenceFile ? (
              <div className="animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 rounded-full bg-green-400/10 flex items-center justify-center mx-auto mb-4 border border-green-400/20">
                   <CheckCircle className="w-10 h-10 text-green-400 " />
                </div>
                <p className="text-lg text-white font-black">{evidenceFile.name}</p>
                <button onClick={() => setEvidenceFile(null)} className="text-sm text-gray-500 hover:text-red-400 mt-2 font-bold underline transition-colors">Cambiar archivo</button>
              </div>
            ) : (
              <label className="cursor-pointer block group">
                <div className="w-16 h-16 rounded-full bg-gray-800 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Upload className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-lg text-white font-black">Subir captura</p>
                <p className="text-xs text-gray-600 mt-2 uppercase tracking-[0.2em] font-black">Formatos: PNG, JPG</p>
                <input type="file" accept="image/*" className="hidden" onChange={e => setEvidenceFile(e.target.files[0])} />
              </label>
            )}
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Nota adicional (opcional)</label>
            <textarea value={evidenceNote} onChange={e => setEvidenceNote(e.target.value)} rows={3}
              placeholder="Describe brevemente lo que hiciste..."
              className="w-full bg-gray-950/50 border border-gray-800 rounded-[2rem] px-6 py-4 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none" />
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-950 rounded-full h-2 overflow-hidden border border-gray-800">
              <div className="bg-gradient-to-r from-blue-400 to-indigo-600 h-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

          <button onClick={handleSubmit} disabled={!evidenceFile || submitting}
            className="w-full bg-white text-black font-black py-5 rounded-[2rem] hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-2 shadow-xl">
            {submitting ? <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" /> : <Zap className="w-6 h-6" />}
            {submitting ? "Enviando..." : "Enviar a Revisión"}
          </button>
        </div>
      )}

      {/* Completion / Status Screens */}
      {(currentStatus === "submitted" || step === "submitted") && (
        <div className="bg-gray-900 border border-yellow-400/20 rounded-[2rem] p-6 text-center shadow-2xl max-w-[420px] mx-auto animate-in fade-in zoom-in duration-300 hover:translate-y-[-3px] transition-all duration-300 group">
          <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 flex items-center justify-center mx-auto mb-3 border border-yellow-400/20 shadow-[0_0_20px_rgba(250,204,21,0.1)] group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
          <h2 className="font-semibold text-xl mb-1.5 text-white tracking-tight">¡Enviado!</h2>
          <p className="text-gray-500 text-[13px] opacity-70 max-w-[280px] mx-auto leading-relaxed">Estamos revisando tu evidencia. Recibirás tus puntos en cuanto el cliente la apruebe.</p>
          <button 
            onClick={() => navigate(createPageUrl("Tasks"))} 
            className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2.5 px-4 rounded-xl text-[13px] transition-all border border-white/5 active:scale-95"
          >
            Ver otras tareas
          </button>
        </div>
      )}

      {currentStatus === "approved" && (
        <div className="bg-green-400/5 border border-green-400/20 rounded-[2rem] p-6 text-center shadow-2xl max-w-[420px] mx-auto animate-in fade-in zoom-in duration-300 hover:translate-y-[-3px] transition-all duration-300 group">
          <div className="w-12 h-12 rounded-2xl bg-green-400/10 flex items-center justify-center mx-auto mb-3 border border-green-400/20 group-hover:scale-110 transition-transform">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <h2 className="font-semibold text-xl text-green-400 mb-1.5 tracking-tight">¡Completada!</h2>
          <p className="text-gray-400 text-[13px] opacity-70 max-w-[280px] mx-auto leading-relaxed">¡Felicidades! Has ganado {task.reward} {campaign?.reward_type || "puntos"}.</p>
          <button 
            onClick={() => navigate(createPageUrl("Tasks"))} 
            className="mt-4 w-full bg-green-400/10 hover:bg-green-400/20 text-green-400 font-bold py-2.5 px-4 rounded-xl text-[13px] transition-all border border-green-400/20 active:scale-95"
          >
            Buscar más retos
          </button>
        </div>
      )}

      {currentStatus === "rejected" && (
        <div className="bg-red-400/5 border border-red-400/20 rounded-[2rem] p-6 text-center shadow-2xl max-w-[420px] mx-auto animate-in fade-in zoom-in duration-300 hover:translate-y-[-3px] transition-all duration-300 group">
          <div className="w-12 h-12 rounded-2xl bg-red-400/10 flex items-center justify-center mx-auto mb-3 border border-red-400/20 group-hover:scale-110 transition-transform">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="font-semibold text-xl text-red-400 mb-1.5 tracking-tight">Tarea rechazada</h2>
          <p className="text-gray-500 text-[13px] opacity-70 max-w-[280px] mx-auto leading-relaxed italic mb-2">
            "{existingSubmission?.rejection_reason || task.rejection_reason || "La evidencia no cumplió con los requisitos."}"
          </p>
          <button 
            onClick={() => navigate(createPageUrl("Tasks"))} 
            className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-4 rounded-xl text-[13px] transition-all shadow-lg shadow-red-500/20 active:scale-95"
          >
            Reintentar con otro reto
          </button>
        </div>
      )}
    </div>
  );
}

