import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Modal de confirmación que reemplaza window.confirm().
 *
 * Uso:
 *   const [dialog, setDialog] = useState(null);
 *   setDialog({ message: "¿Eliminar?", onConfirm: () => doDelete() });
 *   {dialog && <ConfirmDialog {...dialog} onCancel={() => setDialog(null)} />}
 */
export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = "Confirmar", danger = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${danger ? "bg-red-500/10" : "bg-yellow-400/10"}`}>
          <AlertTriangle className={`w-7 h-7 ${danger ? "text-red-400" : "text-yellow-400"}`} />
        </div>
        <p className="text-white text-center font-semibold text-sm leading-relaxed mb-8">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-gray-800 border border-gray-700 text-gray-300 font-bold text-sm hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { onConfirm(); onCancel(); }}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-colors ${
              danger
                ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                : "bg-yellow-400 text-black hover:bg-yellow-300"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
