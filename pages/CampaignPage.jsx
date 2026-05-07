import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, Share2, Users, Zap, CheckCircle2, 
  ArrowRight, Loader2, Info, Heart, MessageCircle, Send, Play
} from "lucide-react";
import { supabase } from "@/supabase";
import CardWrapper from "@/components/ui/CardWrapper";
import "@/styles/campaign.css";

export default function CampaignPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastSubmittedTask, setLastSubmittedTask] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());

  useEffect(() => {
    loadData();
    setStartTime(new Date()); // Track when user entered the page
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Campaign
      const { data: camp, error: campErr } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campErr) throw campErr;
      setCampaign(camp);

      // 2. Fetch Tasks
      const { data: tks, error: tksErr } = await supabase
        .from("tasks")
        .select("*")
        .eq("campaign_id", id)
        .eq("status", "active");

      if (tksErr) throw tksErr;
      setTasks(tks || []);

    } catch (err) {
      console.error("Campaign Page Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskAction = async (task) => {
    if (completedTaskIds.has(task.id)) return;
    
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // 1. RATE LIMIT CHECK
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { count: recentTasks } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("worker_id", user.id)
        .gt("created_at", oneMinuteAgo);

      if (recentTasks >= 5) {
        throw new Error("Límite de tareas excedido. Por favor espera un minuto.");
      }

      // 2. TIME CHECK (Started at least 10s ago)
      const now = new Date();
      const executionTime = (now - startTime) / 1000;
      if (executionTime < 10) {
        throw new Error("Tarea completada demasiado rápido. Asegúrate de seguir los pasos correctamente.");
      }

      const { error } = await supabase
        .from("submissions")
        .insert({
          task_id: task.id,
          worker_id: user.id,
          status: "pending",
          campaign_title: campaign.title,
          social_network: task.social_network,
          reward: task.reward,
          task_type: task.task_type,
          started_at: startTime.toISOString()
        });

      if (error) {
        if (error.code === '23505') throw new Error("Ya has enviado esta tarea.");
        throw error;
      }

      setLastSubmittedTask(task);
      setCompletedTaskIds(prev => new Set([...prev, task.id]));
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error("Submission error:", err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Cargando Campaña</p>
    </div>
  );

  return (
    <div className="campaign-detail-page">
      {/* HEADER ACTIONS */}
      <div className="header-nav">
        <button className="nav-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <button className="nav-btn">
          <Share2 size={20} />
        </button>
      </div>

      {/* HERO SECTION */}
      <div className="campaign-hero">
        <img 
          src={campaign.reference_image_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop"} 
          alt={campaign.title} 
          className="hero-img"
        />
      </div>

      <div className="campaign-body">
        {success && (
          <div className="excellent-box animate-in slide-in-from-top-4 duration-500 mb-8">
            <div className="excellent-content">
              <div className="excellent-icon"><CheckCircle2 size={24} /></div>
              <div className="excellent-info">
                <h3>¡Excelente!</h3>
                <p>Tarea enviada correctamente. +{lastSubmittedTask?.reward} puntos en camino 🚀</p>
              </div>
            </div>
            <button className="close-excellent" onClick={() => setSuccess(false)}>×</button>
          </div>
        )}

        <h1 className="camp-title">{campaign.title}</h1>
        <p className="camp-desc">{campaign.description}</p>

        {/* STATS BAR */}
        <div className="camp-stats-bar">
          <div className="stat-item">
            <span className="stat-value">+{campaign.reward_per_task || 0} pts</span>
            <span className="stat-label">Recompensa</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">{((campaign.current_participants || 0) / 1000).toFixed(1)}K</span>
            <span className="stat-label">Participantes</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value text-green-400">Activo</span>
            <span className="stat-label">Estado</span>
          </div>
        </div>

        {/* ABOUT SECTION */}
        <section className="info-section">
          <h2 className="section-title"><Info size={16} /> Acerca de la campaña</h2>
          <p className="section-text">
            Disfruta de las mejores dinámicas y participa para ganar premios increíbles. 
            Completa las tareas a continuación para acumular puntos.
          </p>
        </section>

        {/* TASKS SECTION */}
        <section className="tasks-section" id="tasks-list">
          <h2 className="section-title">Tareas disponibles</h2>
          
          <div className="tasks-list">
            {tasks.map((task) => {
              const isCompleted = completedTaskIds.has(task.id);
              return (
                <CardWrapper key={task.id} className={`task-mini-card ${isCompleted ? 'opacity-60' : ''}`}>
                  <div className="task-mini-content">
                    <div className="task-mini-left">
                      <div className="task-type-icon">
                        {task.task_type === 'like' && <Heart size={18} className="text-pink-500" />}
                        {task.task_type === 'comment' && <MessageCircle size={18} className="text-blue-500" />}
                        {task.task_type === 'share' && <Send size={18} className="text-indigo-500" />}
                        {task.task_type === 'watch_video' && <Play size={18} className="text-red-500" />}
                      </div>
                      <div className="task-mini-info">
                        <span className="task-mini-title">{task.task_type === 'like' ? 'Dale like a la publicación' : task.task_type === 'comment' ? 'Comenta tu opinión' : 'Interactuar'}</span>
                        <div className="flex items-center gap-2">
                           <span className="task-mini-points">+{task.reward} pts</span>
                           {isCompleted && <CheckCircle2 size={12} className="text-green-500" />}
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      className={`task-action-btn ${isCompleted ? '!bg-green-500/20 !text-green-500 border border-green-500/20' : ''}`}
                      disabled={submitting || isCompleted}
                      onClick={() => handleTaskAction(task)}
                    >
                      {submitting ? <Loader2 className="animate-spin" size={14} /> : isCompleted ? <CheckCircle2 size={14} /> : "Hacer"}
                    </button>
                  </div>
                </CardWrapper>
              );
            })}

            {tasks.length === 0 && (
              <div className="text-center py-8 opacity-40 text-xs uppercase tracking-widest font-black">
                No hay tareas disponibles hoy
              </div>
            )}
          </div>
        </section>

        <button 
          className="btn-primary-pro mt-8"
          onClick={() => document.getElementById('tasks-list').scrollIntoView({ behavior: 'smooth' })}
        >
          Ver tareas
        </button>
      </div>
    </div>
  );
}
