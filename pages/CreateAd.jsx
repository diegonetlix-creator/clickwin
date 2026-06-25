import { supabase } from "@/supabase";
import { toast } from "@/components/Toast";
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { createPageUrl, uploadFile } from "@/utils";
import User from "@/entities/User";
import { Campaign } from "@/entities/Campaign";
import {
  Upload, Sparkles, Image as ImageIcon, CheckCircle, 
  Tag as TagIcon, MapPin, Users, Calendar, Zap, ClipboardList,
  DollarSign, Eye, ExternalLink
} from "lucide-react";

const CATEGORIES = ["Marketing", "Diseño", "Tecnología", "Ventas", "Contenido", "Fotografía", "Eventos", "Otros"];
const REWARD_TYPES = ["Dinero", "Puntos", "Producto", "Descuento", "Otro"];
const CTA_SUGGESTIONS = ["¡Únete ahora!", "¡Acepta el reto!", "¡Gana hoy!", "¡Participa ya!", "¡Hazlo tú!", "¡Sé el primero!"];

export default function CreateAd() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.state?.mode === "edit";
  const editId = location.state?.campaignId;
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentTag, setCurrentTag] = useState("");
  const [category, setCategory] = useState("Marketing");
  const [form, setForm] = useState({
    title: "",
    description: "",
    reward_value: 0,
    reward_type: "Dinero",
    cta_text: "¡Acepta el reto!",
    deadline: "",
    max_participants: 1,
    location: "",
    target_url: "",
    social_network: "taskbloom",
    task_type: "custom",
    tags: [],
  });

  useEffect(() => {
    if (isEditMode && !editId) {
      navigate(createPageUrl("MyCampaigns"));
      return;
    }
    
    if (isEditMode && editId) {
      loadCampaign();
    }
  }, [isEditMode, editId, navigate]);

  const loadCampaign = async () => {
    setLoading(true);
    try {
      const { data, error } = supabase
        .from("campaigns")
        .select("*")
        .eq("id", editId)
        .single();
      
      if (error) throw error;
      if (data) {
        setForm({
          title: data.title || "",
          description: data.description || data.instructions || "",
          reward_value: data.reward_per_task || 0,
          reward_type: data.reward_type || "Dinero",
          cta_text: data.cta_text || "¡Acepta el reto!",
          deadline: data.deadline ? data.deadline.split("T")[0] : "",
          max_participants: data.max_participants || 1,
          location: data.location || "",
          target_url: data.target_url || "",
          social_network: data.social_network || "taskbloom",
          task_type: data.task_type || "custom",
          tags: data.tags || [],
        });
        if (data.category) {
          setCategory(data.category);
        }
        if (data.reference_image_url) {
          setImagePreview(data.reference_image_url);
        }
      }
    } catch (err) {
      console.error("Error loading campaign:", err);
    } finally {
      setLoading(false);
    }
  };

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 10MB");
      return;
    }
    
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const addTag = () => {
    if (currentTag.trim() && !form.tags.includes(currentTag.trim())) {
      update("tags", [...form.tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    update("tags", form.tags.filter(t => t !== tagToRemove));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const u = await User.me();
      if (!u) throw new Error("Debes iniciar sesión para publicar.");

      if (!category) {
        toast.error("Debes seleccionar una categoría");
        setSaving(false);
        return;
      }

      let imageUrl = imagePreview;
      if (imageFile) {
        try {
          const { url } = await uploadFile(imageFile, { isPublic: true });
          imageUrl = url;
        } catch (storageErr) {
          console.warn("Storage error, using fallback:", storageErr);
        }
      }

      

      if (editId) {
        // UPDATE MODE
        const { error: campError } = await supabase
          .from("campaigns")
          .update({
            title: form.title,
            description: form.description,
            instructions: form.description,
            category: category,
            reward_per_task: Number(form.reward_value),
            max_participants: Number(form.max_participants),
            deadline: form.deadline || null,
            reference_image_url: imageUrl,
            cta_text: form.cta_text,
            location: form.location,
            target_url: form.target_url,
            social_network: form.social_network,
            task_type: form.task_type,
            tags: form.tags,
            budget: Number(form.reward_value) * Number(form.max_participants),
          })
          .eq("id", editId);

        if (campError) throw campError;

        // Also update feed posts
        await supabase
          .from("feed_posts")
          .update({
            title: form.title,
            image_url: imageUrl,
            caption: form.description,
            cta_text: form.cta_text,
            category: category,
            tags: form.tags,
            reward: Number(form.reward_value),
            spots_total: Number(form.max_participants),
            deadline: form.deadline || null,
          })
          .eq("campaign_id", editId);

        // Update all available tasks for this campaign
        await supabase
          .from("tasks")
          .update({
            campaign_title: form.title,
            instructions: form.description,
            reward: Number(form.reward_value),
            social_network: form.social_network,
            task_type: form.task_type,
            reference_image_url: imageUrl,
          })
          .eq("campaign_id", editId)
          .eq("status", "available");

      } else {
        // CREATE MODE
        const campaign = await Campaign.create({
          title: form.title,
          description: form.description,
          instructions: form.description,
          category: category,
          reward_per_task: Number(form.reward_value),
          max_participants: Number(form.max_participants),
          deadline: form.deadline || null,
          reference_image_url: imageUrl,
          cta_text: form.cta_text,
          location: form.location,
          tags: form.tags,
          promoter_id: u.id,
          promoter_email: u.email,
          promoter_name: u.name || u.company_name || u.email,
          status: "active",
          current_participants: 0,
          approved_count: 0,
          rejected_count: 0,
          pending_count: 0,
          spent: 0,
          task_type: "custom",
          social_network: "taskbloom",
          budget: Number(form.reward_value) * Number(form.max_participants),
        });

        // Insert tasks directly
        const tasksToCreate = Array.from({ length: Math.min(form.max_participants, 50) }, () => ({
          campaign_id: campaign.id,
          campaign_title: form.title,
          social_network: "taskbloom",
          task_type: "custom",
          instructions: form.description,
          target_url: form.target_url,
          reference_image_url: imageUrl,
          reward: Number(form.reward_value),
          promoter_id: u.id,
          promoter_email: u.email,
          status: "available",
          time_limit_hours: 24,
        }));

        await supabase.from('tasks').insert(tasksToCreate);

        // Auto-publish to social feed
        await supabase.from('feed_posts').insert({
          campaign_id: campaign.id,
          task_id: null,
          author_id: u.id,
          author_name: u.name || u.company_name || u.email,
          title: form.title,
          image_url: imageUrl,
          caption: form.description,
          cta_text: form.cta_text || "¡Completa esta tarea!",
          category: category || "General",
          tags: form.tags || [],
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          views_count: 0,
          saves_count: 0,
          reward: Number(form.reward_value),
          reward_type: form.reward_type || "Dinero",
          task_type: "custom",
          social_network: "taskbloom",
          spots_total: Number(form.max_participants),
          spots_taken: 0,
          deadline: form.deadline || null,
          status: "active",
          is_promoted: true,
          is_from_campaign: true,
        });
      }

      setSaving(false);
      setTimeout(() => navigate(createPageUrl(editId ? "MyCampaigns" : "Feed")), 500);
    } catch (err) {
      console.error("Error saving campaign:", err);
      toast.error("Error: " + err.message);
      setSaving(false);
    }
  };

  const isFormValid = form.title.trim() !== "" && form.description.trim() !== "" && category !== "";

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-purple-500" />
              <h1 className="text-3xl font-black text-gray-900 dark:text-white">
                {editId ? "Editar Campaña" : "Publicar Nueva Tarea"}
              </h1>
            </div>
            <p className="text-gray-500 font-medium">
              {editId ? "Modifica los detalles de tu anuncio." : "Crea un anuncio atractivo para tu tarea."}
            </p>
          </div>
          <Link 
            to={createPageUrl(`CreateCampaign${editId ? `?id=${editId}` : ""}`)}
            className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <Users className="w-4 h-4 text-purple-500" /> Usar Asistente Guiado
          </Link>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Cargando datos...</p>
        </div>
      )}

      <div className={`flex flex-col lg:flex-row gap-8 ${loading ? "opacity-20 pointer-events-none blur-sm" : "transition-all duration-700"}`}>
        {/* Form Column */}
        <div className="flex-1 space-y-6">
          
          {/* A. Imagen de la Tarea */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="flex items-center gap-2 font-bold text-lg text-gray-800 dark:text-gray-100 mb-4">
              <ImageIcon className="w-5 h-5 text-purple-500" /> Imagen de la Tarea
            </h2>
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-center relative overflow-hidden group">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                  <div className="relative z-10">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="font-semibold text-gray-800 dark:text-gray-100">Imagen seleccionada</p>
                    <p className="text-xs text-gray-500 mt-1">Haz clic para cambiarla</p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Haz clic para subir imagen</p>
                  <p className="text-xs text-gray-400 mt-2">Soporta PNG, JPG hasta 10MB.</p>
                </>
              )}
              <input type="file" accept="image/png, image/jpeg" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageChange} />
            </div>
          </div>

          {/* B. Información Básica */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="flex items-center gap-2 font-bold text-lg text-gray-800 dark:text-gray-100 mb-4">
              <ClipboardList className="w-5 h-5 text-purple-500" /> Información Básica
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Título *</label>
                <input 
                  type="text" 
                  value={form.title} 
                  onChange={e => update("title", e.target.value)} 
                  placeholder="Ej: ¡Comparte nuestra promo en Instagram!"
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Red Social</label>
                  <select 
                    value={form.social_network} 
                    onChange={e => update("social_network", e.target.value)} 
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                  >
                    <option value="taskbloom">TaskBloom (Propia)</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="twitter">Twitter / X</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tipo de Tarea</label>
                  <select 
                    value={form.task_type} 
                    onChange={e => update("task_type", e.target.value)} 
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                  >
                    <option value="custom">Personalizada</option>
                    <option value="like">Like / Me gusta</option>
                    <option value="follow">Follow / Seguir</option>
                    <option value="comment">Comment / Comentar</option>
                    <option value="share">Share / Compartir</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Descripción *</label>
                <textarea 
                  value={form.description} 
                  onChange={e => update("description", e.target.value)} 
                  rows={4}
                  placeholder="Describe qué necesitas que hagan, cómo y los requisitos..."
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Enlace del Recurso (URL)</label>
                  {form.target_url && (
                    <a 
                      href={form.target_url.startsWith('http') ? form.target_url : `https://${form.target_url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-purple-500 hover:text-purple-400 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Probar enlace
                    </a>
                  )}
                </div>
                <div className="relative">
                  <ExternalLink className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                  <input 
                    type="url" 
                    value={form.target_url} 
                    onChange={e => update("target_url", e.target.value)} 
                    placeholder="https://instagram.com/p/..."
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Categoría *</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-sm transition-all ${
                        category === cat
                          ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-lg"
                          : "bg-white/10 text-gray-300 hover:bg-white/20"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* C. Recompensa */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="flex items-center gap-2 font-bold text-lg text-gray-800 dark:text-gray-100 mb-4">
              <DollarSign className="w-5 h-5 text-purple-500" /> Recompensa
            </h2>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Valor</label>
                <input 
                  type="number" 
                  min="0"
                  value={form.reward_value} 
                  onChange={e => update("reward_value", e.target.value)} 
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tipo</label>
                <div className="relative">
                  <select 
                    value={form.reward_type} 
                    onChange={e => update("reward_type", e.target.value)} 
                    className="w-full appearance-none bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                  >
                    {REWARD_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* D. Llamado a la Acción (CTA) */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="flex items-center gap-2 font-bold text-lg text-gray-800 dark:text-gray-100 mb-4">
              <Zap className="w-5 h-5 text-purple-500" /> Llamado a la acción (CTA) *
            </h2>
            <input 
              type="text" 
              value={form.cta_text} 
              onChange={e => update("cta_text", e.target.value)} 
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 mb-3" 
            />
            <div className="flex flex-wrap gap-2">
              {CTA_SUGGESTIONS.map(cta => (
                <button
                  key={cta}
                  onClick={() => update("cta_text", cta)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-colors"
                >
                  {cta}
                </button>
              ))}
            </div>
          </div>

          {/* E. Detalles Adicionales */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="flex items-center gap-2 font-bold text-lg text-gray-800 dark:text-gray-100 mb-4">
              <Calendar className="w-5 h-5 text-purple-500" /> Detalles adicionales
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Fecha límite</label>
                <input 
                  type="date" 
                  value={form.deadline} 
                  onChange={e => update("deadline", e.target.value)} 
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Máx. participantes</label>
                <input 
                  type="number" 
                  min="1"
                  value={form.max_participants} 
                  onChange={e => update("max_participants", e.target.value)} 
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <MapPin className="w-4 h-4" /> Ubicación
              </label>
              <input 
                type="text" 
                value={form.location} 
                onChange={e => update("location", e.target.value)} 
                placeholder="Ej: Remoto, Ciudad de México, Online..."
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
              />
            </div>
          </div>

          {/* F. Etiquetas (Tags) */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="flex items-center gap-2 font-bold text-lg text-gray-800 dark:text-gray-100 mb-4">
              <TagIcon className="w-5 h-5 text-purple-500" /> Etiquetas
            </h2>
            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                value={currentTag} 
                onChange={e => setCurrentTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="Añadir etiqueta..."
                className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
              />
              <button 
                onClick={addTag}
                className="px-6 py-3 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors"
              >
                Añadir
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview Column */}
        <div className="lg:w-80 flex-shrink-0 relative">
          <div className="sticky top-6">
            <h3 className="font-bold text-gray-500 mb-4 tracking-wide uppercase text-xs flex items-center gap-2">
              <Eye className="w-4 h-4" /> Vista Previa
            </h3>
            
            {/* The Preview Card */}
            <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
              <div className="h-40 bg-gradient-to-br from-purple-600 to-pink-500 relative flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview Background" />
                ) : (
                  <ClipboardList className="w-16 h-16 text-white/40 absolute" />
                )}
                {category && (
                  <span className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md">
                    {category}
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
              </div>
              
              <div className="p-5 relative -mt-4 z-10">
                <h4 className="font-bold text-lg text-white leading-tight mb-2">
                  {form.title || "Tu título aparecerá aquí"}
                </h4>
                <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                  {form.description || "La descripción de tu tarea será visible para los usuarios en este espacio."}
                </p>
                
                <div className="flex gap-2 flex-wrap mb-4">
                  {form.reward_value > 0 && (
                    <span className="bg-yellow-400/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded">
                      +{form.reward_value} {form.reward_type}
                    </span>
                  )}
                  {form.location && (
                    <span className="bg-gray-800 text-gray-300 text-xs font-medium px-2 py-1 rounded">
                      {form.location}
                    </span>
                  )}
                </div>

                <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-bold flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  {form.cta_text || "¡Acepta el reto!"}
                </div>
              </div>
            </div>
            
            {/* Sticky Action Button inside the column for desktop, fixed at bottom for mobile */}
            <div className="mt-8 flex justify-center">
               <button 
                  onClick={handleSave} 
                  disabled={!isFormValid || saving}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed text-lg"
                >
                  {saving ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Zap className="w-6 h-6" />
                  )}
                  {saving ? (editId ? "Guardando..." : "Publicando...") : (editId ? "Guardar Cambios" : "Publicar Tarea")}
                </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Sticky Button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 z-50">
        <button 
          onClick={handleSave} 
          disabled={!isFormValid || saving}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all disabled:opacity-50 text-lg"
        >
          {saving ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Zap className="w-6 h-6" />}
          {saving ? (editId ? "Guardando..." : "Publicando...") : (editId ? "Guardar Cambios" : "Publicar Tarea")}
        </button>
      </div>
    </div>
  );
}

