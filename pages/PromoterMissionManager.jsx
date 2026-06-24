import { supabase } from "@/supabase";
import { toast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl, formatCurrency, formatPoints } from "@/utils";
import User from "@/entities/User";
import { 
  PlusCircle, Trash2, Edit3, Save, X, AlertCircle, CheckCircle, 
  Wallet, TrendingUp, History, Zap, Clock, Heart, MessageCircle, 
  Share2, Star, Calendar
} from "lucide-react";
import { MISSION_TEMPLATES } from "@/constants/missions";

const EXTENDED_TEMPLATES = [
  ...MISSION_TEMPLATES,
  {
    id: "weekend",
    title: "Bono de Fin de Semana",
    description: "Completa 10 tareas durante el sábado y domingo",
    reward: 1000,
    total: 10,
    icon: Calendar,
    color: "from-green-500 to-emerald-600",
  }
];

export default function PromoterMissionManager() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(0);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Create / Edit Form State
  const [form, setForm] = useState({
    id: null,
    title: "",
    type: "madrugador",
    reward_pts: 500,
    required_actions: 5,
    max_completions: 100,
    status: "active"
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const u = await User.me();
      if (!u) return;
      setUser(u);

      

      // Load Wallet
      const { data: walletData } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", u.id)
        .single();
      
      if (walletData) setWallet(Number(walletData.balance));

      // Load Missions
      const { data: missionsData } = await supabase
        .from("daily_missions")
        .select("*")
        .eq("created_by", u.id)
        .order("created_at", { ascending: false });
      
      setMissions(missionsData || []);
    } catch (err) {
      console.error("Error loading missions:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleTemplateSelect = (template) => {
    setForm({
      id: null,
      title: template.title,
      type: template.id,
      reward_pts: template.reward,
      required_actions: template.total,
      max_completions: 100,
      status: "active"
    });
    setShowCreateModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const totalCost = form.reward_pts * form.max_completions;

    if (wallet < totalCost && !form.id) {
      alert(`Fondos insuficientes. Necesitas $${totalCost} y tienes $${wallet}.`);
      return;
    }

    setSaving(true);
    try {
      

      if (form.id) {
        // UPDATE
        await supabase
          .from("daily_missions")
          .update({
            title: form.title,
            reward_pts: form.reward_pts,
            required_actions: form.required_actions,
            max_completions: form.max_completions,
            status: form.status
          })
          .eq("id", form.id);
      } else {
        // CREATE — primero insertar la misión para obtener su id
        const { data: newMission, error: insertErr } = await supabase
          .from("daily_missions")
          .insert({
            title: form.title,
            type: form.type,
            reward_pts: form.reward_pts,
            required_actions: form.required_actions,
            max_completions: form.max_completions,
            created_by: user.id
          })
          .select("id")
          .single();
        if (insertErr) throw insertErr;

        // Descontar presupuesto de forma atómica en el servidor
        const { error: budgetErr } = await supabase.rpc("deduct_promoter_budget", {
          p_total_cost: totalCost,
          p_mission_id: newMission.id
        });
        if (budgetErr) {
          // Si falla el descuento, eliminar la misión recién creada para no dejarla huérfana
          await supabase.from("daily_missions").delete().eq("id", newMission.id);
          const msg = budgetErr.message || "";
          if (msg.includes("INSUFFICIENT_BUDGET")) throw new Error("Fondos insuficientes.");
          throw budgetErr;
        }

        setWallet(prev => prev - totalCost);
      }

      setShowCreateModal(false);
      loadData();
    } catch (err) {
      console.error("Error saving mission:", err);
      toast.error("Error al procesar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de eliminar esta misión?")) return;
    try {
      
      await supabase.from("daily_missions").delete().eq("id", id);
      loadData();
    } catch (err) {
      console.error("Error deleting mission:", err);
    }
  };

  const handleEdit = (mission) => {
    setForm({
      id: mission.id,
      title: mission.title,
      type: mission.type,
      reward_pts: mission.reward_pts,
      required_actions: mission.required_actions,
      max_completions: mission.max_completions,
      status: mission.status
    });
    setShowCreateModal(true);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Cargando Motor de Misiones...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-500 fill-yellow-500" /> Motor de Misiones Diarias
          </h1>
          <p className="text-gray-400 text-sm mt-1">Crea y gestiona misiones masivas para workers</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4 transition-all hover:border-blue-500/30">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Saldo Promoter</div>
            <div className="text-xl font-black text-white">{formatCurrency(wallet)}</div>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-purple-400" /> Plantillas de Misión
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {EXTENDED_TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <button 
                key={t.id}
                onClick={() => handleTemplateSelect(t)}
                className="group relative h-48 rounded-3xl overflow-hidden border border-gray-800 transition-all hover:border-white/20 hover:scale-[1.02] active:scale-95"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${t.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="absolute inset-0 p-5 flex flex-col justify-between items-start text-left">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-black text-white text-sm uppercase tracking-tight line-clamp-1">{t.title}</div>
                    <div className="text-[10px] text-gray-400 font-medium mt-1 mb-2 line-clamp-2">{t.description}</div>
                    <div className="flex items-center gap-2">
                      <div className="bg-white/10 px-2 py-0.5 rounded-lg text-[10px] font-black text-white">+{t.reward} pts</div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Missions Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <h2 className="font-black flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" /> Misiones Activas
          </h2>
          <span className="text-xs text-gray-500 font-bold">{missions.length} Total</span>
        </div>
        
        {missions.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-700">
              <PlusCircle className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-white font-bold">No hay misiones creadas</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">Selecciona una plantilla para comenzar a distribuir misiones.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/20 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <th className="px-6 py-4">Misión</th>
                  <th className="px-6 py-4">Recompensa</th>
                  <th className="px-6 py-4">Progreso</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {missions.map((m) => {
                  const template = EXTENDED_TEMPLATES.find(t => t.id === m.type) || EXTENDED_TEMPLATES[0];
                  const progress = (m.current_completions / m.max_completions) * 100;
                  return (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                            <template.icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{m.title}</div>
                            <div className="text-[10px] text-gray-500 font-black uppercase tracking-wider">{m.type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-yellow-400 font-black text-sm">{m.reward_pts} pts</div>
                        <div className="text-[10px] text-gray-500">x {m.required_actions} acciones</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-32">
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-gray-400">{m.current_completions}/{m.max_completions}</span>
                            <span className="text-white font-bold">{Math.round(progress)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${template.color} rounded-full transition-all duration-1000`} style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${m.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-700/50 text-gray-400'}`}>
                          {m.status === 'active' ? 'Activa' : 'Pausada'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(m)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(m.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal / Footer Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-blue-500/20 rounded-3xl p-6">
          <TrendingUp className="w-8 h-8 text-blue-400 mb-4" />
          <h3 className="font-black text-white text-lg">Impacto Social</h3>
          <p className="text-gray-400 text-sm mt-2">Tus misiones generan interacciones inmediatas en todas las plataformas conectadas.</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 border border-yellow-500/20 rounded-3xl p-6">
          <Zap className="w-8 h-8 text-yellow-500 mb-4" />
          <h3 className="font-black text-white text-lg">Distribución Masiva</h3>
          <p className="text-gray-400 text-sm mt-2">Al automatizar el presupuesto, miles de workers pueden completar misiones al mismo tiempo.</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20 rounded-3xl p-6">
          <Star className="w-8 h-8 text-green-400 mb-4" />
          <h3 className="font-black text-white text-lg">Retención</h3>
          <p className="text-gray-400 text-sm mt-2">Las misiones diarias mantienen a la comunidad activa y comprometida con tus objetivos.</p>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">{form.id ? 'Editar Misión' : 'Nueva Misión'}</h2>
                <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest font-black">Configura los parámetros de distribución</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Título de la Misión</label>
                <input 
                  type="text" 
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Recompensa (pts)</label>
                  <input 
                    type="number" 
                    value={form.reward_pts} 
                    onChange={e => setForm({...form, reward_pts: Number(e.target.value)})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Acciones req.</label>
                  <input 
                    type="number" 
                    value={form.required_actions} 
                    onChange={e => setForm({...form, required_actions: Number(e.target.value)})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Volumen Máximo (Workers)</label>
                <input 
                  type="number" 
                  value={form.max_completions} 
                  onChange={e => setForm({...form, max_completions: Number(e.target.value)})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 transition-colors"
                  required
                />
              </div>

              {form.id && (
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Estado</label>
                  <select 
                    value={form.status} 
                    onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="active">Activa</option>
                    <option value="paused">Pausada</option>
                  </select>
                </div>
              )}

              <div className="pt-4 p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-blue-400">Inversión requerida</span>
                  <span className="text-[10px] font-black text-blue-400">WALLET: {formatCurrency(wallet)}</span>
                </div>
                <div className="text-3xl font-black text-white">
                  {formatCurrency(form.reward_pts * form.max_completions)}
                </div>
                {wallet < (form.reward_pts * form.max_completions) && !form.id && (
                  <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold mt-2">
                    <AlertCircle className="w-3 h-3" /> Fondos insuficientes para esta configuración
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-800 text-white font-black py-4 rounded-2xl border border-gray-700 hover:bg-gray-750 transition-all uppercase tracking-widest text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving || (wallet < (form.reward_pts * form.max_completions) && !form.id)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black py-4 rounded-2xl shadow-xl hover:opacity-90 transition-all disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {form.id ? 'Guardar Cambios' : 'Lanzar Misión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sticky mobile action */}
      <div className="md:hidden fixed bottom-24 right-6 z-40">
        <button 
          onClick={() => handleTemplateSelect(EXTENDED_TEMPLATES[0])}
          className="w-14 h-14 rounded-full bg-blue-600 shadow-2xl flex items-center justify-center text-white animate-pulse"
        >
          <PlusCircle className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}


