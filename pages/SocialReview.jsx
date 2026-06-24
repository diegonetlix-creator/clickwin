import { supabase } from "@/supabase";
import { toast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useState, useEffect } from "react";
import { 
  CheckCircle, Clock, User as UserIcon, 
  MessageSquare, ShieldCheck, Zap, 
  ArrowLeft, XCircle, X, Eye
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { auditLog, ACTION } from "@/utils";
import RateLimitBadge from "@/components/RateLimitBadge";
import { useRateLimit } from "@/hooks/useRateLimit";

export default function SocialReview() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null); // { submissionId }
  const [rejectReason, setRejectReason] = useState("");

  // Rate limit tracking via ledger
  const rateLimit = useRateLimit(user?.id, "review", 20);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      
      
      const { data, error } = await supabase
        .rpc("get_pending_reviews");

      console.log("REVIEWS DATA:", data);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submissionId) => {
    setProcessing(submissionId);
    try {
      

      // ── ONLY via RPC — never mutate status from frontend ──────────
      const { data, error: rpcErr } = await supabase.rpc("grant_social_task_reward", {
        p_submission_id: submissionId
      });

      if (rpcErr) throw rpcErr;

      // ── data is JSONB { ok, reward, worker_id, message } ─────────
      const reward = data?.reward ?? 0;

      // Reviewer incentive (5 pts for reviewing)
      await supabase.rpc("reward_reviewer_points", {
        p_user_id: user.id,
        p_points: 5
      }).catch(() => {}); // non-critical, don't block

      const submission = submissions.find(s => s.id === submissionId);
      auditLog(ACTION.APPROVE_SOCIAL, "social_task_submissions", submissionId, {
        worker_id:  submission?.worker_id,
        task_title: submission?.task_title,
        reward
      });

      // ── Remove from local list ───────────────────────────────────
      setSubmissions(prev => prev.filter(s => s.id !== submissionId));
      rateLimit.refresh();

      // ── UX Trust Messages ────────────────────────────────────────
      const msg = [
        `✅ Recompensa acreditada instantáneamente (+${reward} pts)`,
        "💸 El saldo ha sido transferido correctamente.",
        "🛡️ Gracias por mantener la comunidad segura.",
      ].join("\n");
      alert(msg);

    } catch (err) {
      console.error("Error approving submission:", err);

      // ── Translate DB error codes to friendly Spanish ─────────────
      const raw = err.message || "";
      let friendly = "Error al aprobar. Por favor intenta de nuevo.";

      if (raw.includes("SELF_APPROVAL_BLOCKED"))
        friendly = "❌ No puedes aprobar tu propia tarea.";
      else if (raw.includes("REVIEWER_LIMIT_REACHED"))
        friendly = "⏳ Alcanzaste el límite de 20 revisiones por día.";
      else if (raw.includes("ALREADY_PROCESSED"))
        friendly = "ℹ️ Esta entrega ya fue revisada anteriormente.";
      else if (raw.includes("EVIDENCE_REQUIRED"))
        friendly = "❌ La entrega no tiene imagen de evidencia.";
      else if (raw.includes("HASH_REQUIRED"))
        friendly = "❌ Entrega sin hash — posible duplicado bloqueado.";
      else if (raw.includes("DUPLICATE_APPROVAL"))
        friendly = "❌ Este trabajador ya recibió recompensa por esta tarea.";
      else if (raw.includes("INSUFFICIENT_BUDGET"))
        friendly = "❌ El cliente no tiene presupuesto suficiente para esta tarea.";
      else if (raw.includes("SUBMISSION_NOT_FOUND"))
        friendly = "❌ Entrega no encontrada. Puede haber sido eliminada.";

      alert(friendly);
    } finally {
      setProcessing(null);
    }
  };


  const handleReject = (submissionId) => {
    setRejectReason("No coincide con el perfil esperado");
    setRejectDialog({ submissionId });
  };

  const doReject = async () => {
    const { submissionId } = rejectDialog;
    const reason = rejectReason.trim() || "Rechazo sin motivo";
    setRejectDialog(null);
    try {
      const { error } = await supabase
        .from('social_task_submissions')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', submissionId);
      if (error) throw error;

      const submission = submissions.find(s => s.id === submissionId);
      auditLog(ACTION.REJECT_SOCIAL, "social_task_submissions", submissionId, {
        worker_id: submission?.worker_id,
        task_title: submission?.task_title,
        reason,
      });

      await supabase.rpc("reward_reviewer_points", { p_user_id: user.id, p_points: 5 });
      toast.success("Revisión guardada. Has ganado +5 pts.");
      setSubmissions(prev => prev.filter(s => s.id !== submissionId));
    } catch (err) {
      console.error("Error rejecting:", err);
      toast.error("Error al rechazar: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <button 
            onClick={() => navigate("/social-tasks")}
            className="flex items-center gap-2 text-gray-500 hover:text-white mb-4 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">Dashboard Social</span>
          </button>
          <h1 className="title-primary flex items-center gap-4">
            <Clock className="w-10 h-10 text-yellow-500" />
            Revisiones Sociales
          </h1>
          <p className="subtitle-secondary mt-2">Valida las pruebas de apoyo de otros usuarios para cerrar los acuerdos.</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="px-6 py-3 bg-gray-900 border border-gray-800 rounded-2xl">
            <span className="label-mono text-blue-400">{submissions.length} Pendientes</span>
          </div>
          {/* Rate limit indicator */}
          <RateLimitBadge
            label="Revisiones hoy"
            used={rateLimit.used}
            remaining={rateLimit.remaining}
            dailyLimit={rateLimit.dailyLimit}
            loading={rateLimit.loading}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-gray-800 border-t-yellow-500 rounded-full animate-spin" />
            <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Cargando revisiones...</span>
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-24 text-center bg-gray-900/40 border-2 border-dashed border-gray-800 rounded-[3rem] animate-in zoom-in duration-500">
            <ShieldCheck className="w-20 h-20 text-gray-800 mx-auto mb-6" />
            <p className="text-gray-500 font-black text-xl uppercase tracking-tighter">Todo al día</p>
            <p className="text-gray-600 text-sm mt-1">No tienes pruebas pendientes por validar.</p>
          </div>
        ) : (
          submissions.map((sub, idx) => (
            <div key={sub.id} className="card animate-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between w-full">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-white text-2xl shadow-inner uppercase shrink-0">
                    {sub.worker_name?.charAt(0) || sub.worker_email?.charAt(0) || <UserIcon className="w-8 h-8 opacity-20" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                       <span className="label-mono">{sub.worker_email?.split('@')[0] || sub.worker_id.split('-')[0]}</span>
                       <span className="w-1 h-1 rounded-full bg-gray-800" />
                       <span className="label-mono text-blue-500 italic">{sub.task_title}</span>
                    </div>
                    <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                        {sub.worker_name || sub.worker_email || "Usuario de ClickWin"}
                    </h3>
                  </div>
                </div>

                <div className="evidence-box relative overflow-hidden flex-1">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <MessageSquare className="w-12 h-12" />
                  </div>
                  <span className="label-mono block mb-2">Evidencia Aportada</span>
                  <p className="text-sm text-gray-300 font-medium italic leading-relaxed">"{sub.evidence_text}"</p>
                  
                  {sub.evidence_image ? (
                    <div className="mt-2">
                      <button 
                        onClick={() => setPreview(sub.evidence_image)}
                        className="btn-preview flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" /> Ver evidencia
                      </button>
                      <img 
                        src={sub.evidence_image} 
                        alt="Evidencia" 
                        className="evidence-image hidden" // Keep hidden but preloaded
                      />
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center gap-2 text-gray-600 italic">
                       <ShieldCheck className="w-4 h-4 opacity-30" />
                       <span className="text-[10px] uppercase font-black tracking-widest">Sin imagen</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <div className="flex gap-3">
                    <button 
                      id={`approve-${sub.id}`}
                      onClick={() => handleApprove(sub.id)}
                      disabled={processing === sub.id || rateLimit.isAtLimit}
                      className="btn btn-primary px-8 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={rateLimit.isAtLimit ? `Límite de ${rateLimit.dailyLimit} revisiones diarias alcanzado` : "Aprobar"}
                    >
                      {processing === sub.id ? "Aprobando..." : rateLimit.isAtLimit ? "Límite diario" : <> <CheckCircle className="w-4 h-4" /> Aprobar </>}
                    </button>
                    <button 
                      onClick={() => handleReject(sub.id)}
                      disabled={rateLimit.isAtLimit}
                      className="btn btn-danger disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Inline compact rate limit hint */}
                  <RateLimitBadge
                    label="revisiones"
                    used={rateLimit.used}
                    remaining={rateLimit.remaining}
                    dailyLimit={rateLimit.dailyLimit}
                    loading={rateLimit.loading}
                    compact
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-gradient-to-r from-indigo-900/20 to-blue-900/20 border border-blue-900/30 rounded-[2.5rem] p-8 flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
             <Zap className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-xs text-gray-500 leading-relaxed font-medium capitalize">
            Recuerda que al aprobar una tarea, se descontarán los puntos de tu balance y se acreditarán al trabajador de forma instantánea. Asegúrate de que el apoyo sea real para mantener una comunidad sana.
          </p>
      </div>

      {rateLimit.isAtLimit && (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
          <p className="text-red-400 font-bold">✅ Has alcanzado el límite de {rateLimit.dailyLimit} revisiones por hoy. ¡Gracias por tu ayuda!</p>
          <p className="text-red-400/60 text-sm mt-1">El contador se reinicia a las 00:00 UTC.</p>
        </div>
      )}

      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <button className="modal-close">
            <X className="w-10 h-10" />
          </button>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <img src={preview} alt="Vista previa" className="w-full h-auto" />
          </div>
        </div>
      )}

      {/* Modal de razón de rechazo — reemplaza prompt() nativo */}
      {rejectDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-lg mb-4">Razón del rechazo</h3>
            <textarea
              autoFocus
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-red-400 mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectDialog(null)} className="flex-1 py-3 rounded-2xl bg-gray-800 border border-gray-700 text-gray-300 font-bold text-sm">Cancelar</button>
              <button onClick={doReject} className="flex-1 py-3 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-colors">Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
