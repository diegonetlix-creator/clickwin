import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/supabase";
import { auditLog, ACTION } from "@/utils";
import { toast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Shield, Plus, Trash2, Eye, EyeOff, Ban, RefreshCw,
  ImagePlus, X, Check, Edit3, ArrowLeft, Search,
  AlertTriangle, Users, TrendingUp, FileText, Zap,
  ChevronDown, Upload, RotateCcw
} from "lucide-react";

const STATUS_CONFIG = {
  active:    { label: "Activo",   color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/30"  },
  hidden:    { label: "Oculto",   color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
  banned:    { label: "Baneado",  color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/30"    },
  paused:    { label: "Pausado",  color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/30"   },
  draft:     { label: "Borrador", color: "text-gray-400",   bg: "bg-gray-400/10",   border: "border-gray-400/30"   },
  completed: { label: "Completo", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  expired:   { label: "Expirado", color: "text-gray-500",   bg: "bg-gray-500/10",   border: "border-gray-500/30"   },
};

export default function AdminFeed() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [posts, setPosts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState(null);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editPost, setEditPost]     = useState(null);
  const [uploading, setUploading]   = useState(false);

  // Create / Edit form state
  const [form, setForm] = useState({
    caption: "", category: "Marketing", social_network: "instagram",
    image_url: "", media_type: "image", cta_text: "¡Completa esta tarea!",
    reward: 0, spots_total: 100
  });

  // Stats
  const stats = {
    total:  posts.length,
    active: posts.filter(p => p.status === "active").length,
    hidden: posts.filter(p => p.status === "hidden").length,
    banned: posts.filter(p => p.status === "banned").length,
  };

  useEffect(() => {
    if (!isAdmin) { navigate("/"); return; }
    fetchPosts();
  }, [isAdmin]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("feed_posts")
        .select(`*, author:profiles(name, email, avatar_url, role)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error("[AdminFeed] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── MODERATION ACTIONS ───────────────────────────────────────────────────
  const setPostStatus = async (postId, newStatus) => {
    setProcessing(postId + newStatus);
    try {
      const { error } = await supabase
        .from("feed_posts")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", postId);

      if (error) throw error;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: newStatus } : p));

      // ── Audit log (Non-blocking) ──
      auditLog(ACTION.UPDATE_POST_STATUS, "feed_posts", postId, { new_status: newStatus });
      toast.success(`Post ${newStatus === 'active' ? 'activado' : newStatus === 'hidden' ? 'ocultado' : 'baneado'}`);
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const deletePost = async (postId) => {
    if (!confirm("¿Eliminar esta publicación permanentemente? Esta acción no se puede deshacer.")) return;
    setProcessing(postId + "delete");
    // Snapshot caption before delete for the audit trail
    const postSnapshot = posts.find(p => p.id === postId);
    try {
      const { error } = await supabase.from("feed_posts").delete().eq("id", postId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));

      // ── Audit log (Non-blocking) ──
      auditLog(ACTION.DELETE_POST, "feed_posts", postId, {
        caption:  postSnapshot?.caption?.slice(0, 120),
        author_id: postSnapshot?.author_id,
        status:   postSnapshot?.status,
      });
      toast.success("Publicación eliminada permanentemente");
    } catch (err) {
      toast.error("Error al eliminar: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  // ─── MEDIA UPLOAD ─────────────────────────────────────────────────────────
  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const media_type = file.type.startsWith("video/") ? "video" : "image";

      const { error: uploadError } = await supabase.storage
        .from("posts-media")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("posts-media").getPublicUrl(path);
      setForm(prev => ({ ...prev, image_url: urlData.publicUrl, media_type }));
    } catch (err) {
      console.error("[AdminFeed] upload error:", err);
      toast.error("Error: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── CREATE / EDIT POST ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.caption.trim()) return alert("El texto del post es obligatorio.");

    setProcessing("save");
    try {
      if (editPost) {
        // UPDATE
        const { error } = await supabase
          .from("feed_posts")
          .update({
            caption:        form.caption,
            category:       form.category,
            social_network: form.social_network,
            image_url:      form.image_url || null,
            cta_text:       form.cta_text,
            reward:         Number(form.reward) || 0,
            spots_total:    Number(form.spots_total) || 100,
            updated_at:     new Date().toISOString()
          })
          .eq("id", editPost.id);

        if (error) throw error;

        // ── Audit log (Non-blocking) ──
        auditLog(ACTION.EDIT_POST, "feed_posts", editPost.id, {
          caption:  form.caption.slice(0, 120),
          category: form.category,
          reward:   form.reward,
        });

        await fetchPosts();
        setEditPost(null);
      } else {
        // INSERT
        const { data: inserted, error } = await supabase.from("feed_posts").insert({
          author_id:      user.id,
          author_name:    "ClickWin Admin",
          caption:        form.caption,
          category:       form.category,
          social_network: form.social_network,
          image_url:      form.image_url || null,
          cta_text:       form.cta_text,
          reward:         Number(form.reward) || 0,
          spots_total:    Number(form.spots_total) || 100,
          status:         "active",
          is_promoted:    true,
        }).select("id").single();

        if (error) throw error;

        // ── Audit log (Non-blocking) ──
        auditLog(ACTION.CREATE_POST, "feed_posts", inserted?.id, {
          caption:  form.caption.slice(0, 120),
          category: form.category,
          reward:   form.reward,
        });

        await fetchPosts();
        setShowCreate(false);
        toast.success("Publicación creada");
      }

      resetForm();
    } catch (err) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const resetForm = () => {
    setForm({ caption: "", category: "Marketing", social_network: "instagram",
      image_url: "", media_type: "image", cta_text: "¡Completa esta tarea!", reward: 0, spots_total: 100 });
  };

  const openEdit = (post) => {
    setEditPost(post);
    setForm({
      caption:        post.caption || "",
      category:       post.category || "Marketing",
      social_network: post.social_network || "instagram",
      image_url:      post.image_url || "",
      media_type:     "image",
      cta_text:       post.cta_text || "¡Completa esta tarea!",
      reward:         post.reward || 0,
      spots_total:    post.spots_total || 100,
    });
    setShowCreate(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── FILTERS ──────────────────────────────────────────────────────────────
  const filtered = posts.filter(p => {
    const matchSearch = !search ||
      p.caption?.toLowerCase().includes(search.toLowerCase()) ||
      p.author?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.author?.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (!isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <button onClick={() => navigate("/admin-dashboard")}
            className="flex items-center gap-2 text-gray-500 hover:text-white mb-3 transition-colors group text-xs font-black uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Admin Dashboard
          </button>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Shield className="w-8 h-8 text-violet-400" />
            Control del Feed
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Gestión completa de publicaciones, moderación y contenido</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchPosts} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white rounded-xl transition-all text-sm font-bold">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button onClick={() => { setShowCreate(!showCreate); setEditPost(null); resetForm(); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all text-sm font-black shadow-lg shadow-violet-500/20">
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCreate ? "Cancelar" : "Nueva Publicación"}
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total",   value: stats.total,  icon: FileText,     color: "text-white",        bg: "bg-white/5"         },
          { label: "Activos", value: stats.active, icon: TrendingUp,   color: "text-green-400",    bg: "bg-green-400/10"    },
          { label: "Ocultos", value: stats.hidden, icon: EyeOff,       color: "text-yellow-400",   bg: "bg-yellow-400/10"   },
          { label: "Baneados",value: stats.banned, icon: Ban,          color: "text-red-400",      bg: "bg-red-400/10"      },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border border-white/10 rounded-2xl p-5 flex items-center gap-4`}>
            <Icon className={`w-6 h-6 ${color}`} />
            <div>
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CREATE / EDIT FORM ── */}
      {showCreate && (
        <div className="bg-gray-900/80 border border-violet-500/30 rounded-3xl p-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-black flex items-center gap-2">
            {editPost ? <Edit3 className="w-5 h-5 text-violet-400" /> : <Plus className="w-5 h-5 text-violet-400" />}
            {editPost ? "Editar Publicación" : "Crear Nueva Publicación"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Caption */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Texto / Caption *</label>
              <textarea rows={3} value={form.caption}
                onChange={e => setForm(prev => ({ ...prev, caption: e.target.value }))}
                placeholder="Escribe el contenido de la publicación..."
                className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-400 transition-all resize-none" />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Categoría</label>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-400">
                {["Marketing","Diseño","Tecnología","Ventas","Contenido","Fotografía","Redes Sociales","Otros"].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Network */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Red Social</label>
              <select value={form.social_network} onChange={e => setForm(prev => ({ ...prev, social_network: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-400">
                {["instagram","tiktok","youtube","twitter","facebook"].map(n => (
                  <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Reward */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Recompensa (pts)</label>
              <input type="number" min={0} value={form.reward}
                onChange={e => setForm(prev => ({ ...prev, reward: e.target.value }))}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-400" />
            </div>

            {/* Spots */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Cupos Totales</label>
              <input type="number" min={1} value={form.spots_total}
                onChange={e => setForm(prev => ({ ...prev, spots_total: e.target.value }))}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-400" />
            </div>

            {/* CTA */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Texto del botón (CTA)</label>
              <input type="text" value={form.cta_text}
                onChange={e => setForm(prev => ({ ...prev, cta_text: e.target.value }))}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-400" />
            </div>

            {/* Media */}
            <div className="md:col-span-2 space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Imagen / Video</label>
              <div className="flex gap-4 items-start">
                {form.image_url && (
                  <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                    {form.media_type === "video"
                      ? <video src={form.image_url} className="w-full h-full object-cover" />
                      : <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                    }
                    <button onClick={() => setForm(prev => ({ ...prev, image_url: "" }))}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex flex-col items-center gap-2 px-8 py-6 border-2 border-dashed border-gray-700 rounded-2xl hover:border-violet-500 transition-all text-gray-500 hover:text-violet-400 disabled:opacity-50">
                  {uploading
                    ? <><RefreshCw className="w-6 h-6 animate-spin" /><span className="text-xs font-bold">Subiendo...</span></>
                    : <><Upload className="w-6 h-6" /><span className="text-xs font-bold">Seleccionar archivo</span><span className="text-[10px]">JPG, PNG, MP4, WebM</span></>
                  }
                </button>
                <input ref={fileInputRef} type="file" className="hidden"
                  accept="image/*,video/*" onChange={handleMediaUpload} />

                {/* Or URL */}
                <div className="flex-1 space-y-1">
                  <span className="text-[10px] text-gray-600 font-bold uppercase">O pega una URL de imagen</span>
                  <input type="url" placeholder="https://..." value={form.image_url}
                    onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={processing === "save" || uploading}
              className="flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-black text-sm transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20">
              {processing === "save"
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Guardando...</>
                : <><Check className="w-4 h-4" /> {editPost ? "Actualizar Post" : "Publicar Ahora"}</>
              }
            </button>
            <button onClick={() => { setShowCreate(false); setEditPost(null); resetForm(); }}
              className="px-6 py-3 bg-gray-800 text-gray-400 rounded-xl font-bold text-sm hover:text-white transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── FILTERS ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por texto, autor o email..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors" />
        </div>
        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white outline-none focus:border-violet-500 cursor-pointer">
            <option value="all">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* ── POSTS TABLE / GRID ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-3xl">
          <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 font-bold">No se encontraron publicaciones</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((post, idx) => {
            const sc = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
            const isProcessing = processing?.startsWith(post.id);
            return (
              <div key={post.id}
                className="group bg-gray-900/60 border border-gray-800 rounded-3xl overflow-hidden hover:border-white/10 transition-all animate-in slide-in-from-bottom-2"
                style={{ animationDelay: `${idx * 30}ms` }}>
                <div className="flex flex-col md:flex-row gap-0">
                  
                  {/* Media Thumbnail */}
                  <div className="w-full md:w-48 md:flex-shrink-0 bg-gray-800 relative overflow-hidden">
                    {post.image_url
                      ? <img src={post.image_url} alt="post" className="w-full h-40 md:h-full object-cover" />
                      : <div className="w-full h-40 md:h-full flex items-center justify-center">
                          <ImagePlus className="w-10 h-10 text-gray-700" />
                        </div>
                    }
                    {/* Status overlay */}
                    {post.status !== "active" && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${sc.color} ${sc.bg} ${sc.border}`}>
                          {sc.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6 flex flex-col justify-between gap-4">
                    <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                      <div className="space-y-2 flex-1">
                        {/* Author */}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] font-black text-violet-400">
                            {post.author?.name?.charAt(0) || "?"}
                          </div>
                          <span className="text-xs text-gray-400 font-bold">
                            {post.author?.name || post.author_name || "Anónimo"}
                          </span>
                          <span className="text-[10px] text-gray-600">·</span>
                          <span className="text-[10px] text-gray-600">{post.author?.email || ""}</span>
                          <span className={`ml-1 text-[9px] font-black px-2 py-0.5 rounded-full ${sc.bg} ${sc.color} border ${sc.border}`}>
                            {sc.label}
                          </span>
                        </div>

                        {/* Caption */}
                        <p className="text-sm text-gray-300 leading-relaxed line-clamp-2">
                          {post.caption || <span className="text-gray-600 italic">Sin texto</span>}
                        </p>

                        {/* Meta */}
                        <div className="flex flex-wrap gap-3 text-[10px] text-gray-600 font-bold">
                          {post.social_network && <span>📱 {post.social_network}</span>}
                          {post.category && <span>🏷 {post.category}</span>}
                          {post.reward > 0 && <span className="text-yellow-500">⚡ {post.reward} pts</span>}
                          <span>👁 {post.views_count ?? 0}</span>
                          <span>❤️ {post.likes_count ?? 0}</span>
                          <span>📅 {new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap md:flex-col gap-2 md:items-end">
                        {/* Edit */}
                        <button onClick={() => openEdit(post)} disabled={isProcessing}
                          title="Editar post"
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all text-xs font-black disabled:opacity-50">
                          <Edit3 className="w-3.5 h-3.5" /> Editar
                        </button>

                        {/* Toggle Hidden */}
                        {post.status !== "hidden" ? (
                          <button onClick={() => setPostStatus(post.id, "hidden")} disabled={isProcessing}
                            title="Ocultar post"
                            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/20 transition-all text-xs font-black disabled:opacity-50">
                            <EyeOff className="w-3.5 h-3.5" /> Ocultar
                          </button>
                        ) : (
                          <button onClick={() => setPostStatus(post.id, "active")} disabled={isProcessing}
                            title="Restaurar post"
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-all text-xs font-black disabled:opacity-50">
                            <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                          </button>
                        )}

                        {/* Ban / Restore */}
                        {post.status !== "banned" ? (
                          <button onClick={() => setPostStatus(post.id, "banned")} disabled={isProcessing}
                            title="Banear post"
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-xs font-black disabled:opacity-50">
                            <Ban className="w-3.5 h-3.5" /> Banear
                          </button>
                        ) : (
                          <button onClick={() => setPostStatus(post.id, "active")} disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-all text-xs font-black disabled:opacity-50">
                            <Check className="w-3.5 h-3.5" /> Activar
                          </button>
                        )}

                        {/* Delete */}
                        <button onClick={() => deletePost(post.id)} disabled={isProcessing}
                          title="Eliminar para siempre"
                          className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-gray-500 border border-gray-700 rounded-xl hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all text-xs font-black disabled:opacity-50">
                          {isProcessing && processing === post.id + "delete"
                            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FOOTER NOTE ── */}
      <div className="bg-violet-900/10 border border-violet-900/20 rounded-2xl p-5 flex items-center gap-4">
        <AlertTriangle className="w-5 h-5 text-violet-400 flex-shrink-0" />
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="text-violet-400 font-bold">Modo Admin:</span> Los posts ocultos y baneados desaparecen del feed público pero permanecen en la base de datos. Solo Eliminar remueve el registro permanentemente. Los usuarios normales nunca verán este panel.
        </p>
      </div>
    </div>
  );
}


