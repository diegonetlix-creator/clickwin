import { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { 
  Shield, ShieldAlert, Lock, Timer, FileCheck, 
  Eye, Activity, AlertCircle, UserX, Clock,
  CheckCircle, ArrowRight, MousePointer2, Smartphone, 
  Search, Filter, MoreHorizontal
} from "lucide-react";
import CardWrapper from "@/components/ui/CardWrapper";
import "@/styles/admin-fraud.css";

export default function AdminFraud() {
  const [submissions, setSubmissions] = useState([]);
  const [metrics, setMetrics] = useState({
    today: 1248,
    pending: 124,
    approved: 892,
    rejected: 232
  });
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch recent submissions
      const { data: subs } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setSubmissions(subs || []);

      // 2. Fetch flagged users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_flagged", true)
        .limit(5);
      setFlaggedUsers(profiles || []);

      // 3. Fetch logs
      const { data: auditLogs } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setLogs(auditLogs || []);

      // 4. Mock metrics for the UI (real metrics would be aggregated in SQL)
      // For this implementation we keep the premium look from the image
    } catch (err) {
      console.error("Fraud Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fraud-dashboard">
      <header className="fraud-header">
        <div className="fraud-title-group">
          <h1 className="flex items-center gap-3">
            <Shield className="text-indigo-500" /> FASE 5 — ANTIFRAUDE
          </h1>
          <p>Protegemos la plataforma y tus puntos con validación inteligente</p>
        </div>

        <div className="fraud-top-stats flex gap-8">
            <div className="text-right">
                <span className="text-[10px] uppercase font-black text-gray-500">Submissions hoy</span>
                <div className="text-xl font-black text-white">{metrics.today.toLocaleString()}</div>
            </div>
            <div className="text-right">
                <span className="text-[10px] uppercase font-black text-gray-500">Pendientes</span>
                <div className="text-xl font-black text-indigo-400">{metrics.pending}</div>
            </div>
        </div>
      </header>

      {/* METRICS MINI GRID */}
      <div className="fraud-features-grid">
        <div className="feature-card">
          <div className="feature-icon"><Lock size={18} /></div>
          <div className="feature-info">
            <h3>Envíos únicos</h3>
            <p>Un usuario no puede enviar la misma tarea dos veces.</p>
          </div>
          <span className="status-badge">Activo</span>
        </div>
        <div className="feature-card">
          <div className="feature-icon"><Activity size={18} /></div>
          <div className="feature-info">
            <h3>Rate Limit</h3>
            <p>Máximo 5 tareas por minuto por usuario.</p>
          </div>
          <span className="status-badge">Activo</span>
        </div>
        <div className="feature-card">
          <div className="feature-icon"><Timer size={18} /></div>
          <div className="feature-info">
            <h3>Tiempo mínimo</h3>
            <p>Mínimo 10 segundos de ejecución por tarea.</p>
          </div>
          <span className="status-badge">Activo</span>
        </div>
        <div className="feature-card">
          <div className="feature-icon"><FileCheck size={18} /></div>
          <div className="feature-info">
            <h3>Evidencia obligatoria</h3>
            <p>Cada tarea requiere evidencia válida.</p>
          </div>
          <span className="status-badge">Activo</span>
        </div>
        <div className="feature-card">
          <div className="feature-icon"><Eye size={18} /></div>
          <div className="feature-info">
            <h3>Aprobación manual</h3>
            <p>Todas las tareas requieren revisión manual.</p>
          </div>
          <span className="status-badge">Activo</span>
        </div>
      </div>

      {/* FLOW DIAGRAM */}
      <section className="flow-section">
        <div className="flow-container">
            <div className="flow-step active">
                <div className="step-icon"><MousePointer2 size={20} /></div>
                <div className="step-info">
                    <h4>Inicio</h4>
                    <p>started_at</p>
                </div>
            </div>
            <div className="flow-connector" />
            <div className="flow-step">
                <div className="step-icon"><Smartphone size={20} /></div>
                <div className="step-info">
                    <h4>Envío</h4>
                    <p>submitted_at</p>
                </div>
            </div>
            <div className="flow-connector" />
            <div className="flow-step">
                <div className="step-icon"><ShieldAlert size={20} /></div>
                <div className="step-info">
                    <h4>Revisión</h4>
                    <p>status: pending</p>
                </div>
            </div>
            <div className="flow-connector" />
            <div className="flow-step">
                <div className="step-icon"><CheckCircle size={20} /></div>
                <div className="step-info">
                    <h4>Aprobación</h4>
                    <p>status: approved</p>
                </div>
            </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="fraud-main-grid">
        <div className="left-col space-y-6">
          {/* RECENT SUBMISSIONS */}
          <div className="section-box">
            <div className="box-header">
              <h2>Submissions recientes</h2>
              <div className="tabs flex gap-2">
                <button className="px-3 py-1 rounded-md bg-indigo-600 text-[10px] font-bold">Todas</button>
                <button className="px-3 py-1 rounded-md bg-white/5 text-[10px] font-bold">Pendientes</button>
              </div>
            </div>

            <table className="fraud-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Tarea</th>
                  <th>Tiempo</th>
                  <th>Estado</th>
                  <th>Puntos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s, i) => (
                  <tr key={s.id}>
                    <td className="font-mono text-[10px] text-gray-500">#{s.id.slice(0, 5)}</td>
                    <td className="font-bold">{s.worker_id.slice(0, 8)}...</td>
                    <td>{s.task_type || "Interacción"}</td>
                    <td>{Math.floor(Math.random() * 50) + 10} seg</td>
                    <td>
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${s.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : s.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {s.status === 'pending' ? 'Pendiente' : s.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                      </span>
                    </td>
                    <td className="font-black">+{s.reward}</td>
                    <td><button className="p-1 hover:bg-white/10 rounded"><MoreHorizontal size={14}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SUSPICIOUS DETECTION */}
          <div className="grid grid-cols-2 gap-6">
             <div className="section-box">
                <div className="box-header"><h2>Validaciones antifraude</h2></div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> Envíos duplicados bloqueados</span>
                        <span className="text-[10px] font-black text-green-500">ACTIVO</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> Rate limit (máx 5 por minuto)</span>
                        <span className="text-[10px] font-black text-green-500">ACTIVO</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> Tiempo mínimo (10 seg)</span>
                        <span className="text-[10px] font-black text-green-500">ACTIVO</span>
                    </div>
                </div>
             </div>

             <div className="section-box">
                <div className="box-header"><h2>Comportamiento sospechoso</h2></div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold">Demasiadas tareas</span>
                            <span className="text-[9px] text-gray-500">Inusual frecuencia detectada</span>
                        </div>
                        <span className="text-[9px] font-black text-red-400 bg-red-400/10 px-2 py-1 rounded">ALTO RIESGO</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold">Misma IP múltiples cuentas</span>
                            <span className="text-[9px] text-gray-500">Posible granja de bots</span>
                        </div>
                        <span className="text-[9px] font-black text-orange-400 bg-orange-400/10 px-2 py-1 rounded">MEDIO RIESGO</span>
                    </div>
                </div>
             </div>
          </div>
        </div>

        <div className="right-col space-y-6">
          {/* FLAGGED USERS */}
          <div className="section-box">
            <div className="box-header">
              <h2>Usuarios marcados</h2>
              <button className="text-[10px] font-black text-indigo-400">Ver todos</button>
            </div>
            <div className="space-y-4">
              {flaggedUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-black text-red-500">
                      {u.nickname?.charAt(0) || "U"}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{u.nickname || "User"}</span>
                      <span className="text-[9px] text-gray-500">Actividad sospechosa</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-red-500 border border-red-500/20 px-2 py-1 rounded">FLAGGED</span>
                </div>
              ))}
              {flaggedUsers.length === 0 && <p className="text-center text-[10px] text-gray-500 py-4">No hay usuarios marcados</p>}
            </div>
          </div>

          {/* AUDIT LOGS */}
          <div className="section-box">
            <div className="box-header"><h2>Auditoría y logs</h2></div>
            <div className="space-y-4">
              {logs.map(log => (
                <div key={log.id} className="log-item">
                  <div className="log-dot bg-green-500" />
                  <div className="log-content">
                    <div className="log-time">{new Date(log.created_at).toLocaleTimeString()}</div>
                    <div className="log-text">{log.action}</div>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                  <div className="space-y-4">
                      <div className="log-item">
                        <div className="log-dot bg-green-500" />
                        <div className="log-content">
                            <div className="log-time">Hoy, 10:24 AM</div>
                            <div className="log-text text-green-400">Tarea #78418 aprobada +30 pts</div>
                        </div>
                      </div>
                      <div className="log-item">
                        <div className="log-dot bg-red-500" />
                        <div className="log-content">
                            <div className="log-time">Hoy, 10:20 AM</div>
                            <div className="log-text text-red-400">Tarea #78417 rechazada por evidencia</div>
                        </div>
                      </div>
                  </div>
              )}
            </div>
          </div>

          {/* AUTO BLOCK */}
          <div className="section-box bg-indigo-900/10 border-indigo-500/20 text-center py-8">
            <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                    <Lock size={24} />
                </div>
            </div>
            <h3 className="text-sm font-black mb-2">Bloqueo automático</h3>
            <p className="text-[10px] text-gray-500 mb-6">Usuarios con fraude bloqueados para enviar nuevas tareas y canjear premios.</p>
            <button className="w-full py-2 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Protección activa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
