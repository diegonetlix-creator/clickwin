/**
 * Toast notification system — lightweight, no dependencies.
 * 
 * Usage:
 *   import { useToast, ToastContainer } from "@/components/Toast";
 * 
 *   function MyPage() {
 *     const toast = useToast();
 *     toast.success("¡Guardado!");
 *     toast.error("Ocurrió un error");
 *     toast.info("Procesando...");
 *     return <><YourContent /><ToastContainer /></>;
 *   }
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle, XCircle, Info, X, AlertTriangle } from "lucide-react";

let _setToasts = null;
let _idCounter = 0;

// ─── Global imperative API (usable outside React components) ─────────────────
export const toast = {
  success: (msg, duration = 3500) => _add("success", msg, duration),
  error:   (msg, duration = 5000) => _add("error",   msg, duration),
  info:    (msg, duration = 3500) => _add("info",    msg, duration),
  warning: (msg, duration = 4500) => _add("warning", msg, duration),
};

function _add(type, message, duration) {
  if (!_setToasts) return;
  const id = ++_idCounter;
  _setToasts(prev => [...prev, { id, type, message, duration }]);
  return id;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    base: "bg-gray-900 border border-green-500/40",
    icon_class: "text-green-400",
    bar: "bg-green-500",
    label: "Éxito"
  },
  error: {
    icon: XCircle,
    base: "bg-gray-900 border border-red-500/40",
    icon_class: "text-red-400",
    bar: "bg-red-500",
    label: "Error"
  },
  info: {
    icon: Info,
    base: "bg-gray-900 border border-blue-500/40",
    icon_class: "text-blue-400",
    bar: "bg-blue-500",
    label: "Info"
  },
  warning: {
    icon: AlertTriangle,
    base: "bg-gray-900 border border-yellow-500/40",
    icon_class: "text-yellow-400",
    bar: "bg-yellow-500",
    label: "Advertencia"
  },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────
function ToastItem({ toast: t, onRemove }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => dismiss(), t.duration);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onRemove(t.id), 300);
  }, [t.id, onRemove]);

  return (
    <div
      role="alert"
      className={`relative overflow-hidden flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl shadow-black/40 min-w-[280px] max-w-[400px] cursor-pointer transition-all duration-300 ease-out ${cfg.base} ${
        visible && !leaving
          ? "translate-x-0 opacity-100 scale-100"
          : "translate-x-8 opacity-0 scale-95"
      }`}
      onClick={dismiss}
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${cfg.bar} opacity-60`}
        style={{
          animation: `toast-progress ${t.duration}ms linear forwards`,
        }}
      />

      <Icon className={`w-5 h-5 ${cfg.icon_class} flex-shrink-0 mt-0.5`} />
      <p className="text-sm text-white font-medium flex-1 leading-relaxed">{t.message}</p>
      <button
        onClick={e => { e.stopPropagation(); dismiss(); }}
        className="text-gray-600 hover:text-white transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Container (place once in App root or Layout) ─────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  // Wire to global API
  useEffect(() => {
    _setToasts = setToasts;
    return () => { _setToasts = null; };
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <>
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Hook (convenient wrapper) ────────────────────────────────────────────────
export function useToast() {
  return toast;
}
