import { RefreshCw } from "lucide-react";

interface Props {
  text?: string;
}

export default function LoadingState({ text = "Cargando..." }: Props) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
      <RefreshCw size={32} className="spinner-icon" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
      <p style={{ animation: "pulse 2s infinite" }}>{text}</p>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .spinner-icon { animation: spin 1s linear infinite; }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 0.8; } 100% { opacity: 0.5; } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
