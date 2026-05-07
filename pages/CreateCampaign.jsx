import { supabase } from "@/supabase";
import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import User from "@/entities/User";
import { Campaign } from "@/entities/Campaign";
import { LayoutDashboard, Target, ExternalLink, Users, Coins, Save, Tag, Zap } from "lucide-react";
import { auditLog, ACTION } from "@/utils";

const SOCIAL_NETWORKS = [
  { id: "instagram", label: "Instagram" },
  { id: "twitter", label: "Twitter" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "linkedin", label: "LinkedIn" }
];

const TASK_TYPES = [
  { id: "like", label: "Like" },
  { id: "comment", label: "Comentario" },
  { id: "follow", label: "Seguir" },
  { id: "share", label: "Compartir" },
  { id: "view_story", label: "Visualización" },
  { id: "review", label: "Review" }
];

const CATEGORIES = [
  "Marketing",
  "Diseño",
  "Tecnología",
  "Ventas",
  "Contenido",
  "Fotografía",
  "Eventos",
  "Otros"
];
const STEP_CONFIG = [
  { id: 1, title: "Información", icon: LayoutDashboard },
  { id: 2, title: "Tarea", icon: ExternalLink },
  { id: 3, title: "Presupuesto", icon: Coins }
];

export default function CreateCampaign() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.state?.mode === "edit";
  const editId = location.state?.campaignId;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    social_network: "instagram",
    task_type: "like",
    target_url: "",
    instructions: "",
    reward_per_task: 0,
    max_participants: 1,
    category: "General"
  });

  useEffect(() => {
    if (isEditMode && !editId) {
      navigate(createPageUrl("MyCampaigns"));
      return;
    }

    if (isEditMode && editId) {
      loadCampaign(editId);
    }
  }, [isEditMode, editId, navigate]);

  const loadCampaign = async (id) => {
    setLoading(true);
    try {
      const camps = await Campaign.filter({ id });
      if (camps.length > 0) {
        const c = camps[0];
        setForm({
          title: c.title || "",
          description: c.description || c.instructions || "",
          social_network: c.social_network || "instagram",
          task_type: c.task_type || "like",
          target_url: c.target_url || "",
          instructions: c.instructions || "",
          reward_per_task: c.reward_per_task || 0,
          max_participants: c.max_participants || 1,
          category: c.category || "General"
        });
      }
    } catch (err) {
      console.error("Error loading campaign:", err);
    } finally {
      setLoading(false);
    }
  };

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const nextStep = () => {
    if (currentStep === 1 && !form.title.trim()) {
      alert("Por favor, ingresa un título para la campaña.");
      return;
    }
    if (currentStep === 1 && !form.category) {
      alert("Por favor, selecciona una categoría para la campaña.");
      return;
    }
    if (currentStep === 2 && !form.instructions.trim()) {
      alert("Por favor, proporciona instrucciones para los usuarios.");
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (currentStep < 3) return nextStep();
    
    setSaving(true);
    try {
      const u = await User.me();
      if (!u) throw new Error("Debes iniciar sesión");

      // Auto-fix URL if it doesn't start with http
      let finalUrl = form.target_url;
      if (finalUrl && !finalUrl.startsWith('http')) {
        finalUrl = 'https://' + finalUrl;
      }

      

      if (editId) {
        // UPDATE MODE
        await Campaign.update(editId, {
          title: form.title,
          description: form.description,
          social_network: form.social_network.toLowerCase(),
          task_type: form.task_type.toLowerCase(),
          target_url: finalUrl,
          instructions: form.instructions,
          category: form.category,
          reward_per_task: Number(form.reward_per_task),
          max_participants: Number(form.max_participants)
        });

        // Sync Feed Posts
        const { error: feedErr } = await supabase.from('feed_posts')
          .update({
            title: form.title,
            description: form.description || form.instructions,
            reward: Number(form.reward_per_task),
            target_url: finalUrl,
            social_network: form.social_network.toLowerCase()
          })
          .eq('campaign_id', editId);
        
        if (feedErr) console.error("[CreateCampaign] Feed update error:", feedErr);

        auditLog(ACTION.UPDATE_CAMPAIGN, "campaigns", editId, {
          title: form.title,
          budget: Number(form.reward_per_task) * Number(form.max_participants)
        });

        // Sync Available Tasks
        const { error: tasksErr } = await supabase.from('tasks')
          .update({
            title: form.title,
            reward: Number(form.reward_per_task),
            instructions: form.instructions,
            campaign_title: form.title,
            social_network: form.social_network.toLowerCase(),
            task_type: form.task_type.toLowerCase(),
            target_url: finalUrl
          })
          .eq('campaign_id', editId)
          .eq('status', 'available');

        if (tasksErr) console.error("[CreateCampaign] Tasks sync error:", tasksErr);

      } else {
        // CREATE MODE
        const budget = Number(form.reward_per_task) * Number(form.max_participants);

        const campaign = await Campaign.create({
          title: form.title,
          description: form.description,
          social_network: form.social_network.toLowerCase(),
          task_type: form.task_type.toLowerCase(),
          target_url: finalUrl,
          instructions: form.instructions,
          category: form.category,
          reward_per_task: Number(form.reward_per_task),
          max_participants: Number(form.max_participants),
          promoter_id: u.id,
          promoter_email: u.email,
          promoter_name: u.fullName || u.email,
          status: "active",
          current_participants: 0,
          approved_count: 0,
          rejected_count: 0,
          pending_count: 0,
          budget: budget,
          spent: 0,
        });

        auditLog(ACTION.CREATE_CAMPAIGN, "campaigns", campaign.id, {
          title: form.title,
          budget: budget
        });

        // Create Feed Post
        const { error: feedPostErr } = await supabase.from('feed_posts').insert({
          campaign_id: campaign.id,
          promoter_id: u.id,
          promoter_name: u.fullName || u.email,
          title: form.title,
          description: form.description || form.instructions,
          reward: Number(form.reward_per_task),
          social_network: form.social_network.toLowerCase(),
          target_url: finalUrl,
          type: "task",
          status: "active"
        });

        if (feedPostErr) console.error("[CreateCampaign] Feed post creation error:", feedPostErr);

        const tasksToCreate = Array.from({ length: Math.min(form.max_participants, 50) }, () => ({
          campaign_id: campaign.id,
          campaign_title: form.title,
          social_network: form.social_network.toLowerCase(),
          task_type: form.task_type.toLowerCase(),
          instructions: form.instructions,
          target_url: finalUrl,
          reward: Number(form.reward_per_task),
          promoter_id: u.id,
          promoter_email: u.email,
          status: "available",
          time_limit_hours: 24,
        }));

        const { error: bulkTasksErr } = await supabase.from('tasks').insert(tasksToCreate);
        if (bulkTasksErr) {
          console.error("[CreateCampaign] Bulk tasks creation error:", bulkTasksErr);
          throw bulkTasksErr;
        }
      }

      setSaving(false);
      navigate(createPageUrl("MyCampaigns"));
    } catch (err) {
      console.error(err);
      alert("Error al procesar la campaña: " + err.message);
      setSaving(false);
    }
  };

  const isFormValid = form.title.trim() !== "" && form.reward_per_task > 0 && form.max_participants > 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Cargando Campaña...</p>
    </div>
  );

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">{editId ? "Editar Campaña" : "Nueva Campaña"}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {editId ? "Modifica los detalles de tu campaña paso a paso." : "Sigue los pasos para crear tu campaña publicitaria."}
          </p>
        </div>
        {!editId && (
          <Link 
            to={createPageUrl("CreateAd")}
            className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Zap className="w-4 h-4 text-yellow-400" /> Editor Rápido
          </Link>
        )}
      </div>

      {/* Header with Stepper */}
      <div className="mb-10 pt-4">
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-800 -translate-y-1/2 z-0" />
          <div className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 transition-all duration-500 z-0" 
               style={{ width: `${((currentStep - 1) / 2) * 100}%` }} />
          
          {STEP_CONFIG.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep >= s.id;
            const isCurrent = currentStep === s.id;
            
            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isCurrent ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-110" : isActive ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`absolute -bottom-7 text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${isCurrent ? "text-white" : "text-gray-500"}`}>
                  {s.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-16">
        <form onSubmit={handleCreate}>
          
          {/* Step 1: Info Básica */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 lg:p-8">
                <h2 className="text-2xl font-black mb-1 text-white">Información del Proyecto</h2>
                <p className="text-gray-400 text-sm mb-8">Define los detalles generales de tu campaña técnica.</p>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nombre de la campaña</label>
                    <input type="text" value={form.title} onChange={e => update("title", e.target.value)} 
                      className="w-full bg-gray-950 border border-gray-800 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 transition-colors text-lg" 
                      placeholder="Ej. Boost Organic Instagram Reach" required />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Descripción (Objetivo)</label>
                    <textarea value={form.description} onChange={e => update("description", e.target.value)} rows="4"
                      className="w-full bg-gray-950 border border-gray-800 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 transition-colors resize-none" 
                      placeholder="Describe qué esperas lograr con esta campaña para que el sistema la optimice..." />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Categoría *</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => update("category", cat)}
                          className={`px-4 py-2 rounded-xl text-sm transition-all ${
                            form.category === cat
                              ? "bg-gradient-to-r from-blue-600 to-purple-500 text-white shadow-lg shadow-blue-500/20"
                              : "bg-gray-950 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-gray-300"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Configuración de Tarea */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 lg:p-8">
                <h2 className="text-2xl font-black mb-1 text-white">Detalles de la Acción</h2>
                <p className="text-gray-400 text-sm mb-8">¿Qué red social y qué acción específica deben realizar los usuarios?</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Canal / Red Social</label>
                    <select value={form.social_network} onChange={e => update("social_network", e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 text-white rounded-2xl px-5 py-4 appearance-none focus:outline-none focus:border-pink-500 transition-colors font-bold uppercase tracking-wider text-sm cursor-pointer">
                      {SOCIAL_NETWORKS.map(net => <option key={net.id} value={net.id}>{net.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Acción Requerida</label>
                    <select value={form.task_type} onChange={e => update("task_type", e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 text-white rounded-2xl px-5 py-4 appearance-none focus:outline-none focus:border-pink-500 transition-colors font-bold uppercase tracking-wider text-sm cursor-pointer">
                      {TASK_TYPES.map(tt => <option key={tt.id} value={tt.id}>{tt.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Enlace Directo (URL)</label>
                      {form.target_url && (
                        <a 
                          href={form.target_url.startsWith('http') ? form.target_url : `https://${form.target_url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] font-black text-pink-500 hover:text-pink-400 uppercase tracking-widest flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir enlace
                        </a>
                      )}
                    </div>
                    <div className="relative">
                      <ExternalLink className="absolute left-5 top-5 w-4 h-4 text-gray-500" />
                      <input type="url" value={form.target_url} onChange={e => update("target_url", e.target.value)} 
                        className="w-full bg-gray-950 border border-gray-800 text-white rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:border-pink-500 transition-colors text-sm" 
                        placeholder="https://tiktok.com/video/..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Instrucciones Paso a Paso</label>
                    <textarea value={form.instructions} onChange={e => update("instructions", e.target.value)} rows="5"
                      className="w-full bg-gray-950 border border-gray-800 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-pink-500 transition-colors resize-none leading-relaxed" 
                      placeholder="1. Entra al enlace\n2. Da like a la publicación\n3. Comenta algo positivo\n4. Sube captura" required />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Presupuesto */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 lg:p-8">
                <h2 className="text-2xl font-black mb-1 text-white">Presupuesto y Alcance</h2>
                <p className="text-gray-400 text-sm mb-8">Define cuánto pagarás por cada acción y cuántas personas participarán.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 transition-all hover:border-yellow-500/30">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Recompensa x Tarea</label>
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-500/10 p-3 rounded-xl">
                        <Coins className="w-6 h-6 text-yellow-400" />
                      </div>
                      <input type="number" step="0.01" min="0.01" value={form.reward_per_task} onChange={e => update("reward_per_task", e.target.value)} 
                        className="bg-transparent text-white text-3xl font-black focus:outline-none w-full" required />
                      <span className="text-sm font-black text-gray-500">USD</span>
                    </div>
                  </div>

                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 transition-all hover:border-blue-500/30">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Total de Cupos</label>
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/10 p-3 rounded-xl">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                      <input type="number" min="1" value={form.max_participants} onChange={e => update("max_participants", e.target.value)} 
                        className="bg-transparent text-white text-3xl font-black focus:outline-none w-full" required />
                      <span className="text-sm font-black text-gray-500">PERS</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-8 rounded-3xl bg-gradient-to-br from-gray-950 to-gray-900 border border-gray-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-yellow-500/10 transition-colors" />
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                    <div>
                      <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Inversión Total Estimada</div>
                      <div className="text-4xl font-black text-white">
                        <span className="text-yellow-400">$</span>
                        {(Number(form.reward_per_task) * Number(form.max_participants)).toFixed(2)}
                      </div>
                    </div>
                    <div className="hidden sm:block w-px h-12 bg-gray-800" />
                    <div className="text-center sm:text-right">
                      <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Alcance Garantizado</div>
                      <div className="text-xl font-bold text-gray-300">{form.max_participants} Interacciones</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-10">
            {currentStep > 1 ? (
              <button type="button" onClick={prevStep}
                className="bg-gray-900 text-white font-black px-8 py-4 rounded-2xl border border-gray-800 hover:bg-gray-800 transition-all flex items-center gap-2">
                Anterior
              </button>
            ) : <div />}

            {currentStep < 3 ? (
              <button type="button" onClick={nextStep}
                className="bg-white text-black font-black px-10 py-4 rounded-2xl hover:bg-gray-200 transition-all shadow-[0_4px_20px_rgba(255,255,255,0.15)]">
                Continuar
              </button>
            ) : (
              <button type="submit" disabled={!isFormValid || saving}
                className="bg-blue-600 text-white font-black px-12 py-4 rounded-2xl hover:bg-blue-500 transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(37,99,235,0.3)] flex items-center gap-3">
                {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Tag className="w-5 h-5" />}
                {saving ? (editId ? "Guardando..." : "Lanzando...") : (editId ? "Guardar Cambios" : "Lanzar Campaña")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
