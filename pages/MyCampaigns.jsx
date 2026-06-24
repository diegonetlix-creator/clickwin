import { supabase } from "@/supabase";
import { toast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import User from "@/entities/User";
import { Campaign } from "@/entities/Campaign";
import {
  PlusCircle, Search, TrendingUp, CheckCircle, Clock, XCircle,
  Pause, Play, Eye, BarChart3, Users, Target, Calendar, Zap,
  Pencil, Trash2
} from "lucide-react";

const STATUS_STYLES = {
  active: "bg-green-400/10 text-green-400 border-green-400/20",
  paused: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  completed: "bg-gray-400/10 text-gray-400 border-gray-400/20",
  draft: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  cancelled: "bg-red-400/10 text-red-400 border-red-400/20",
};
const STATUS_LABELS = { active: "Activa", paused: "Pausada", completed: "Completada", draft: "Borrador", cancelled: "Cancelada" };
const NETWORK_COLORS = { instagram: "text-pink-400", youtube: "text-red-400", twitter: "text-blue-400", facebook: "text-blue-600", tiktok: "text-white", linkedin: "text-blue-500" };

export default function MyCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState(null);

  const handleEdit = (c) => {
    // Si la recompensa está empaquetada como ad, o si usamos el check de task_type=custom/social_network=taskbloom
    // Dado que no hay un flag bool is_ad, asumimos por heurísticas que pertenece a CreateAd
    const isAd = c.social_network === "taskbloom" || c.task_type === "custom";
    const editRoute = isAd ? createPageUrl("CreateAd") : createPageUrl("CreateCampaign");
    
    navigate(editRoute, {
      state: {
        mode: "edit",
        campaignId: c.id
      }
    });
  };

  useEffect(() => {
    const loadCampaigns = async () => {
      setLoading(true);
      try {
        const u = await User.me();
        console.warn("Usuario actual:", u);
        
        // Intentamos filtrar por email
        let c = await Campaign.filter({ promoter_email: u?.email }, '-created_at', 100).catch(() => []);
        
        // Si no hay campañas por email, cargamos las últimas 50 sin filtro para asegurar que aparezcan
        if (c.length === 0) {
          console.warn("No se encontraron por email, cargando generales...");
          c = await Campaign.list('-created_at', 50).catch(() => []);
        }

        console.warn("Campañas finales:", c);
        setCampaigns(c);
      } catch (err) {
        console.error("Error crítico MyCampaigns:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  const toggleStatus = async (campaign) => {
    setUpdating(campaign.id);
    const newStatus = campaign.status === "active" ? "paused" : "active";
    try {
        await Campaign.update(campaign.id, { status: newStatus });
        setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c));
    } catch (e) { console.error(e); }
    setUpdating(null);
  };
  
  const deleteCampaign = (id) => {
    setConfirmDialog({
      message: "¿Eliminar esta campaña? Esta acción no se puede deshacer y eliminará todas las tareas asociadas.",
      onConfirm: () => doDeleteCampaign(id),
    });
  };

  const doDeleteCampaign = async (id) => {
    setUpdating(id);
    try {
      await Campaign.delete(id);
      
      // Also delete associated feed posts and tasks
      
      await supabase.from("feed_posts").delete().eq("campaign_id", id);
      await supabase.from("tasks").delete().eq("campaign_id", id);
      
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar. Intenta de nuevo.");
    }
    setUpdating(null);
  };

  const filtered = campaigns
    .filter(c => statusFilter === "all" || c.status === statusFilter)
    .filter(c => !search || c.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Mis campañas</h1>
          <p className="text-gray-400 text-sm mt-1">{campaigns.length} campañas en total</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl("CreateAd")}
            className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-gray-400 font-bold px-5 py-3 rounded-xl hover:text-white hover:bg-gray-800 transition-all">
            <Zap className="w-5 h-5 text-yellow-400" /> Editor Rápido
          </Link>
          <Link to={createPageUrl("CreateCampaign")}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold px-5 py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
            <PlusCircle className="w-5 h-5" /> Nueva campaña
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar campañas..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400" />
        </div>
        <div className="flex gap-2">
          {["all", "active", "paused", "completed", "draft"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${statusFilter === s ? "bg-blue-500 text-white" : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"}`}>
              {s === "all" ? "Todas" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-semibold">No hay campañas</p>
          <Link to={createPageUrl("CreateCampaign")} className="inline-flex items-center gap-2 mt-4 bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-colors text-sm">
            <PlusCircle className="w-4 h-4" /> Crear primera campaña
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((c) => {
            const progress = c.max_participants > 0 ? Math.min(((c.current_participants || 0) / c.max_participants) * 100, 100) : 0;
            const netColor = NETWORK_COLORS[c.social_network] || "text-gray-400";
            const statusStyle = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
            return (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{c.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium ${netColor}`}>{c.social_network}</span>
                      <span className="text-gray-600">·</span>
                      <span className="text-xs text-gray-500">{c.task_type}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ml-2 flex-shrink-0 ${statusStyle}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-gray-800 rounded-lg p-2 text-center">
                    <div className="text-green-400 font-bold text-sm">{c.approved_count || 0}</div>
                    <div className="text-xs text-gray-500">Aprobadas</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2 text-center">
                    <div className="text-yellow-400 font-bold text-sm">{c.pending_count || 0}</div>
                    <div className="text-xs text-gray-500">Pendientes</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2 text-center">
                    <div className="text-red-400 font-bold text-sm">{c.rejected_count || 0}</div>
                    <div className="text-xs text-gray-500">Rechazadas</div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Participantes</span>
                    <span>{c.current_participants || 0} / {c.max_participants}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="bg-blue-400 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-400">Recompensa: </span>
                    <span className="text-green-400 font-bold">{c.reward_per_task} pts</span>
                  </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(c)}
                        className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                        title="Editar Campaña"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      
                      <button 
                        onClick={() => deleteCampaign(c.id)} 
                        disabled={updating === c.id}
                        className="p-2 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                        title="Eliminar Campaña"
                      >
                        {updating === c.id ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>

                      {(c.status === "active" || c.status === "paused") && (
                        <button onClick={() => toggleStatus(c)} disabled={updating === c.id}
                          className={`p-2 rounded-lg transition-colors ${c.status === "active" ? "bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20" : "bg-green-400/10 text-green-400 hover:bg-green-400/20"}`}
                          title={c.status === "active" ? "Pausar" : "Reanudar"}
                        >
                          {updating === c.id ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : c.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      )}
                      
                      <Link 
                        to={createPageUrl(`ReviewTasks`)} 
                        className="p-2 rounded-lg bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 transition-colors"
                        title="Ver Entregas"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          confirmLabel="Eliminar"
          danger
        />
      )}
    </>
  );
}

