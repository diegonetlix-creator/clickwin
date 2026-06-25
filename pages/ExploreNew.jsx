import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, Zap } from "lucide-react";
import StoryBar from "../components/StoryBar";
import TaskCard from "../components/TaskCard";
import BalanceHeader from "../components/BalanceHeader";
import RewardCard from "../components/RewardCard";
import { supabase } from "@/supabase";
import { toast } from "@/components/Toast";
import "../styles/theme-dark-pro.css";
import "../styles/explore.css";
import "../styles/glass.css";

export default function ExploreNew() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState({
    points: 1350,
    streak: 7,
    rank: 12
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "active");

      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      console.error("Error cargando campañas:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="explore-page explore-dark-glass pb-20">
      {/* TOPBAR */}
      <header className="topbar">
        <div className="topbar-inner">
          <Menu className="icon-btn" size={20} />
          <h1 className="brand">Click<span>Win</span></h1>
          
          <div className="search-bar-container">
            <Search size={16} className="search-icon" />
            <input 
              placeholder="Buscar campañas, marcas..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="topbar-right">
            <div className="notif-badge">
              <Bell size={20} />
              <span className="dot">3</span>
            </div>
            <div className="user-pill-mini">
              <img src="https://i.pravatar.cc/150?u=antigravity" alt="user" loading="lazy" className="w-8 h-8 rounded-full border border-white/20" />
            </div>
          </div>
        </div>
      </header>

      <div className="explore-content page-content-mobile-fix">
        {/* BALANCE HEADER */}
        <div className="px-4 mb-8">
            <BalanceHeader user={user} />
        </div>

        {/* STORIES */}
        <div className="stories-section">
          <StoryBar campaigns={campaigns.slice(0, 8)} />
        </div>

        {/* FLASH DEAL (RewardCard variant) */}
        <div className="px-4 mb-8">
            <RewardCard 
                reward={{
                    title: "Flash Deal: ¡Duplica puntos!",
                    description: "Activa ahora y gana el doble en todas tus tareas por 24h.",
                    cost: 250
                }}
                onClick={() => toast.info("Boost activado")}
            />
        </div>

        {/* CAMPAIGN GRID (Marketplace Style) */}
        <div className="px-4">
            <div className="section-header-compact mb-4 flex justify-between items-center">
                <h2 className="text-white font-black text-sm uppercase tracking-widest">Campañas destacadas</h2>
                <button className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Ver todas</button>
            </div>
            
            <div className="explore-grid-marketplace">
                {filteredCampaigns.map((c, i) => (
                    <TaskCard 
                        key={c.id} 
                        task={c} 
                        onAction={(task) => navigate(`/campaign/${task.id}`)}
                    />
                ))}
            </div>
        </div>

        {/* EXTRA REWARDS SECTION */}
        <div className="px-4 mt-12 mb-8">
             <div className="section-header-compact mb-4 flex justify-between items-center">
                <h2 className="text-white font-black text-sm uppercase tracking-widest">Premios exclusivos</h2>
                <button className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Ver más</button>
            </div>
            <div className="grid grid-cols-1 gap-4">
                 <RewardCard 
                    reward={{
                        title: "Tarjeta Amazon $10",
                        description: "Canjea tus puntos por saldo real en Amazon.",
                        cost: 1000
                    }}
                    onClick={() => toast.info("Canjeando...")}
                />
            </div>
        </div>
      </div>
    </div>
  );
}
