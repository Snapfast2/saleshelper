// src/app/template.tsx
// Transición ligera por GPU (opacidad + translate3d) sin blur pesado en móvil

export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
