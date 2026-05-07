import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Shield, History, Search, Filter, ArrowLeft, RefreshCw, 
  User, Database, Activity, Calendar, ChevronDown, CheckCircle,
  XCircle, AlertTriangle, Info, Zap, Trash2, Edit3, Lock
} from "lucide-react";

/**
 * AdminLogs — Premium Audit Trail Dashboard
 */
export default function AdminLogs() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { navigate("/"); return; }
    fetchLogs();
  }, [isAdmin, authLoading]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_logs")
        .select(`*, admin:profiles(name, email)`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("[AdminLogs] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    if (action.includes("approve")) return <CheckCircle className="text-green-400" />;
    if (action.includes("reject") || action.includes("ban")) return <XCircle className="text-red-400" />;
    if (action.includes("delete")) return <Trash2 className="text-red-500" />;
    if (action.includes("update") || action.includes("edit")) return <Edit3 className="text-blue-400" />;
    if (action.includes("insert") || action.includes("create")) return <Zap className="text-yellow-400" />;
    return <Info className="text-gray-400" />;
  };

  const filtered = logs.filter(l => {
    const term = search.toLowerCase();
    const matchesSearch = !search || 
      l.action.toLowerCase().includes(term) ||
      l.target_table?.toLowerCase().includes(term) ||
      l.admin?.email?.toLowerCase().includes(term);
    const matchesAction = filterAction === "all" || l.action.startsWith(filterAction);
    return matchesSearch && matchesAction;
  });

  if (authLoading || loading && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-gray-500 animate-pulse font-black uppercase tracking-widest text-[10px]">Cargando Auditoría...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-700">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <button onClick={() => navigate("/admin-dashboard")}
            className="flex items-center gap-2 text-gray-500 hover:text-white mb-3 transition-colors group text-[10px] font-black uppercase tracking-[0.2em]">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            Dashboard
          </button>
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">Logs de Auditoría</h1>
          <p className="text-gray-500 text-sm mt-2 font-medium">Historial completo de acciones administrativas y cambios en el sistema</p>
        </div>
        <button onClick={fetchLogs}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 border border-white/5 rounded-2xl text-gray-400 hover:text-white hover:border-white/20 transition-all text-xs font-black">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          SINCRONIZAR
        </button>
      </div>

      {/* ── FILTERS ── */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Buscar por acción, tabla o email del admin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
          />
        </div>
        <div className="relative min-w-[200px]">
          <select 
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full appearance-none bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all cursor-pointer"
          >
            <option value="all">Todas las acciones</option>
            <option value="approve">Aprobaciones</option>
            <option value="reject">Rechazos</option>
            <option value="delete">Eliminaciones</option>
            <option value="update">Actualizaciones</option>
            <option value="insert">Creaciones</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* ── LOGS TABLE ── */}
      <div className="bg-gray-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Momento</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Administrador</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Acción</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Objetivo</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="text-xs font-bold text-white">
                          {new Date(log.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <User className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white">{log.admin?.name || "Admin"}</div>
                        <div className="text-[10px] text-gray-500 font-medium">{log.admin?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2.5">
                      {getActionIcon(log.action)}
                      <span className="text-xs font-black uppercase tracking-wider text-gray-300">
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-[10px] font-black text-gray-500 uppercase">
                        {log.target_table || "SYSTEM"}
                      </span>
                      {log.target_id && (
                        <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-gray-600 font-mono">
                          {log.target_id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="text-[10px] font-black text-violet-400 hover:text-white transition-colors bg-violet-400/5 hover:bg-violet-400/20 px-3 py-1.5 rounded-lg border border-violet-400/10"
                    >
                      VER JSON
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filtered.length === 0 && (
          <div className="py-32 text-center">
            <Activity className="w-12 h-12 text-gray-800 mx-auto mb-4 opacity-20" />
            <p className="text-gray-600 font-black uppercase tracking-widest text-xs">No se encontraron logs</p>
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ── */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-8 animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-white/10 rounded-[3rem] p-10 w-full max-w-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">Detalle de Acción</h3>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">{selectedLog.action}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-2xl transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-black/60 rounded-[2rem] p-8 border border-white/5 max-h-[400px] overflow-auto scrollbar-hide">
              <pre className="text-xs text-blue-300 font-mono leading-relaxed">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="mt-8 flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
              <span>Admin: {selectedLog.admin?.email}</span>
              <span>ID: {selectedLog.id}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER INFO ── */}
      <div className="flex items-center gap-4 px-8 py-5 bg-white/[0.02] border border-white/5 rounded-3xl">
        <Shield className="w-5 h-5 text-violet-400" />
        <p className="text-xs text-gray-500 leading-relaxed italic">
          Este sistema registra automáticamente cambios de estado, aprobaciones de tareas, y eliminaciones. Los registros son inmutables y cumplen con los estándares de seguridad de datos.
        </p>
      </div>
    </div>
  );
}
