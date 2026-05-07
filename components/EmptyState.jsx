import { Inbox } from "lucide-react";

export default function EmptyState({ 
  title = "No hay datos", 
  message = "Vuelve más tarde para ver las novedades.",
  icon: Icon = Inbox 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 border border-white/5">
        <Icon className="w-10 h-10 text-gray-600" />
      </div>
      <h3 className="text-xl font-black text-white/80 uppercase tracking-tighter mb-2">
        {title}
      </h3>
      <p className="text-gray-500 text-sm max-w-xs font-medium leading-relaxed">
        {message}
      </p>
    </div>
  );
}
