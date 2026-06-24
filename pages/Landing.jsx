import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl, getInitialRouteByRole } from "@/utils";
import User from "@/entities/User";
import { WorkerProfile } from "@/entities/WorkerProfile";
import {
  Star, Zap, Trophy, Users, TrendingUp, Shield, CheckCircle,
  Instagram, Youtube, Twitter, Facebook, ArrowRight, Flame,
  DollarSign, Target, Award, ChevronRight, Play, Heart, MessageCircle,
  Share2, Eye, Bookmark, Camera, LayoutDashboard
} from "lucide-react";

const TASK_TYPES = [
  { icon: Heart, label: "Dar Like", color: "text-pink-400", bg: "bg-pink-400/10" },
  { icon: MessageCircle, label: "Comentar", color: "text-blue-400", bg: "bg-blue-400/10" },
  { icon: Users, label: "Seguir", color: "text-green-400", bg: "bg-green-400/10" },
  { icon: Share2, label: "Compartir", color: "text-purple-400", bg: "bg-purple-400/10" },
  { icon: Bookmark, label: "Guardar", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { icon: Eye, label: "Ver Historia", color: "text-cyan-400", bg: "bg-cyan-400/10" },
  { icon: Play, label: "Ver Video", color: "text-red-400", bg: "bg-red-400/10" },
  { icon: Camera, label: "Captura", color: "text-orange-400", bg: "bg-orange-400/10" },
];

const TESTIMONIALS = [
  { name: "María García", role: "Worker", country: "🇲🇽", text: "Gané $150 en mi primera semana. Las tareas son fáciles y los pagos son rápidos.", avatar: "MG", points: "12,450", level: 8 },
  { name: "Carlos Ruiz", role: "Worker", country: "🇨🇴", text: "El sistema de rachas me motiva a completar tareas todos los días. ¡Ya llevo 30 días seguidos!", avatar: "CR", points: "28,900", level: 15 },
  { name: "TechBrand Co.", role: "Promoter", country: "🇦🇷", text: "Conseguimos 5,000 seguidores reales en Instagram en solo 2 semanas. Excelente ROI.", avatar: "TB", campaigns: 12, spent: "$2,400" },
  { name: "Ana López", role: "Worker", country: "🇵🇪", text: "Perfecto para trabajar desde casa. Completo tareas en mis tiempos libres.", avatar: "AL", points: "8,200", level: 5 },
];

const BENEFITS_WORKER = [
  { icon: DollarSign, title: "Gana dinero real", desc: "Convierte tus puntos en dinero y retira cuando quieras" },
  { icon: Target, title: "Tareas simples", desc: "Acciones en redes sociales que ya haces todos los días" },
  { icon: Trophy, title: "Gamificación", desc: "Sube de nivel, gana badges y compite en el ranking global" },
  { icon: Flame, title: "Rachas diarias", desc: "Bonos especiales por completar tareas consecutivas" },
];

const BENEFITS_PROMOTER = [
  { icon: TrendingUp, title: "Crece orgánicamente", desc: "Interacciones reales de personas genuinamente interesadas" },
  { icon: Target, title: "Segmentación precisa", desc: "Define exactamente qué tipo de acción necesitas" },
  { icon: Shield, title: "Validación manual", desc: "Aprueba o rechaza cada tarea con evidencia visual" },
  { icon: Zap, title: "Resultados rápidos", desc: "Campañas activas en minutos, resultados en horas" },
];

export default function Landing() {
  const [topWorkers, setTopWorkers] = useState([]);
  const [activeTab, setActiveTab] = useState("worker");
  const [counter, setCounter] = useState({ tasks: 0, workers: 0, earned: 0 });
  const [user, setUser] = useState(null);

  useEffect(() => {
    User.me().then(setUser).catch(() => {});
    WorkerProfile.list('-total_points', 5).then(setTopWorkers).catch(() => {});
    // Animate counters
    const targets = { tasks: 48293, workers: 12847, earned: 284750 };
    const duration = 2000;
    const steps = 60;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      setCounter({
        tasks: Math.floor(targets.tasks * progress),
        workers: Math.floor(targets.workers * progress),
        earned: Math.floor(targets.earned * progress),
      });
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">ClickWin</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#tareas" className="hover:text-white transition-colors">Tareas</a>
            <a href="#ranking" className="hover:text-white transition-colors">Ranking</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to={getInitialRouteByRole(user.role)}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-semibold text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                Ir al Dashboard
              </Link>
            ) : (
              <>
                <Link to={createPageUrl("Login")} className="text-sm text-gray-400 hover:text-white transition-colors">Iniciar sesión</Link>
                <Link to={createPageUrl("Register")} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-semibold text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                  Comenzar gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-2 text-yellow-400 text-sm font-medium mb-8">
            <Flame className="w-4 h-4" />
            <span>+12,000 usuarios activos ganando dinero</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Gana dinero
            <span className="block bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 bg-clip-text text-transparent">
              completando tareas
            </span>
            en redes sociales
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Realiza acciones orgánicas en Instagram, YouTube, TikTok y más. 
            Gana puntos, sube de nivel y retira tu dinero cuando quieras.
          </p>

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            {user ? (
              <Link to={getInitialRouteByRole(user.role)}
                className="group flex items-center justify-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-lg px-8 py-4 rounded-2xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-yellow-500/25">
                <LayoutDashboard className="w-5 h-5" />
                Ir a mi Dashboard — {user.role === "admin" ? "Modo Admin" : user.role === "promoter" ? "Modo Cliente" : "Modo Usuario"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link to={createPageUrl("Register")} className="group flex items-center justify-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-lg px-8 py-4 rounded-2xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-yellow-500/25">
                  <Users className="w-5 h-5" />
                  Registrarme como Usuario
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to={createPageUrl("Register")} className="group flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg px-8 py-4 rounded-2xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-blue-500/25">
                  <TrendingUp className="w-5 h-5" />
                  Soy Cliente — Quiero crecer
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {[
              { value: counter.tasks.toLocaleString(), label: "Tareas completadas" },
              { value: counter.workers.toLocaleString(), label: "Usuarios activos" },
              { value: `$${counter.earned.toLocaleString()}`, label: "Pagado a usuarios" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating cards */}
        <div className="absolute left-8 top-1/3 hidden xl:block animate-bounce" style={{ animationDuration: '3s' }}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">Tarea aprobada</div>
                <div className="text-xs text-green-400">+50 puntos</div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute right-8 top-1/2 hidden xl:block animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">¡Subiste de nivel!</div>
                <div className="text-xs text-yellow-400">Nivel 5 alcanzado</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="py-24 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">¿Cómo funciona?</h2>
            <p className="text-gray-400 text-lg">Simple, transparente y rentable</p>
          </div>

          {/* Tab selector */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-800 rounded-2xl p-1 flex gap-1">
              <button onClick={() => setActiveTab("worker")} className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === "worker" ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}>
                👤 Para Usuarios
              </button>
              <button onClick={() => setActiveTab("promoter")} className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === "promoter" ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"}`}>
                🧑‍💼 Para Clientes
              </button>
            </div>
          </div>

          {activeTab === "worker" ? (
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: "01", icon: Users, title: "Regístrate gratis", desc: "Crea tu cuenta en segundos y completa tu perfil" },
                { step: "02", icon: Target, title: "Elige una tarea", desc: "Explora tareas disponibles y filtra por red social o pago" },
                { step: "03", icon: Camera, title: "Completa y sube evidencia", desc: "Realiza la acción y sube una captura de pantalla" },
                { step: "04", icon: DollarSign, title: "Cobra tus ganancias", desc: "Acumula puntos y retira tu dinero cuando quieras" },
              ].map((item, i) => (
                <div key={i} className="relative">
                  {i < 3 && <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-yellow-400/50 to-transparent z-0" />}
                  <div className="relative z-10 bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-yellow-400/50 transition-colors">
                    <div className="text-yellow-400/30 text-5xl font-black mb-4">{item.step}</div>
                    <div className="w-12 h-12 rounded-xl bg-yellow-400/10 flex items-center justify-center mb-4">
                      <item.icon className="w-6 h-6 text-yellow-400" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: "01", icon: Zap, title: "Crea una campaña", desc: "Define la red social, tipo de tarea, instrucciones y recompensa" },
                { step: "02", icon: Users, title: "Usuarios la completan", desc: "Nuestra comunidad realiza las acciones y sube evidencia" },
                { step: "03", icon: CheckCircle, title: "Aprueba o rechaza", desc: "Revisa cada evidencia y decide si aprobar o rechazar" },
                { step: "04", icon: TrendingUp, title: "Ve crecer tu cuenta", desc: "Monitorea estadísticas y el impacto en tiempo real" },
              ].map((item, i) => (
                <div key={i} className="relative">
                  {i < 3 && <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-400/50 to-transparent z-0" />}
                  <div className="relative z-10 bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-blue-400/50 transition-colors">
                    <div className="text-blue-400/30 text-5xl font-black mb-4">{item.step}</div>
                    <div className="w-12 h-12 rounded-xl bg-blue-400/10 flex items-center justify-center mb-4">
                      <item.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TASK TYPES */}
      <section id="tareas" className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Tipos de tareas disponibles</h2>
            <p className="text-gray-400 text-lg">Acciones orgánicas en las principales redes sociales</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TASK_TYPES.map((task, i) => (
              <div key={i} className={`${task.bg} border border-gray-700 rounded-2xl p-6 text-center hover:scale-105 transition-transform cursor-default`}>
                <task.icon className={`w-8 h-8 ${task.color} mx-auto mb-3`} />
                <div className="font-semibold text-sm">{task.label}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {[
              { icon: Instagram, label: "Instagram", color: "text-pink-400" },
              { icon: Youtube, label: "YouTube", color: "text-red-400" },
              { icon: Twitter, label: "Twitter/X", color: "text-blue-400" },
              { icon: Facebook, label: "Facebook", color: "text-blue-600" },
            ].map((net, i) => (
              <div key={i} className={`flex items-center gap-2 ${net.color} text-sm font-medium`}>
                <net.icon className="w-5 h-5" />
                {net.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-24 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16">
            {/* Worker benefits */}
            <div>
              <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-2 text-yellow-400 text-sm font-medium mb-6">
                👤 Para Usuarios
              </div>
              <h2 className="text-3xl font-black mb-8">Gana dinero haciendo lo que ya haces</h2>
              <div className="space-y-4">
                {BENEFITS_WORKER.map((b, i) => (
                  <div key={i} className="flex items-start gap-4 bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                      <b.icon className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">{b.title}</div>
                      <div className="text-gray-400 text-sm">{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Promoter benefits */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-400/10 border border-blue-400/20 rounded-full px-4 py-2 text-blue-400 text-sm font-medium mb-6">
                🧑‍💼 Para Clientes
              </div>
              <h2 className="text-3xl font-black mb-8">Impulsa tus redes con interacciones reales</h2>
              <div className="space-y-4">
                {BENEFITS_PROMOTER.map((b, i) => (
                  <div key={i} className="flex items-start gap-4 bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="w-10 h-10 rounded-lg bg-blue-400/10 flex items-center justify-center flex-shrink-0">
                      <b.icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">{b.title}</div>
                      <div className="text-gray-400 text-sm">{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RANKING */}
      <section id="ranking" className="py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4">🏆 Ranking Global</h2>
            <p className="text-gray-400">Los mejores usuarios de la semana</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400/10 to-orange-400/10 border-b border-gray-700 p-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { pos: 2, color: "text-gray-400", bg: "bg-gray-700", size: "w-16 h-16" },
                  { pos: 1, color: "text-yellow-400", bg: "bg-yellow-400/20", size: "w-20 h-20" },
                  { pos: 3, color: "text-orange-400", bg: "bg-orange-400/20", size: "w-16 h-16" },
                ].map((item, i) => {
                  const worker = topWorkers[item.pos - 1];
                  return (
                    <div key={i} className={`flex flex-col items-center ${item.pos === 1 ? 'order-2' : item.pos === 2 ? 'order-1' : 'order-3'}`}>
                      <div className={`${item.size} ${item.bg} rounded-full flex items-center justify-center text-2xl font-black ${item.color} mb-2 border-2 ${item.pos === 1 ? 'border-yellow-400' : 'border-gray-600'}`}>
                        {worker ? worker.display_name?.charAt(0) || "?" : ["🥈", "🥇", "🥉"][i]}
                      </div>
                      <div className={`text-xs font-bold ${item.color}`}>#{item.pos}</div>
                      <div className="text-sm font-semibold mt-1">{worker?.display_name || `Usuario ${item.pos}`}</div>
                      <div className="text-xs text-gray-400">{worker?.total_points?.toLocaleString() || "—"} pts</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="divide-y divide-gray-800">
              {(topWorkers.length > 0 ? topWorkers.slice(3, 8) : Array(5).fill(null)).map((worker, i) => (
                <div key={i} className="flex items-center gap-4 p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="w-8 text-center text-gray-500 font-bold">#{i + 4}</div>
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-sm">
                    {worker?.display_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{worker?.display_name || `Usuario ${i + 4}`}</div>
                    <div className="text-xs text-gray-500">Nivel {worker?.level || Math.floor(Math.random() * 10) + 1}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold text-sm">{worker?.total_points?.toLocaleString() || `${(10000 - i * 1200).toLocaleString()}`}</div>
                    <div className="text-xs text-gray-500">puntos</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 text-center border-t border-gray-700">
              <Link to={createPageUrl("Ranking")} className="text-yellow-400 text-sm font-semibold hover:underline flex items-center justify-center gap-1">
                Ver ranking completo <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4">Lo que dicen nuestros usuarios</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-yellow-400/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-black">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name} {t.country}</div>
                    <div className={`text-xs ${t.role === "Worker" ? "text-yellow-400" : "text-blue-400"}`}>{t.role}</div>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                {t.points && (
                  <div className="flex gap-3 text-xs">
                    <span className="bg-yellow-400/10 text-yellow-400 px-2 py-1 rounded-full">{t.points} pts</span>
                    <span className="bg-green-400/10 text-green-400 px-2 py-1 rounded-full">Nivel {t.level}</span>
                  </div>
                )}
                {t.campaigns && (
                  <div className="flex gap-3 text-xs">
                    <span className="bg-blue-400/10 text-blue-400 px-2 py-1 rounded-full">{t.campaigns} campañas</span>
                    <span className="bg-green-400/10 text-green-400 px-2 py-1 rounded-full">{t.spent} gastado</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-3xl p-12">
            <h2 className="text-4xl font-black mb-4">¿Listo para comenzar?</h2>
            <p className="text-gray-400 text-lg mb-8">Únete a miles de usuarios que ya están ganando dinero</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl("Register")} className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-lg px-8 py-4 rounded-2xl hover:opacity-90 transition-all hover:scale-105">
                <Users className="w-5 h-5" />
                Registrarme como Usuario
              </Link>
              <Link to={createPageUrl("Register")} className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg px-8 py-4 rounded-2xl hover:opacity-90 transition-all hover:scale-105">
                <TrendingUp className="w-5 h-5" />
                Crear mi primera campaña
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
            <span className="font-bold text-xl">ClickWin</span>
          </div>
          <div className="text-gray-500 text-sm text-center">
            Plataforma de interacciones orgánicas en redes sociales. Todos los derechos reservados © 2026
          </div>
            <div className="flex gap-4 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Términos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Contacto</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
