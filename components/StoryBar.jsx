import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

export default function StoryBar({ campaigns = [] }) {
  const navigate = useNavigate();

  return (
    <div className="storybar">
      {/* Ver Todas Button */}
      <div className="story-item" onClick={() => navigate("/tasks")}>
        <div className="story-ring flex items-center justify-center bg-gray-900">
          <div className="w-[60px] h-[60px] rounded-full border-2 border-[#020617] bg-gray-900 flex items-center justify-center">
            <Plus size={24} className="text-white" />
          </div>
        </div>
        <span>Ver todas</span>
      </div>

      {campaigns?.map((c) => (
        <div
          key={c.id}
          className="story-item"
          onClick={() => navigate(`/campaign/${c.id}`)}
        >
          <div className="story-ring">
            <img 
              src={c.image_url || c.reference_image_url || `/${(Math.floor(Math.random() * 11)) + 1} red social.jpg`} 
              alt={c.title || c.name} 
              onError={(e) => {
                e.target.src = "/logo192.png"; // Fallback
              }}
            />
          </div>
          <span>{c.title || c.name}</span>
        </div>
      ))}
    </div>
  );
}
