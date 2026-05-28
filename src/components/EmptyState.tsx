interface Props {
  icon?: React.ReactNode;
  title: string;
  description: string;
}

export default function EmptyState({ icon, title, description }: Props) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
      {icon && <div style={{ margin: "0 auto 1rem", opacity: 0.5, display: "flex", justifyContent: "center" }}>{icon}</div>}
      <h3 style={{ marginBottom: "0.5rem", color: "var(--text-primary)" }}>{title}</h3>
      <p style={{ fontSize: "0.9rem" }}>{description}</p>
    </div>
  );
}
