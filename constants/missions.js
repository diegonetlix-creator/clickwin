import { Clock, Heart, MessageCircle, Share2 } from "lucide-react";

export const MISSION_TEMPLATES = [
  {
    id: "madrugador",
    title: "El Madrugador",
    description: "Completa 5 tareas antes de las 10:00 AM",
    reward: 500,
    total: 5,
    icon: Clock,
    color: "from-orange-400 to-yellow-500",
  },
  {
    id: "rey_like",
    title: "Rey del Like",
    description: "Da 20 likes en publicaciones sociales",
    reward: 300,
    total: 20,
    icon: Heart,
    color: "from-pink-500 to-rose-600",
  },
  {
    id: "socializador",
    title: "Socializador",
    description: "Deja 10 comentarios positivos en redes",
    reward: 450,
    total: 10,
    icon: MessageCircle,
    color: "from-cyan-400 to-blue-500",
  },
  {
    id: "embajador",
    title: "Embajador ClickWin",
    description: "Comparte 3 campañas en tus historias",
    reward: 600,
    total: 3,
    icon: Share2,
    color: "from-purple-500 to-indigo-600",
  }
];
