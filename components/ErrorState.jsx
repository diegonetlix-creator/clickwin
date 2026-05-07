import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorState({ 
  message = "Ocurrió un error inesperado", 
  onRetry 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in slide-in-from-bottom-4 duration-500">
      <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-6 border border-red-500/20">
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>
      <h3 className="text-xl font-black text-white/80 uppercase tracking-tighter mb-2">
        ¡Vaya! Algo salió mal
      </h3>
      <p className="text-red-400/60 text-sm max-w-xs font-medium leading-relaxed mb-8">
        {message}
      </p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="flex items-center gap-2 bg-white text-black font-black px-8 py-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-95 text-xs uppercase tracking-widest"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      )}
    </div>
  );
}
