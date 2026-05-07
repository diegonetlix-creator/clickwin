import { useState, useEffect } from "react";
import User from "@/entities/User";
import { Task } from "@/entities/Task";
import {
  History, CheckCircle, Clock, XCircle, Target, Instagram, Youtube,
  Twitter, Facebook, Heart, MessageCircle, Share2, Eye, Bookmark,
  Play, Camera, Users, Filter
} from "lucide-react";

const STATUS_STYLES = {
  pending: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  approved: "bg-green-400/10 text-green-400 border-green-400/20",
  rejected: "bg-red-400/10 text-red-400 border-red-400/20",
  submitted: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
};
const STATUS_LABELS = { 
  pending: "En revisión", 
  submitted: "En revisión",
  approved: "Aprobada", 
  rejected: "Rechazada" 
};
const TASK_LABELS = { like: "Like", comment: "Comentario", follow: "Seguir", share: "Compartir", save: "Guardar", view_story: "Ver Historia", watch_video: "Ver Video", screenshot: "Captura", specific_comment: "Comentario Específico", visit_profile: "Visitar Perfil" };
const NETWORK_COLORS = { instagram: "text-pink-400", youtube: "text-red-400", twitter: "text-blue-400", facebook: "text-blue-600", tiktok: "text-white", linkedin: "text-blue-500" };

export default function WorkerHistory() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { supabase } = await import("@/supabase");
      const u = await User.me();
      if (!u) {
        setLoading(false);
        return;
      }
      
      // 1. Fetch standard submissions
      const { data: stdSubs, error: stdErr } = await supabase
        .from("submissions")
        .select("*")
        .eq("worker_id", u.id)
        .order("created_at", { ascending: false });

      if (stdErr) console.error("Error standard subs:", stdErr);

      // 2. Fetch social submissions
      const { data: socSubs, error: socErr } = await supabase
        .from("social_task_submissions")
        .select("*, social_tasks(title, platform, reward)")
        .eq("worker_id", u.id)
        .order("created_at", { ascending: false });

      if (socErr) console.error("Error social subs:", socErr);

      // 3. Consolidate
      const consolidated = [
        ...(stdSubs || []).map(s => ({
          ...s,
          type: 'standard',
          title: s.campaign_title || "Tarea Estándar",
          platform: s.social_network,
          reward: s.reward
        })),
        ...(socSubs || []).map(s => ({
          ...s,
          type: 'social',
          title: s.social_tasks?.title || "Tarea Social",
          platform: s.social_tasks?.platform,
          reward: s.social_tasks?.reward
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setTasks(consolidated);
    } catch (err) {
      console.error("Error cargando historial:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = tab === "all" ? tasks : tasks.filter(t => {
    if (tab === "submitted") return t.status === "pending" || t.status === "submitted";
    return t.status === tab;
  });

  const counts = {
    all: tasks.length,
    approved: tasks.filter(t => t.status === "approved").length,
    submitted: tasks.filter(t => t.status === "pending" || t.status === "submitted").length,
    rejected: tasks.filter(t => t.status === "rejected").length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black">Mi historial</h1>
        <p className="text-gray-400 text-sm mt-1">Todas tus tareas realizadas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 flex-wrap">
        {[
          { id: "all", label: `Todas (${counts.all})` },
          { id: "approved", label: `Aprobadas (${counts.approved})` },
          { id: "submitted", label: `En revisión (${counts.submitted})` },
          { id: "rejected", label: `Rechazadas (${counts.rejected})` },
        ].map(t => {
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${isActive ? "bg-gray-700 text-white shadow-lg" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}>
              {t.id === 'approved' && isActive && "✅"}
              {t.id === 'submitted' && isActive && "⏳"}
              {t.id === 'rejected' && isActive && "❌"}
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <History className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-semibold">No hay tareas en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const statusStyle = STATUS_STYLES[task.status] || "bg-gray-400/10 text-gray-400";
            const netColor = NETWORK_COLORS[task.social_network] || "text-gray-400";
            return (
              <div key={task.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${NETWORK_COLORS[task.platform?.toLowerCase()] || "text-gray-400"}`}>
                        {task.platform || "ClickWin"}
                      </span>
                      <span className="text-gray-600">·</span>
                      <span className="text-xs text-gray-400">
                        {task.type === 'social' ? 'Crecimiento Social' : (TASK_LABELS[task.task_type] || task.task_type || 'Tarea')}
                      </span>
                    </div>
                    <div className="font-semibold text-sm truncate">{task.title}</div>
                    {task.rejection_reason && (
                      <div className="text-xs text-red-400 mt-1">Motivo: {task.rejection_reason}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Enviada: {new Date(task.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${statusStyle}`}>
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                    <span className={`text-sm font-bold ${task.status === "approved" ? "text-green-400" : task.status === "rejected" ? "text-red-400" : "text-yellow-400"}`}>
                      {task.status === "approved" ? "+" : ""}{task.reward} pts
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
