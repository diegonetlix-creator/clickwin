import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/supabase";
import { toast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Shield, Plus, Trash2, RefreshCw,
  ArrowLeft, Upload, X, Check, ChevronLeft, ChevronRight,
  ImagePlus, Edit3, ToggleLeft, ToggleRight,
  Zap, Star, AlertTriangle, Play
} from "lucide-react";

// ─── MODAL de creación / edición ─────────────────────────────────────────────
function BannerModal({ banner, onClose, onSaved }) {
  const fileInputRef = useRef(null);
  const isEdit = !!banner;

  const [form, setForm] = useState({
    title:    banner?.title    || "",
    subtitle: banner?.subtitle || "",
    cta_text: banner?.cta_text || "",
    cta_url:  banner?.cta_url  || "",
  });
  const [pendingMedia, setPendingMedia] = useState([]);  // {url, media_type}
  const [uploading, setUploading]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  // Block page scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── UPLOAD ──────────────
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setError("");
    try {
      const results = [];
      for (const file of files) {
        const ext = file.name.split(".").pop().toLowerCase();
        const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const media_type = file.type.startsWith("video/") ? "video"
          : ext === "gif" ? "gif" : "image";

        const { error: upErr } = await supabase.storage
          .from("feed-banners")
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from("feed-banners").getPublicUrl(path);
        results.push({ url: urlData.publicUrl, media_type });
      }
      setPendingMedia(prev => [...prev, ...results]);
    } catch (err) {
      console.error("[BannerModal] upload:", err);
      setError("Error al subir: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── SAVE ──────────────
  const handleSave = async () => {
    setError("");

    if (!form.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!isEdit && pendingMedia.length === 0) {
      setError("Debes agregar al menos una imagen o video.");
      return;
    }

    setSaving(true);
    try {
      let bannerId;

      if (isEdit) {
        const { error: updErr } = await supabase
          .from("feed_banners")
          .update({
            title:      form.title,
            subtitle:   form.subtitle,
            cta_text:   form.cta_text,
            cta_url:    form.cta_url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", banner.id);
        if (updErr) throw updErr;
        bannerId = banner.id;
      } else {
        const { data: newBanner, error: insErr } = await supabase
          .from("feed_banners")
          .insert({
            title:     form.title,
            subtitle:  form.subtitle,
            cta_text:  form.cta_text,
            cta_url:   form.cta_url,
            is_active: false,
          })
          .select()
          .single();
        if (insErr) throw insErr;
        bannerId = newBanner.id;
      }

      // Insert new media items
      if (pendingMedia.length > 0) {
        const existingCount = banner?.feed_banner_items?.length || 0;
        const items = pendingMedia.map((m, i) => ({
          banner_id:  bannerId,
          media_url:  m.url,
          media_type: m.media_type,
          position:   existingCount + i,
        }));
        const { error: itemErr } = await supabase.from("feed_banner_items").insert(items);
        if (itemErr) throw itemErr;
      }

      alert(`✅ Banner ${isEdit ? "actualizado" : "creado"} correctamente.`);
      onSaved();
      onClose();
    } catch (err) {
      console.error("[BannerModal] save:", err);
      setError("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    /* OVERLAY */
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* PANEL */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-950 border border-yellow-400/30 rounded-3xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-8 py-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-yellow-400 flex items-center gap-2">
            {isEdit ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {isEdit ? `Editar: ${banner.title}` : "Nuevo Banner"}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "title",    label: "Título *",            placeholder: "ClickWin — Gana Más" },
              { key: "subtitle", label: "Subtítulo",           placeholder: "Completa misiones y gana recompensas" },
              { key: "cta_text", label: "Texto del botón CTA", placeholder: "Comenzar ahora →" },
              { key: "cta_url",  label: "URL del botón",       placeholder: "/worker-dashboard" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-400 transition-all"
                />
              </div>
            ))}
          </div>

          {/* Existing items (edit mode) */}
          {isEdit && banner.feed_banner_items?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Slides actuales ({banner.feed_banner_items.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {banner.feed_banner_items.map((item, i) => (
                  <div key={item.id} className="relative w-24 h-20 rounded-xl overflow-hidden border border-white/10">
                    {item.media_type === "video"
                      ? <video src={item.media_url} className="w-full h-full object-cover" muted />
                      : <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                    }
                    <div className="absolute bottom-1 left-1 text-[8px] bg-black/60 px-1 py-0.5 rounded text-white font-bold">#{i + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              {isEdit ? "Agregar más slides" : "Imágenes / GIFs / Videos *"}
            </p>

            {/* Pending preview */}
            {pendingMedia.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingMedia.map((m, i) => (
                  <div key={i} className="relative w-24 h-20 rounded-xl overflow-hidden border border-yellow-400/40">
                    {m.media_type === "video"
                      ? <video src={m.url} className="w-full h-full object-cover" muted />
                      : <img src={m.url} alt="" className="w-full h-full object-cover" />
                    }
                    <button
                      onClick={() => setPendingMedia(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[8px] bg-black/70 px-1 py-0.5 rounded text-yellow-400 font-black uppercase">
                      {m.media_type}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center gap-2 px-6 py-8 border-2 border-dashed border-gray-700 rounded-2xl hover:border-yellow-400/60 hover:bg-yellow-400/5 transition-all text-gray-500 hover:text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="text-sm font-bold">Subiendo archivos...</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  <span className="text-sm font-bold">Haz clic para seleccionar archivos</span>
                  <span className="text-xs text-gray-600">JPG · PNG · GIF · WEBP · MP4 · WEBM</span>
                  <span className="text-xs text-gray-700">Puedes seleccionar múltiples archivos a la vez</span>
                </>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*,.gif"
              onChange={handleFiles}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-950 border-t border-gray-800 px-8 py-5 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex items-center gap-2 px-8 py-3 bg-yellow-400 hover:bg-yellow-300 text-black rounded-xl font-black text-sm transition-all disabled:opacity-50 shadow-lg shadow-yellow-400/20"
          >
            {saving
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Guardando...</>
              : <><Check className="w-4 h-4" /> {isEdit ? "Actualizar Banner" : "Crear Banner"}</>
            }
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-800 text-gray-400 hover:text-white rounded-xl font-bold text-sm transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AdminBanners() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [banners, setBanners]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [processing, setProcessing]         = useState(null);
  const [modalOpen, setModalOpen]           = useState(false);
  const [editTarget, setEditTarget]         = useState(null); // null = create
  const [previewBanner, setPreviewBanner]   = useState(null);

  useEffect(() => {
    if (!isAdmin) { navigate("/"); return; }
    fetchBanners();
  }, [isAdmin]);

  // ── DATA ──────────────────────────────────────────────────────────────────
  const fetchBanners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("feed_banners")
        .select("*, feed_banner_items(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const sorted = (data || []).map(b => ({
        ...b,
        feed_banner_items: [...(b.feed_banner_items || [])].sort((a, b) => a.position - b.position),
      }));
      setBanners(sorted);
    } catch (err) {
      console.error("[AdminBanners] fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── OPEN MODAL ────────────────────────────────────────────────────────────
  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit   = (b) => { setEditTarget(b);   setModalOpen(true); };

  // ── TOGGLE ACTIVE ─────────────────────────────────────────────────────────
  const toggleActive = async (banner) => {
    setProcessing(banner.id);
    try {
      if (!banner.is_active) {
        // Deactivate all, then activate this one
        await supabase.from("feed_banners").update({ is_active: false });
        await supabase.from("feed_banners").update({ is_active: true }).eq("id", banner.id);
        setBanners(prev => prev.map(b => ({ ...b, is_active: b.id === banner.id })));
      } else {
        await supabase.from("feed_banners").update({ is_active: false }).eq("id", banner.id);
        setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: false } : b));
      }
    } catch (err) {
      console.error("[AdminBanners] toggle:", err);
      toast.error("Error: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  // ── DELETE BANNER ─────────────────────────────────────────────────────────
  const deleteBanner = async (bannerId) => {
    if (!confirm("¿Eliminar este banner y todos sus slides? No se puede deshacer.")) return;
    setProcessing(bannerId);
    try {
      const { error } = await supabase.from("feed_banners").delete().eq("id", bannerId);
      if (error) throw error;
      setBanners(prev => prev.filter(b => b.id !== bannerId));
      if (previewBanner?.id === bannerId) setPreviewBanner(null);
      alert("Banner eliminado.");
    } catch (err) {
      console.error("[AdminBanners] delete:", err);
      toast.error("Error: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  // ── DELETE ITEM ───────────────────────────────────────────────────────────
  const deleteItem = async (bannerId, itemId) => {
    try {
      await supabase.from("feed_banner_items").delete().eq("id", itemId);
      setBanners(prev => prev.map(b =>
        b.id === bannerId
          ? { ...b, feed_banner_items: b.feed_banner_items.filter(i => i.id !== itemId) }
          : b
      ));
    } catch (err) {
      console.error("[AdminBanners] deleteItem:", err);
    }
  };

  if (!isAdmin) return null;

  const activeBanner = banners.find(b => b.is_active);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <button
            onClick={() => navigate("/admin-dashboard")}
            className="flex items-center gap-2 text-gray-500 hover:text-white mb-3 transition-colors text-xs font-black uppercase tracking-widest group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Admin Dashboard
          </button>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Star className="w-8 h-8 text-yellow-400" />
            Banners del Feed
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Carruseles dinámicos que aparecen en el tope del Feed para todos los usuarios
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchBanners}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white rounded-xl transition-all text-sm font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refrescar
          </button>
          {/* ✅ BOTÓN NUEVO BANNER — solo abre el modal */}
          <button
            id="btn-nuevo-banner"
            onClick={openCreate}
            className="flex items-center gap-2 px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black rounded-xl transition-all text-sm font-black shadow-lg shadow-yellow-400/20"
          >
            <Plus className="w-4 h-4" />
            Nuevo Banner
          </button>
        </div>
      </div>

      {/* ── LIVE PREVIEW ── */}
      {activeBanner && (
        <div className="relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-gray-900/50 p-1">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Zap className="w-3 h-3" /> EN VIVO EN EL FEED
          </div>
          <BannerCarousel banner={activeBanner} />
        </div>
      )}

      {/* ── BANNERS LIST ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-3xl">
          <Star className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 font-bold">No hay banners aún</p>
          <p className="text-gray-600 text-sm mt-1 mb-6">Crea el primer banner para mostrarlo en el Feed</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black rounded-xl font-black text-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Crear primer banner
          </button>
        </div>
      ) : (
        <div className="grid gap-5">
          {banners.map(banner => {
            const items  = banner.feed_banner_items || [];
            const isProc = processing === banner.id;

            return (
              <div
                key={banner.id}
                className={`rounded-3xl border overflow-hidden transition-all ${
                  banner.is_active
                    ? "border-yellow-400/40 bg-yellow-400/5 shadow-xl shadow-yellow-400/5"
                    : "border-gray-800 bg-gray-900/40 hover:border-gray-700"
                }`}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Thumbnail */}
                  <div className="w-full md:w-52 flex-shrink-0 bg-gray-900 relative overflow-hidden">
                    {items.length > 0 ? (
                      <div className="flex h-40 md:h-full">
                        {items.slice(0, 3).map((item, i) => (
                          <div key={item.id} className="flex-1 overflow-hidden" style={{ opacity: 1 - i * 0.3 }}>
                            {item.media_type === "video"
                              ? <video src={item.media_url} className="w-full h-full object-cover" muted />
                              : <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                            }
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="w-full h-40 md:h-full flex items-center justify-center">
                        <ImagePlus className="w-10 h-10 text-gray-700" />
                      </div>
                    )}
                    {banner.is_active && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-yellow-400 text-black px-2 py-1 rounded-full text-[9px] font-black uppercase">
                        <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" /> Activo
                      </div>
                    )}
                  </div>

                  {/* Info + actions */}
                  <div className="flex-1 p-6 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="font-black text-lg">{banner.title || "Sin título"}</h3>
                          {banner.subtitle && <p className="text-sm text-gray-400">{banner.subtitle}</p>}
                        </div>
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest flex-shrink-0 ${
                          banner.is_active
                            ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"
                            : "bg-gray-800 text-gray-500 border-gray-700"
                        }`}>
                          {banner.is_active ? "🟡 Activo" : "⚫ Inactivo"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[10px] text-gray-600 font-bold">
                        <span>🖼 {items.length} slide{items.length !== 1 ? "s" : ""}</span>
                        {banner.cta_text && <span>🔘 {banner.cta_text}</span>}
                        <span>📅 {new Date(banner.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* Preview */}
                      <button
                        onClick={() => setPreviewBanner(previewBanner?.id === banner.id ? null : banner)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-gray-400 border border-gray-700 rounded-xl hover:text-white transition-all text-xs font-black"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {previewBanner?.id === banner.id ? "Cerrar" : "Preview"}
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => openEdit(banner)}
                        disabled={isProc}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all text-xs font-black disabled:opacity-50"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </button>
                      {/* Toggle */}
                      <button
                        onClick={() => toggleActive(banner)}
                        disabled={isProc}
                        className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all text-xs font-black disabled:opacity-50 ${
                          banner.is_active
                            ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                            : "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                        }`}
                      >
                        {isProc
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : banner.is_active
                            ? <><ToggleRight className="w-3.5 h-3.5" /> Desactivar</>
                            : <><ToggleLeft className="w-3.5 h-3.5" /> Activar</>
                        }
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => deleteBanner(banner.id)}
                        disabled={isProc}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-gray-500 border border-gray-700 rounded-xl hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all text-xs font-black disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filmstrip */}
                {items.length > 0 && (
                  <div className="px-6 pb-5 border-t border-white/5 pt-3 flex gap-2 overflow-x-auto">
                    {items.map((item, i) => (
                      <div key={item.id} className="relative group/item flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border border-white/10">
                        {item.media_type === "video"
                          ? <video src={item.media_url} className="w-full h-full object-cover" muted />
                          : <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                        }
                        <div className="absolute bottom-0.5 left-0.5 w-4 h-4 bg-black/60 rounded flex items-center justify-center text-[7px] font-black text-white">
                          {i + 1}
                        </div>
                        <button
                          onClick={() => deleteItem(banner.id, item.id)}
                          className="absolute inset-0 bg-red-900/70 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="w-4 h-4 text-red-300" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline preview */}
                {previewBanner?.id === banner.id && (
                  <div className="p-4 border-t border-yellow-400/10">
                    <BannerCarousel banner={banner} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NOTE ── */}
      <div className="bg-yellow-900/10 border border-yellow-800/20 rounded-2xl p-5 flex items-start gap-4">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="text-yellow-500 font-bold">Solo un banner puede estar activo a la vez.</span>{" "}
          Al activar uno se desactivan los demás automáticamente. El banner activo aparece en el tope del Feed para todos los usuarios.
        </p>
      </div>

      {/* ── MODAL ── */}
      {modalOpen && (
        <BannerModal
          banner={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onSaved={fetchBanners}
        />
      )}
    </div>
  );
}

// ─── CAROUSEL COMPONENT ───────────────────────────────────────────────────────
function BannerCarousel({ banner }) {
  const items = [...(banner?.feed_banner_items || [])].sort((a, b) => a.position - b.position);
  const [idx, setIdx]       = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef         = useRef(null);
  const touchStart          = useRef(null);

  const goTo = useCallback((i) => {
    setIdx(((i % items.length) + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1 || paused) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => setIdx(p => (p + 1) % items.length), 5000);
    return () => clearInterval(intervalRef.current);
  }, [items.length, paused]);

  if (!items.length) return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center h-40 text-gray-600 text-sm">
      Sin slides
    </div>
  );

  const cur = items[idx];

  return (
    <div
      className="relative rounded-2xl overflow-hidden select-none"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={e => { touchStart.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchStart.current === null) return;
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) goTo(idx + (diff > 0 ? 1 : -1));
        touchStart.current = null;
      }}
    >
      <div className="relative aspect-[16/7] bg-black">
        {cur.media_type === "video"
          ? <video key={cur.id} src={cur.media_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
          : <img key={cur.id} src={cur.media_url} alt={banner.title} className="w-full h-full object-cover" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
      </div>

      {/* Progress bars */}
      {items.length > 1 && (
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-2">
          {items.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full"
                style={i < idx ? { width: "100%" } : i === idx ? { width: "0%", animation: paused ? "none" : "bprog 5s linear forwards" } : { width: "0%" }} />
            </div>
          ))}
        </div>
      )}

      {/* Text overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 space-y-1">
        {banner.title    && <h2 className="text-xl md:text-4xl font-black text-white drop-shadow-lg">{banner.title}</h2>}
        {banner.subtitle && <p className="text-xs md:text-base text-white/80">{banner.subtitle}</p>}
        {banner.cta_text && (
          <div className="pt-2">
            <span className="inline-block bg-yellow-400 text-black font-black text-xs md:text-sm px-5 py-2 rounded-full shadow-lg shadow-yellow-400/20">
              {banner.cta_text}
            </span>
          </div>
        )}
      </div>

      {/* Arrows */}
      {items.length > 1 && (
        <>
          <button onClick={() => goTo(idx - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => goTo(idx + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {items.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${i === idx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30"}`} />
          ))}
        </div>
      )}

      {/* Pause icon */}
      {paused && items.length > 1 && (
        <div className="absolute top-4 right-4 w-6 h-6 bg-black/40 rounded-full flex items-center justify-center gap-0.5">
          <div className="w-0.5 h-2.5 bg-white rounded-full" />
          <div className="w-0.5 h-2.5 bg-white rounded-full" />
        </div>
      )}

      <style>{`@keyframes bprog { from{width:0%} to{width:100%} }`}</style>
    </div>
  );
}


