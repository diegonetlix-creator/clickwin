import { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { auditLog, ACTION, getSignedUrl } from "@/utils";
import { toast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import User from "@/entities/User";
import { Submission } from "@/entities/Submission";
import { Task } from "@/entities/Task";
import { Campaign } from "@/entities/Campaign";
import { Notification } from "@/entities/Notification";
import { WorkerProfile } from "@/entities/WorkerProfile";
import {
  CheckCircle, XCircle, Eye, Clock, Filter, ExternalLink,
  Camera, User as UserIcon, MessageSquare, X, AlertCircle, Zap, Trash2
} from "lucide-react";

const STATUS_TABS = [
  { id: "pending", label: "Pendientes", color: "text-yellow-400" },
  { id: "approved", label: "Aprobadas", color: "text-green-400" },
  { id: "rejected", label: "Rechazadas", color: "text-red-400" },
];

export default function ReviewTasks() {
  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const isValidUUID = (id) => id && typeof id === "string" && id !== "null" && id.length >= 32;

  useEffect(() => {
    User.me().then(u => {
      setUser(u);
      loadSubmissions(u.email, tab);
    }).catch(err => {
      console.error("Auth error:", err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user) {
      loadSubmissions(user.email, tab);
      setSelectedIds([]);
    }
  }, [tab]);

  const loadSubmissions = async (email, status) => {
    setLoading(true);
    try {
      const { data: subs, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSubmissions(subs || []);
      
      const urls = {};
      for (const sub of (subs || [])) {
        if (sub.evidence_url) {
          try {
            urls[sub.id] = sub.evidence_url.startsWith('http') ? sub.evidence_url : await getSignedUrl(sub.evidence_url);
          } catch (e) { urls[sub.id] = sub.evidence_url; }
        }
      }
      setEvidenceUrls(urls);
    } catch (err) {
      console.error("Error loading submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (sub, silent = false) => {
    if (!silent) setProcessing(true);
    try {
      const { error } = await supabase.rpc("grant_task_reward", {
        p_submission_id: sub.id
      });

      if (error) {
        console.error("Approval error:", error);
        if (!silent) toast.error(error.message);
        return false;
      }

      // ── Audit log (Non-blocking) ──
      auditLog(ACTION.APPROVE_SUBMISSION, "submissions", sub.id, {
        worker_id: sub.worker_id,
        task_id:   sub.task_id,
        reward:    sub.reward ?? 0,
      });

      // Remove from local list immediately
      setSubmissions(prev => prev.filter(s => s.id !== sub.id));
      
      if (!silent) {
        toast.success("¡Tarea aprobada con éxito!");
      }
      return true;
    } catch (err) {
      if (!silent) toast.error(err.message);
      return false;
    } finally {
      if (!silent) setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      const reviewedAt = new Date().toISOString();
      const reviewerEmail = user?.email || "system";
      const { error: subErr } = await supabase.from('submissions').update({ 
        status: "rejected", rejection_reason: rejectReason, reviewed_by: reviewerEmail, reviewed_at: reviewedAt 
      }).eq('id', selected.id);
      if (subErr) throw subErr;

      // ── Audit log (Non-blocking) ──
      auditLog(ACTION.REJECT_SUBMISSION, "submissions", selected.id, {
        worker_id:      selected.worker_id,
        task_id:        selected.task_id,
        rejection_reason: rejectReason,
      });

      if (isValidUUID(selected.task_id)) {
        await supabase.from('tasks').update({ status: "rejected", rejection_reason: rejectReason, reviewed_at: reviewedAt }).eq('id', selected.task_id);
      }

      if (isValidUUID(selected.worker_id)) {
        try {
          const profile = await WorkerProfile.get(selected.worker_id);
          if (profile) await WorkerProfile.update(profile.id, { tasks_rejected: (profile.tasks_rejected || 0) + 1 });
        } catch (e) { console.error("Worker profile error:", e); }
        
        const promoterName = user?.name || user?.email || "Un cliente";
        try {
          await Notification.create({
            user_id: selected.worker_id, title: "Tarea rechazada ❌",
            message: `${promoterName} rechazó tu tarea en "${selected.campaign_title}". Motivo: ${rejectReason || "No cumplió los requisitos."}`,
            type: "task_rejected", related_entity_id: selected.id, related_entity_type: "submission", is_read: false
          });
        } catch (e) { console.error("Notification error:", e); }
      }

      setSubmissions(prev => prev.filter(s => s.id !== selected.id));
      setShowRejectModal(false);
      setRejectReason("");
      toast.info("Tarea rechazada");
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`¿Aprobar las ${selectedIds.length} tareas seleccionadas?`)) return;
    
    setIsBulkProcessing(true);
    try {
      const selectedSubs = submissions.filter(s => selectedIds.includes(s.id));
      
      let successCount = 0;
      for (const sub of selectedSubs) {
        const ok = await handleApprove(sub, true);
        if (ok) successCount++;
      }

      // ── Audit log for bulk ──
      await auditLog(ACTION.BULK_APPROVE, "submissions", null, {
        count:   successCount,
        ids:     selectedIds,
      });

      setSubmissions(prev => prev.filter(s => !selectedIds.includes(s.id)));
      setSelectedIds([]);
      toast.success(`Proceso masivo completado: ${successCount} aprobadas.`);
    } catch (err) {
      console.error("Bulk approve error:", err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const isPending = tab === "pending";
    const msg = isPending ? `¿Rechazar y eliminar permanentemente las ${selectedIds.length} entregas?` : `¿Eliminar permanentemente las ${selectedIds.length} evidencias?`;
    if (!confirm(msg)) return;
    
    setIsBulkProcessing(true);
    try {
      const { error } = await supabase.from('submissions').delete().in('id', selectedIds);
      
      if (error) {
        console.error("Supabase delete error:", error);
        throw error;
      }
      
      setSubmissions(prev => prev.filter(s => !selectedIds.includes(s.id)));
      setSelectedIds([]);
      alert("Eliminación masiva completada.");
    } catch (err) {
      console.error("Bulk delete critical error:", err);
      alert("Hubo un problema al eliminar: " + (err.message || "Error de red"));
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === submissions.length ? [] : submissions.map(s => s.id));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 overflow-hidden">
        <div className="animate-in fade-in slide-in-from-left duration-700">
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">Revisión de Evidencias</h1>
          <p className="text-gray-400 text-sm mt-2 font-medium">Control total sobre las entregas de los usuarios</p>
        </div>
        {submissions.length > 0 && (
          <button onClick={toggleSelectAll} className="w-full md:w-auto text-[10px] font-black uppercase tracking-widest text-white transition-all bg-gray-900/80 hover:bg-white hover:text-black border border-white/10 px-6 py-3 rounded-2xl shadow-xl backdrop-blur-md">
            {selectedIds.length === submissions.length ? "Deseleccionar todo" : "Seleccionar todo"}
          </button>
        )}
      </div>

      <div className="flex gap-2 bg-black/40 border border-white/5 rounded-[2rem] p-1.5 w-fit backdrop-blur-xl animate-in zoom-in duration-500">
        {STATUS_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-10 py-4 rounded-[1.8rem] text-sm font-black transition-all duration-500 ${tab === t.id ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)] scale-105" : "text-gray-500 hover:text-white"}`}>
            <span className={tab === t.id ? "" : ""}>{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin shadow-[0_0_30px_rgba(255,255,255,0.1)]" />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-white/40 animate-pulse">Cargando datos...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-48 bg-gray-900/30 border-2 border-dashed border-white/5 rounded-[3rem] animate-in fade-in duration-1000">
          <CheckCircle className="w-24 h-24 mx-auto mb-6 text-white/5" />
          <p className="text-white/20 font-black text-xl uppercase tracking-tighter">Bandeja Vacía</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {submissions.map((sub, idx) => (
            <div key={sub.id} onClick={() => toggleSelect(sub.id)}
              style={{ animationDelay: `${idx * 50}ms` }}
              className={`group bg-gray-900/50 border rounded-[2.5rem] overflow-hidden transition-all duration-500 relative cursor-pointer animate-in fade-in slide-in-from-bottom-10 ${selectedIds.includes(sub.id) ? "border-white shadow-[0_0_40px_rgba(255,255,255,0.1)]" : "border-white/5 hover:border-white/20 shadow-2xl"}`}>
              
              <div className={`absolute top-6 left-6 z-20 w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${selectedIds.includes(sub.id) ? "bg-white border-white scale-110 shadow-[0_0_20px_white]" : "bg-black/40 border-white/10 backdrop-blur-xl opacity-0 group-hover:opacity-100"}`}>
                {selectedIds.includes(sub.id) && <CheckCircle className="w-5 h-5 text-black" />}
              </div>

              <div className="relative h-60 bg-gray-800 overflow-hidden">
                {evidenceUrls[sub.id] ? (
                  <img src={evidenceUrls[sub.id]} alt="Evidencia" style={{ transitionDuration: '2s' }} className="w-full h-full object-cover transition-transform group-hover:scale-125" />
                ) : (
                  <Camera className="w-20 h-20 text-white/10 mx-auto mt-20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />
                <div className={`absolute top-6 right-6 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10 ${sub.status === "pending" ? "bg-yellow-400/20 text-yellow-400" : sub.status === "approved" ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"}`}>
                  {sub.status === "pending" ? "Pendiente" : sub.status === "approved" ? "Aprobada" : "Rechazada"}
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-white shadow-inner text-xl">
                    {sub.worker_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-black text-white truncate group-hover:text-blue-400 transition-colors">{sub.worker_name || sub.worker_email}</div>
                    <div className="text-[10px] text-white/40 font-black uppercase tracking-widest">{sub.social_network} · {sub.task_type}</div>
                  </div>
                </div>

                <div className="text-[11px] text-white/50 font-medium leading-relaxed line-clamp-2 uppercase tracking-tight">{sub.campaign_title}</div>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-white/20 text-[9px] font-black uppercase tracking-widest">Pago</span>
                    <span className="text-green-400 font-black text-2xl group-hover:scale-110 transition-transform origin-left">+{sub.reward} pts</span>
                  </div>
                  {evidenceUrls[sub.id] && (
                    <a href={evidenceUrls[sub.id]} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="bg-white/5 hover:bg-white hover:text-black text-white text-[10px] font-black px-5 py-2.5 rounded-xl transition-all border border-white/10 flex items-center gap-2">
                      VER COMPLETA <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {sub.status === "pending" && (
                  <div className="flex gap-4 pt-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleApprove(sub)} disabled={processing} className="flex-1 bg-white text-black font-black py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl">
                      Aprobar
                    </button>
                    <button onClick={() => { setSelected(sub); setShowRejectModal(true); }} disabled={processing} className="flex-1 bg-gray-800 text-white font-black py-4 rounded-2xl transition-all hover:bg-red-500 active:scale-95 border border-white/5 shadow-xl">
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-24 lg:bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in slide-in-from-bottom-32 duration-700">
          <div className="bg-gray-900/95 border border-white/10 rounded-[2rem] lg:rounded-[3rem] p-3 lg:p-6 shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl flex flex-col sm:flex-row items-center justify-between gap-4 lg:gap-8">
            <div className="flex items-center gap-4 lg:gap-6 pl-2 lg:pl-4">
              <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-white text-black flex items-center justify-center font-black text-lg lg:text-2xl shadow-[0_0_40px_rgba(255,255,255,0.3)]">{selectedIds.length}</div>
              <div className="flex flex-col">
                <span className="text-white font-black text-sm lg:text-lg leading-tight">Masivo</span>
                <span className="text-white/40 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest">Seleccionados</span>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-4 w-full sm:w-auto">
              {tab === "pending" && (
                <button onClick={handleBulkApprove} disabled={isBulkProcessing} className="flex-1 sm:flex-none bg-white hover:bg-gray-200 text-black font-black px-4 lg:px-8 py-3 lg:py-4 rounded-xl lg:rounded-[1.5rem] text-xs lg:text-sm transition-all flex items-center justify-center gap-2 lg:gap-3 shadow-2xl active:scale-90">
                  {isBulkProcessing ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                  <span className="hidden xs:inline">APROBAR</span>
                  <span className="xs:hidden">OK</span>
                </button>
              )}
              <button onClick={handleBulkDelete} disabled={isBulkProcessing} className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white font-black px-4 lg:px-8 py-3 lg:py-4 rounded-xl lg:rounded-[1.5rem] text-xs lg:text-sm transition-all flex items-center justify-center gap-2 lg:gap-3 active:scale-90 shadow-2xl">
                {isBulkProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span className="hidden xs:inline">{tab === "pending" ? "RECHAZAR" : "ELIMINAR"}</span>
                <span className="xs:hidden">{tab === "pending" ? "X" : "DEL"}</span>
              </button>
              <button onClick={() => setSelectedIds([])} className="bg-white/5 hover:bg-white/10 text-white w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-[1.5rem] transition-all flex items-center justify-center border border-white/10 active:scale-90"><X className="w-6 h-6" /></button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-8 animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-white/10 rounded-[3rem] p-12 w-full max-w-xl shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-10">
              <h3 className="font-black text-3xl flex items-center gap-5 text-white"><AlertCircle className="w-10 h-10 text-red-500" /> Rechazar Entrega</h3>
              <button onClick={() => { setShowRejectModal(false); setSelected(null); }} className="text-white/30 hover:text-white transition-colors bg-white/5 p-3 rounded-2xl"><X className="w-7 h-7" /></button>
            </div>
            <p className="text-white/50 text-base mb-10 font-medium leading-relaxed">
              Explica por qué la evidencia ha sido rechazada. Esta nota será enviada al usuario para que pueda reenviar la tarea correctamente.
            </p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={5}
              placeholder="Ej: La captura no muestra el nombre de usuario o es de una red social diferente..."
              className="w-full bg-black/40 border-2 border-white/10 rounded-[2rem] p-6 text-base text-white placeholder-white/20 focus:outline-none focus:border-white/40 resize-none mb-10 shadow-inner transition-all" />
            <div className="grid grid-cols-2 gap-6">
              <button onClick={() => { setShowRejectModal(false); setSelected(null); }} className="bg-white/5 hover:bg-white/10 text-white font-black py-5 rounded-[1.5rem] transition-all border border-white/10">CANCELAR</button>
              <button onClick={handleReject} disabled={processing} className="bg-red-500 hover:bg-red-600 text-white font-black py-5 rounded-[1.5rem] transition-all shadow-[0_20px_40px_rgba(239,68,68,0.2)] flex items-center justify-center gap-3">
                {processing ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" /> : <XCircle className="w-6 h-6" />}
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


