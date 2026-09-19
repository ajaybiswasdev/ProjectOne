type KpiCardProps = {
  label: string;
  value: string | number;
  tone?: "blue" | "green" | "red" | "purple" | "orange" | "default";
  sub?: string;
};

export function KpiCard({ label, value, tone = "blue", sub }: KpiCardProps) {
  return (
    <section className={`kpi-card tone-${tone}`} aria-label={`${label}: ${value}`}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </section>
  );
}
