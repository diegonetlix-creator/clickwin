import { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { TrendingUp, AlertTriangle, Play, Pause, Trash2, Search, CheckSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      // Getting profiles alongside campaigns might require join, but we will just fetch.
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (campaign) => {
    try {
      setProcessing(campaign.id);
      const newStatus = campaign.status === "paused" ? "active" : "paused";
      
      const { error } = await supabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", campaign.id);

      if (error) throw error;
      
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c));
    } catch (err) {
      console.error("Error toggling campaign:", err);
      alert("Error: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const deleteCampaign = async (campaignId) => {
    try {
      if(!window.confirm(`ATENCIÓN: ¿Seguro que deseas eliminar permanentemente esta campaña y todas sus interacciones adjuntas?`)) return;

      setProcessing(campaignId);
      
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;
      
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (err) {
      console.error("Error deleting campaign:", err);
      alert("Error al borrar: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const filteredCampaigns = campaigns.filter(c =>
    !search || 
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.social_network?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-green-400" /> Control Global de Campañas
        </h1>
        <p className="text-gray-400 text-sm mt-1">{campaigns.length} campañas activas en el servidor</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título o red..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-400" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800 text-xs text-gray-500 font-semibold uppercase tracking-wider">
              <div className="col-span-1">Estado</div>
              <div className="col-span-4">Campaña / Promotor</div>
              <div className="col-span-2 text-center">Interacciones req</div>
              <div className="col-span-2 text-center">Presupuesto ($)</div>
              <div className="col-span-3 text-center">Acciones</div>
            </div>
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No hay campañas que coincidan con la búsqueda</div>
            ) : filteredCampaigns.map((c) => {
              const promoterName = c.promoter_name || c.promoter_email || "Desconocido";
              
              return (
                <div key={c.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800 last:border-0 items-center hover:bg-gray-800/50 transition-colors">
                  
                  <div className="col-span-1 flex justify-center">
                    <div className={`w-3 h-3 rounded-full ${c.status === "active" ? "bg-green-400" : c.status === "paused" ? "bg-yellow-400 text-yellow-400" : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)] animate-pulse"}`} title={c.status} />
                  </div>
                  
                  <div className="col-span-4 min-w-0">
                    <div className="text-sm font-semibold truncate text-white">{c.title}</div>
                    <div className="text-[11px] text-gray-500 truncate mt-0.5">
                      {c.social_network} • Por: <span className="text-blue-400">{promoterName}</span>
                    </div>
                  </div>
                  
                  <div className="col-span-2 text-center">
                    <div className="text-sm font-bold text-gray-300">{c.required_interactions || 0}</div>
                  </div>
                  
                  <div className="col-span-2 text-center">
                    <div className="text-sm font-bold text-green-400">${c.cost_per_action || 0}</div>
                    <div className="text-[10px] text-gray-500">c/u</div>
                  </div>
                  
                  <div className="col-span-3 flex justify-center items-center gap-2">
                    <button onClick={() => toggleStatus(c)} disabled={processing === c.id}
                      title={c.status === "paused" ? "Re-activar campaña" : "Pausar forzosamente"}
                      className={`p-1.5 rounded-lg transition-colors ${c.status === "paused" ? "bg-green-400/10 text-green-400 hover:bg-green-400/20" : "bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20"}`}>
                      {processing === c.id ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : c.status === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                    
                    <button onClick={() => deleteCampaign(c.id)} disabled={processing === c.id}
                      title="Eliminar del sistema"
                      className="p-1.5 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
