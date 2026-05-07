import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import User from "@/entities/User";
import { createPageUrl } from "@/utils";
import { Task } from "@/entities/Task";
import {
  Target, Search, Filter, Instagram, Youtube, Twitter, Facebook,
  Heart, MessageCircle, Share2, Eye, Bookmark, Camera, Users, Play,
  Clock, Zap, ChevronDown, SlidersHorizontal, TrendingUp
} from "lucide-react";

const NETWORK_CONFIG = {
  all: { label: "Todas", color: "bg-gray-800 text-gray-400", icon: Target },
  instagram: { label: "Instagram", color: "text-pink-400 bg-pink-400/10", icon: Instagram },
  youtube: { label: "YouTube", color: "text-red-400 bg-red-400/10", icon: Youtube },
  tiktok: { label: "TikTok", color: "text-white bg-white/10", icon: Zap },
  twitter: { label: "Twitter", color: "text-blue-400 bg-blue-400/10", icon: Twitter },
  facebook: { label: "Facebook", color: "text-blue-600 bg-blue-600/10", icon: Facebook },
  linkedin: { label: "LinkedIn", color: "text-blue-500 bg-blue-500/10", icon: Users }
};

const TASK_ICONS = { 
  like: Heart, 
  comment: MessageCircle, 
  follow: Users, 
  share: Share2, 
  save: Bookmark, 
  view_story: Eye, 
  watch_video: Play, 
  screenshot: Camera, 
  specific_comment: MessageCircle, 
  visit_profile: Users 
};

const TASK_LABELS = { 
  like: "Dar Like", 
  comment: "Comentar", 
  follow: "Seguir", 
  share: "Compartir", 
  save: "Guardar", 
  view_story: "Ver Historia", 
  watch_video: "Ver Video", 
  screenshot: "Captura", 
  specific_comment: "Comentario Específico", 
  visit_profile: "Visitar Perfil" 
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchParams] = useSearchParams();
  const promoterId = searchParams.get("promoterId");
  const [promoterName, setPromoterName] = useState("");
  const [search, setSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("reward");

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        let t = await Task.filter({ status: "available" }, '-reward', 200).catch(() => []);
        if (t.length === 0) {
          t = await Task.list('-created_at', 100).catch(() => []);
        }

        // 1. Filter out tasks created by the current user (promoter)
        if (currentUser) {
          t = t.filter(task => task.promoter_id !== currentUser.id);
        }

        // 2. Filter by promoterId if provided in URL
        if (promoterId) {
          t = t.filter(task => task.promoter_id === promoterId);
          if (t.length > 0) {
            setPromoterName(t[0].promoter_name || "este cliente");
          }
        }

        setTasks(t || []);
      } catch (err) {
        console.error("Error cargando tareas:", err);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  const filtered = tasks
    .filter(t => networkFilter === "all" || t.social_network === networkFilter)
    .filter(t => typeFilter === "all" || t.task_type === typeFilter)
    .filter(t => !search || t.campaign_title?.toLowerCase().includes(search.toLowerCase()) || t.instructions?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === "reward" ? (b.reward || 0) - (a.reward || 0) : new Date(b.created_at) - new Date(a.created_at));

  // Count helpers
  const getNetworkCount = (net) => tasks.filter(t => net === "all" || t.social_network === net).length;
  const getTypeCount = (type) => tasks.filter(t => (networkFilter === "all" || t.social_network === networkFilter) && (type === "all" || t.task_type === type)).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-400 fill-yellow-400" /> 
            {promoterId ? `Tareas de ${promoterName}` : "Explorar Tareas"}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {promoterId 
              ? `Listado de tareas disponibles de ${promoterName}.`
              : "Gana puntos completando acciones sencillas en redes sociales."}
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-2xl flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Disponibles</div>
            <div className="text-xl font-black text-blue-400 leading-none">{filtered.length}</div>
          </div>
          <div className="w-px h-8 bg-gray-800" />
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Potencial</div>
            <div className="text-xl font-black text-green-400 leading-none">
              +{filtered.reduce((s, t) => s + (t.reward || 0), 0)} <span className="text-[10px] opacity-60">pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Filter Dashboard */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-6 shadow-xl">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex-1 min-w-[300px] relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
            <input value={search} onChange={e => setSearch(e.target.value)} 
              placeholder="Buscar por marca, campaña o instrucciones..."
              className="w-full bg-gray-950 border border-gray-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-blue-500/50 text-white placeholder-gray-600 transition-all shadow-inner" />
          </div>
          <div className="relative">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="appearance-none bg-gray-950 border border-gray-800 rounded-2xl pl-4 pr-10 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 cursor-pointer shadow-inner min-w-[160px]">
              <option value="reward">💰 Mayor recompensa</option>
              <option value="newest">⏰ Más recientes</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-2 whitespace-nowrap">Red:</span>
            {Object.entries(NETWORK_CONFIG).map(([id, cfg]) => {
              const Icon = cfg.icon;
              const count = getNetworkCount(id);
              if (count === 0 && id !== "all") return null;
              return (
                <button key={id} onClick={() => setNetworkFilter(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                    networkFilter === id 
                      ? "bg-white text-black border-transparent shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                      : "bg-gray-950 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
                  }`}>
                  <Icon className={`w-3.5 h-3.5 ${networkFilter === id ? "text-black" : (NETWORK_CONFIG[id].color?.split(' ')[0] || "")}`} />
                  {cfg.label}
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${networkFilter === id ? "bg-black/10" : "bg-gray-800"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-2 whitespace-nowrap">Acción:</span>
            {["all", "like", "comment", "follow", "share", "watch_video", "screenshot"].map(t => {
              const count = getTypeCount(t);
              if (count === 0 && t !== "all") return null;
              const Icon = TASK_ICONS[t] || Target;
              return (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                    typeFilter === t 
                      ? "bg-blue-500 text-white border-transparent shadow-lg shadow-blue-500/20" 
                      : "bg-gray-950 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
                  }`}>
                  {t !== "all" && <Icon className="w-3.5 h-3.5" />}
                  {t === "all" ? "Todos los tipos" : TASK_LABELS[t] || t}
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${typeFilter === t ? "bg-white/20" : "bg-gray-800"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-900 border border-gray-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-32 bg-gray-900/50 border border-dashed border-gray-800 rounded-3xl">
          <Target className="w-20 h-20 mx-auto mb-6 text-gray-700" />
          <h3 className="text-2xl font-black text-white mb-2">Sin resultados</h3>
          <p className="text-gray-500 max-w-sm mx-auto">No encontramos tareas que coincidan con estos filtros. Intenta explorar otras categorías o redes sociales.</p>
          <button onClick={() => { setNetworkFilter("all"); setTypeFilter("all"); setSearch(""); }}
            className="mt-6 text-blue-400 font-bold hover:underline">Ver todas las tareas</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((task) => {
            const TaskIcon = TASK_ICONS[task.task_type] || Target;
            const netCfg = NETWORK_CONFIG[task.social_network] || NETWORK_CONFIG.all;
            return (
              <div key={task.id} className="feed-gradient-subtle h-full">
                <div className="feed-gradient-inner p-6 flex flex-col h-full">
                  {/* Visual Accent */}
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-5 group-hover:opacity-10 transition-opacity -mr-16 -mt-16 rounded-full bg-current ${netCfg.color?.split(' ')[0]}`} />

                  <div className="flex items-start justify-between mb-6">
                    <button onClick={(e) => { e.preventDefault(); setNetworkFilter(task.social_network); }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${netCfg.color}`}>
                      <netCfg.icon className="w-3 h-3" />
                      {task.social_network}
                    </button>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <div className="text-2xl font-black text-white">+{task.reward}</div>
                      </div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Puntos Recompensa</div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors border border-gray-700 group-hover:border-gray-600 shadow-lg">
                        <TaskIcon className="w-6 h-6 text-gray-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <div>
                        <button onClick={(e) => { e.preventDefault(); setTypeFilter(task.task_type); }}
                          className="font-black text-lg text-white group-hover:text-blue-400 transition-colors block text-left hover:underline">
                          {TASK_LABELS[task.task_type] || task.task_type}
                        </button>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                          <Clock className="w-3 h-3" />
                          Termina en {task.time_limit_hours || 24} horas
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 line-clamp-3 mb-6 leading-relaxed font-medium min-h-[4.5rem]">
                      {task.instructions || `Accede al enlace para completar esta acción de ${task.social_network} y ganar puntos.`}
                    </p>

                    {task.campaign_title && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-bold bg-gray-950 px-3 py-2 rounded-xl mb-6 truncate border border-gray-800">
                        <TrendingUp className="w-3 h-3 text-purple-400" />
                        <span className="truncate">{task.campaign_title}</span>
                      </div>
                    )}
                  </div>

                  <Link to={createPageUrl(`TaskDetail?id=${task.id}`)}
                    className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-blue-400 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-[0.98]">
                    Empezar Tarea
                    <Zap className="w-4 h-4 fill-current" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      {filtered.length > 0 && (
        <p className="text-center text-gray-600 text-xs mt-12">
          ¿No encuentras lo que buscas? Las tareas se actualizan en tiempo real conforme los anunciantes lanzan nuevas campañas.
        </p>
      )}
    </div>
  );
}
