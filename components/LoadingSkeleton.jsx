import { Loader2 } from "lucide-react";

export default function LoadingSkeleton({ message = "Cargando..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in duration-700">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-white/5 rounded-full" />
        <Loader2 className="w-16 h-16 text-blue-500 animate-spin absolute top-0 left-0" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 animate-pulse">
        {message}
      </p>
    </div>
  );
}
