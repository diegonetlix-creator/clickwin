import "@/styles/glass.css";

export default function CardWrapper({ children, className = "" }) {
  return (
    <div className={`glass transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.05] ${className}`}>
      {children}
    </div>
  );
}
