import { useState, useEffect } from "react";
import { 
  Users, Globe, Instagram, Twitter, 
  Youtube, MessageSquare, ExternalLink, 
  CheckCircle, Zap, Plus, ArrowRight,
  ShieldCheck, Clock, Share2, Camera, X, Upload
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { toast } from "@/components/Toast";
import { formatPoints } from "@/utils";
import { SocialTask } from "@/entities/SocialTask";
import { SocialTaskSubmission } from "@/entities/SocialTaskSubmission";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
  { id: 'twitter', name: 'Twitter / X', icon: Twitter, color: 'from-blue-400 to-blue-600' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'from-red-500 to-red-700' },
  { id: 'tiktok', name: 'TikTok', icon: MessageSquare, color: 'from-gray-900 to-black' },
];

export default function SocialTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [proofInput, setProofInput] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [validationError, setValidationError] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await SocialTask.list('created_at', 50);
      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const shareTask = (task) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/social-tasks?ref=${user?.id}`;

    const text = `🔥 GANA SEGUIDORES GRATIS

Sígueme y yo te sigo 🤝

💰 Gana puntos reales en ClickWin
🚀 Crece tus redes ahora

👉 Entra aquí:
${shareUrl}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
  };

  const normalize = (text) => 
    text.toLowerCase().trim().replace(/\s/g, "").replace("https://", "").replace("http://", "").replace("@", "");

  const handleCompleteClick = (task) => {
    setActiveTask(task);
    setProofInput("");
    setFile(null);
    setPreviewUrl("");
    setValidationError("");
  };

  const handleFileUpload = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (selected.size > 7 * 1024 * 1024) {
      setValidationError("La imagen es muy pesada (máx 7MB)");
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setValidationError("");
  };

  const uploadImage = async () => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const bucketName = "proofs";

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error("Error subiendo evidencia:", error);
      throw new Error(`No se pudo subir la captura: ${error.message || 'Error desconocido'}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

  const generateHash = async (file, text) => {
    const fileBuffer = file ? await file.arrayBuffer() : new Uint8Array(0);
    const textBuffer = new TextEncoder().encode(text || "");

    const combined = new Uint8Array(fileBuffer.byteLength + textBuffer.byteLength);
    combined.set(new Uint8Array(fileBuffer), 0);
    combined.set(textBuffer, fileBuffer.byteLength);

    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleValidateAndSubmit = async () => {
    if (!proofInput.trim() && !file) {
      setValidationError("Ingresa texto o sube una captura");
      return;
    }

    const userInput = normalize(proofInput);
    const expectedUser = normalize(activeTask.expected_username || "");
    const expectedUrl = normalize(activeTask.expected_url || "");

    // Basic antifraud: URL check if it looks like a URL
    try {
      if (proofInput.includes("http")) {
        const urlObj = new URL(proofInput.startsWith("http") ? proofInput : `https://${proofInput}`);
        if (activeTask.platform === "instagram" && !urlObj.hostname.includes("instagram.com")) {
          setValidationError("El enlace no parece ser de Instagram");
          return;
        }
      }
    } catch {
      // Not a valid URL, treat as username
    }

    const isValid = userInput.includes(expectedUser) || userInput.includes(expectedUrl);

    if (activeTask.expected_username && !isValid) {
      setValidationError(`❌ El perfil no coincide. Debes seguir a: ${activeTask.expected_username}`);
      return;
    }

    setSubmitting(activeTask.id);
    try {
      const evidenceHash = await generateHash(file, proofInput);
      
      let imageUrl = null;
      if (file) {
        imageUrl = await uploadImage();
      }

      const { error } = await supabase.from('social_task_submissions').insert({
        task_id: activeTask.id,
        worker_id: user.id,
        evidence_text: proofInput,
        evidence_image: imageUrl,
        evidence_hash: evidenceHash,
        status: 'pending'
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error("Ya enviaste una prueba para esta misión");
        }
        throw error;
      }

      toast.success("¡Registro enviado! El autor revisará tu apoyo pronto.");
      setActiveTask(null);
      fetchTasks();
    } catch (err) {
      console.error("Error submitting task:", err);
      toast.error(err.message || "No se pudo enviar la prueba. Inténtalo de nuevo.");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return <LoadingSkeleton message="Cargando misiones sociales" />;
  }

  if (loadError) {
    return (
      <ErrorState
        message="No se pudieron cargar las misiones. Revisa tu sesión e inténtalo de nuevo."
        onRetry={fetchTasks}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
            <Globe className="w-10 h-10 text-blue-500" />
            Crecimiento Social
          </h1>
          <p className="text-gray-500 font-medium mt-2">Apoya a otros usuarios y gana recompensas para tus propias redes.</p>
        </div>
        <button 
          onClick={() => navigate("/create-social-task")}
          className="px-6 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-white/5"
        >
          <Plus className="w-4 h-4" /> Crear mi Misión
        </button>
      </div>

      {/* Tasks Grid */}
      <div className="grid gap-6">
        {tasks.length === 0 ? (
          <EmptyState 
            title="Sin Misiones Disponibles" 
            message="No hay misiones sociales activas en este momento. ¡Crea la tuya y empieza a crecer!"
            icon={Zap}
          />
        ) : (
          tasks.map(task => {
            const platformInfo = PLATFORMS.find(p => p.id === task.platform) || PLATFORMS[0];
            return (
              <div key={task.id} className="group bg-gray-900/60 border border-gray-800 rounded-[2.5rem] p-6 md:p-8 hover:border-blue-500/50 transition-all hover:bg-gray-800/40">
                <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${platformInfo.color} flex items-center justify-center text-white shadow-lg`}>
                      <platformInfo.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[9px] font-black text-white/50 uppercase tracking-widest">
                          {platformInfo.name}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Follow x Follow</span>
                      </div>
                      <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors truncate max-w-[200px] md:max-w-md">
                        {task.target_url}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-right mr-4">
                       <div className="text-2xl font-black text-yellow-400">+{formatPoints(task.reward)}</div>
                       <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Recompensa</div>
                    </div>
                    
                    <div className="flex gap-2">
                       <button 
                         onClick={() => shareTask(task)}
                         className="px-4 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                         title="Compartir misión"
                       >
                         <Share2 className="w-4 h-4" />
                       </button>

                       <a 
                         href={task.target_url} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                       >
                         <ExternalLink className="w-4 h-4" /> Ir y completar
                       </a>
                       
                       <button 
                         onClick={() => handleCompleteClick(task)}
                         disabled={submitting === task.id}
                         className="px-8 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-black/20 active:scale-95 disabled:opacity-50"
                       >
                         {submitting === task.id ? "Registrando..." : "Ya completé"}
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Agreement Notice */}
      <div className="bg-blue-600/5 border border-blue-600/10 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-10 h-10 text-blue-500" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-xl font-black text-white mb-2 italic">Acuerdos de Cumplimiento</h4>
          <p className="text-sm text-gray-500 leading-relaxed">
            Este es un sistema de ayuda mutua. Al marcar una tarea como completada, te comprometes a seguir las reglas. 
            El autor de la misión revisará tu prueba antes de liberar la recompensa. ¡Hagamos crecer la comunidad ClickWin con honestidad!
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-blue-500 font-black text-xs uppercase tracking-widest">
           Saber más <ArrowRight className="w-4 h-4" />
        </div>
      </div>

      {/* Validation Modal */}
      {activeTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveTask(null)} />
          <div className="relative bg-gray-900 border border-gray-800 w-full max-w-lg rounded-[3rem] p-8 md:p-12 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 rounded-[2rem] bg-blue-600/10 flex items-center justify-center text-blue-500">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">Validar Misión</h3>
                <p className="text-gray-500 text-sm font-medium mt-2">
                  Ingresa tu usuario o link de perfil para verificar que seguiste a <span className="text-blue-400 font-bold">{activeTask.expected_username || "@el_autor"}</span>
                </p>
              </div>

              <div className="w-full space-y-4">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Tu usuario o enlace de perfil..."
                    value={proofInput}
                    onChange={(e) => {
                      setProofInput(e.target.value);
                      setValidationError("");
                    }}
                    className={`w-full bg-gray-950 border-2 rounded-2xl p-5 text-sm font-bold text-white outline-none transition-all ${validationError ? 'border-red-500/50' : 'border-gray-800 focus:border-blue-500'}`}
                  />

                  <div className="mt-4 relative group/file">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      className="hidden" 
                      id="social-evidence-upload"
                    />
                    <label 
                      htmlFor="social-evidence-upload"
                      className="flex flex-col items-center justify-center gap-3 w-full aspect-video bg-gray-950 border-2 border-dashed border-gray-800 rounded-3xl cursor-pointer hover:border-blue-500/50 hover:bg-gray-900/50 transition-all overflow-hidden relative"
                    >
                      {previewUrl ? (
                        <>
                          <img src={previewUrl} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/file:opacity-100 transition-opacity flex items-center justify-center">
                             <Upload className="w-8 h-8 text-white" />
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setFile(null);
                              setPreviewUrl("");
                            }}
                            className="absolute top-3 right-3 p-2 bg-red-500 rounded-xl text-white shadow-lg hover:scale-110 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center">
                            <Camera className="w-6 h-6 text-gray-500" />
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Subir captura de pantalla</p>
                            <p className="text-[9px] text-gray-600 font-bold mt-1">Opcional pero recomendado</p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>

                  {validationError && (
                    <p className="mt-2 text-center text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                      {validationError}
                    </p>
                  )}
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={() => setActiveTask(null)}
                    className="flex-1 px-8 py-5 bg-gray-800 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleValidateAndSubmit}
                    disabled={submitting}
                    className="flex-[2] px-8 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:shadow-[0_20px_40px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50"
                  >
                    {submitting ? "Verificando..." : "Enviar Prueba"}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-gray-700 font-bold uppercase tracking-tighter">
                * El autor revisará manualmente esta coincidencia
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


