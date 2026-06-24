import { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { toast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { 
  Plus, Edit2, Trash2, Image as ImageIcon, Sparkles, 
  Coins, Wallet, X, Save, AlertCircle, CheckCircle,
  Search, Filter, ChevronDown, MoreVertical, Eye,
  ArrowUpDown, ExternalLink, Gift
} from "lucide-react";
import { uploadFile } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/utils";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

export default function ManagePrizes() {
  const { user } = useAuth();
  const [prizes, setPrizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPrize, setEditingPrize] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("stock"); // "stock" or "redemptions"
  const [redemptions, setRedemptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    cost: 0,
    cost_type: "points",
    image_url: "",
    category: "",
    stock: -1,
    is_active: true
  });

  useEffect(() => {
    loadPrizes();
    loadRedemptions();
  }, []);

  const loadPrizes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("prizes")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (user.role !== 'admin') {
        query = query.eq("created_by", user.id).eq("is_global", false);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setPrizes(data || []);
    } catch (err) {
      console.error("Error loading prizes:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRedemptions = async () => {
    if (!user) return;
    try {
      let query = supabase
        .from("redemptions")
        .select("*, profiles(name, email)")
        .order("created_at", { ascending: false });

      if (user.role !== 'admin') {
        const { data: myPrizes } = await supabase
          .from("prizes")
          .select("id")
          .eq("created_by", user.id);
        
        const prizeIds = (myPrizes || []).map(p => p.id);
        if (prizeIds.length > 0) {
          query = query.in("prize_id", prizeIds);
        } else {
          setRedemptions([]);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setRedemptions(data || []);
    } catch (err) {
      console.error("Error loading redemptions:", err);
    }
  };

  const updateRedemptionStatus = async (id, status) => {
    try {
      const { error } = await supabase.from("redemptions").update({ status }).eq("id", id);
      if (error) throw error;
      setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) {
      toast.error("Error al procesar. Intenta de nuevo.");
    }
  };

  const handleEdit = (prize) => {
    setEditingPrize(prize);
    setForm({
      title: prize.title,
      description: prize.description,
      cost: prize.cost,
      cost_type: prize.cost_type,
      image_url: prize.image_url,
      category: prize.category,
      stock: prize.stock,
      is_active: prize.is_active
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este premio permanentemente?")) return;
    try {
      const { error } = await supabase.from("prizes").delete().eq("id", id);
      if (error) throw error;
      setPrizes(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      toast.error("Error al procesar. Intenta de nuevo.");
    }
  };

  const toggleStatus = async (prize) => {
    const newStatus = !prize.is_active;
    try {
      const { error } = await supabase
        .from("prizes")
        .update({ is_active: newStatus })
        .eq("id", prize.id);
      if (error) throw error;
      setPrizes(prev => prev.map(p => p.id === prize.id ? { ...p, is_active: newStatus } : p));
    } catch (err) {
      toast.error("Error al procesar. Intenta de nuevo.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      if (editingPrize) {
        const { error } = await supabase
          .from("prizes")
          .update({
            ...form,
            is_global: user.role === 'admin' ? form.is_global : false
          })
          .eq("id", editingPrize.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("prizes")
          .insert([{
            ...form,
            created_by: user.id,
            is_global: user.role === 'admin' ? (form.is_global || false) : false
          }]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingPrize(null);
      loadPrizes();
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      const { url } = await uploadFile(file);
      setForm(prev => ({ ...prev, image_url: url }));
    } catch (err) {
      toast.error("Error al procesar. Intenta de nuevo.");
    }
  };

  const filteredPrizes = prizes.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- LOGICA DE RENDERIZADO (REFACTOR UX PRO) ---
  let mainContent;

  if (loading) {
    mainContent = <LoadingSkeleton message="Sincronizando Almacén" />;
  } else if (activeTab === "stock") {
    if (filteredPrizes.length === 0) {
      mainContent = (
        <EmptyState 
          title="Sin Premios" 
          message="No has creado premios todavía o no coinciden con tu búsqueda."
          icon={Gift}
        />
      );
    } else {
      mainContent = (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/20">
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Premio</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Costo</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Stock</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Estado</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPrizes.map((prize) => (
                <tr key={prize.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 bg-black">
                        <img src={prize.image_url || "https://images.unsplash.com/photo-1594432244243-7f311c7fa9d0?w=400&auto=format"} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-black text-white">{prize.title}</p>
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">{prize.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`text-sm font-black ${prize.cost_type === 'points' ? 'text-yellow-400' : 'text-green-400'}`}>
                      {prize.cost.toLocaleString()} {prize.cost_type === 'points' ? 'PTS' : 'USD'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-gray-400 font-bold">{prize.stock === -1 ? '∞' : prize.stock}</span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button onClick={() => toggleStatus(prize)} className={`text-[10px] font-black px-4 py-2 rounded-xl border ${prize.is_active ? 'border-green-500/20 text-green-500 bg-green-500/5' : 'border-red-500/20 text-red-500 bg-red-500/5'}`}>
                      {prize.is_active ? 'ACTIVO' : 'PAUSADO'}
                    </button>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(prize)} className="p-2.5 bg-white/5 hover:bg-white hover:text-black rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(prize.id)} className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  } else {
    if (redemptions.length === 0) {
      mainContent = (
        <EmptyState 
          title="Sin Canjes" 
          message="No hay solicitudes de canje para tus premios en este momento."
          icon={CheckCircle}
        />
      );
    } else {
      mainContent = (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/20">
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Usuario</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Premio</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Estado</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {redemptions.map((red) => (
                <tr key={red.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-6">
                    <p className="font-black text-white">{red.profiles?.name || "Usuario"}</p>
                    <p className="text-[10px] text-gray-600 font-bold">{red.profiles?.email}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-white text-sm">{red.prize_title}</p>
                    <p className="text-[10px] text-gray-500">{new Date(red.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black ${
                      red.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                      red.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                      'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {red.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <select 
                      value={red.status} 
                      onChange={(e) => updateRedemptionStatus(red.id, e.target.value)}
                      className="bg-black/40 border border-white/10 text-[10px] font-bold rounded-lg px-2 py-1 outline-none focus:border-blue-500"
                    >
                      <option value="pending">PENDIENTE</option>
                      <option value="delivered">ENTREGADO</option>
                      <option value="cancelled">CANCELADO</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gray-900 border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-400" />
            Gestión de Premios
          </h1>
          <p className="text-gray-400 font-medium mt-2 max-w-md">Control de inventario y seguimiento de canjes en ClickWin.</p>
        </div>
        <div className="flex gap-3 relative z-10">
          <div className="bg-black/40 border border-white/5 p-1.5 rounded-2xl flex gap-1">
            <button onClick={() => setActiveTab("stock")} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${activeTab === "stock" ? "bg-white text-black" : "text-gray-500 hover:text-white"}`}>ALMACÉN</button>
            <button onClick={() => setActiveTab("redemptions")} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${activeTab === "redemptions" ? "bg-white text-black" : "text-gray-500 hover:text-white"}`}>CANJES</button>
          </div>
          <button 
            onClick={() => { setEditingPrize(null); setForm({ title: "", description: "", cost: 0, cost_type: "points", image_url: "", category: "", stock: -1, is_active: true }); setIsModalOpen(true); }}
            className="bg-blue-500 text-white font-black px-6 py-3.5 rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/10 active:scale-95 flex items-center gap-2 text-xs"
          >
            <Plus className="w-4 h-4" /> NUEVO
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
          <input 
            type="text" 
            placeholder={activeTab === "stock" ? "Buscar premios..." : "Buscar canjes por usuario o premio..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-white focus:border-blue-500/50 transition-all outline-none text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button className="bg-gray-900 border border-white/5 px-6 py-4 rounded-2xl text-gray-400 font-bold text-sm flex items-center gap-2 hover:bg-gray-800 transition-all">
            <Filter className="w-4 h-4" /> Filtros
          </button>
          <button onClick={loadPrizes} className="bg-gray-900 border border-white/5 px-4 py-4 rounded-2xl text-gray-400 hover:text-white transition-all">
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main View Transition */}
      <div className="bg-gray-900 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl min-h-[400px]">
        {mainContent}
      </div>

      {/* Modal Reutilizado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-white/10 rounded-[3.5rem] p-10 lg:p-14 w-full max-w-3xl shadow-[0_0_150px_rgba(0,0,0,0.8)] my-auto animate-in zoom-in duration-500">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    {editingPrize ? <Edit2 className="w-7 h-7 text-white" /> : <Plus className="w-7 h-7 text-white" />}
                 </div>
                 <div>
                    <h2 className="text-4xl font-black text-white italic -skew-x-6">{editingPrize ? "EDITAR" : "CREAR"} PREMIO</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Configuración técnica de recompensa</p>
                 </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/20 hover:text-white p-4 bg-white/5 hover:bg-white/10 rounded-3xl transition-all"><X className="w-7 h-7" /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> Nombre del Premio
                  </label>
                  <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="Ej: Amazon Gift Card $10" className="w-full bg-black/60 border-2 border-white/5 rounded-3xl px-6 py-5 text-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-700" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    <TagIcon className="w-3 h-3" /> Categoría
                  </label>
                  <input value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    placeholder="Ej: Gaming / Tech" className="w-full bg-black/60 border-2 border-white/5 rounded-3xl px-6 py-5 text-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-700" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                   <InfoIcon className="w-3 h-3" /> Detalles / Instrucciones
                </label>
                <textarea rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Describe qué recibirá el usuario y cómo redimirlo..." className="w-full bg-black/60 border-2 border-white/5 rounded-3xl px-6 py-5 text-white focus:border-blue-500 outline-none transition-all resize-none placeholder:text-gray-700" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                     <Coins className="w-3 h-3" /> Costo
                  </label>
                  <input type="number" required value={form.cost} onChange={e => setForm({...form, cost: Number(e.target.value)})}
                    className="w-full bg-black/60 border-2 border-white/5 rounded-3xl px-6 py-5 text-white focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] px-2">Tipo de Divisa</label>
                  <select value={form.cost_type} onChange={e => setForm({...form, cost_type: e.target.value})}
                    className="w-full bg-black/60 border-2 border-white/5 rounded-3xl px-6 py-5 text-white focus:border-blue-400 outline-none transition-all cursor-pointer">
                    <option value="points">Puntos ClickWin</option>
                    <option value="money">Saldo USD ($)</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] px-2">Stock Disponible</label>
                  <input type="number" required value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})}
                    className="w-full bg-black/60 border-2 border-white/5 rounded-3xl px-6 py-5 text-white focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                   <ImageIcon className="w-3 h-3" /> Imagen Representativa
                </label>
                <div className="flex gap-4">
                  <input value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})}
                    placeholder="https://imgur.com/..." className="flex-1 bg-black/60 border-2 border-white/5 rounded-3xl px-6 py-5 text-white text-xs focus:border-blue-500 outline-none transition-all" />
                  <label className="w-20 h-20 rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all">
                    <Plus className="w-7 h-7 text-white/20" />
                    <input type="file" className="hidden" onChange={e => handleImageUpload(e.target.files[0])} />
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-black py-6 rounded-[2rem] transition-all uppercase tracking-widest text-xs">Descartar</button>
                <button type="submit" disabled={processing} className="flex-[2] bg-white hover:bg-gray-200 text-black font-black py-6 rounded-[2rem] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-2xl active:scale-95">
                  {processing ? <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" /> : <Save className="w-6 h-6" />}
                  GUARDAR CONFIGURACIÓN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components icons mapping (Fixed naming to avoid conflict)
function TagIcon({ className }) { return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>; }
function InfoIcon({ className }) { return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>; }


