import Link from "next/link";
import { getSummary } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let summary;
  try {
    summary = await getSummary();
  } catch {
    summary = null;
  }

  const stats = summary
    ? [
        { value: summary.total, label: "On Bench" },
        { value: summary.deployable, label: "Deployable", color: "#2563eb" },
        { value: summary.ifb_pipeline, label: "In IFB Pipeline", color: "#7c3aed" },
        { value: summary.critical_91_plus, label: "Critical Aged (91+ days)", color: "#d14343" },
        { value: Object.keys(summary.by_department).length, label: "Skill Domains", color: "#1f9d6a" },
      ]
    : [];

  const sections = [
    { href: "/dashboard/overview", icon: "📊", title: "Overview", desc: "KPI summary, practice composition, aging snapshot, status breakdown, and source-wise resource flow.", pills: [`${summary?.total ?? 0} Resources`, `${summary?.total ? Math.round((summary.deployable / summary.total) * 100) : 0}% Deployable`] },
    { href: "/dashboard/aging", icon: "⏳", title: "Aging Analysis", desc: "Breakdown of bench duration by practice and bucket. Flag critical-aged resources requiring immediate action.", pills: [`${summary?.critical_91_plus ?? 0} Critical (91+d)`, "21 Watch (61–90d)"] },
    { href: "/dashboard/skills", icon: "🧠", title: "Skills on Bench", desc: "Skill distribution, seniority matrix, and quick availability cards. Click any skill to download a resource Excel.", pills: ["68 Big Data", "38 Data Science"] },
    { href: "/dashboard/pipeline", icon: "🎯", title: "IFB Pipeline", desc: "Resources in active interview and deployment pipeline — IFB-Selected, IFB-Reserved, and Pipeline Planned.", pills: ["27 IFB-Selected", "10 IFB-Reserved"] },
    { href: "/dashboard/register", icon: "📋", title: "Bench Register", desc: "Searchable, filterable roster of all bench resources with real-time filter chips and Excel download.", pills: ["Live Search", "Download Excel"] },
    { href: "/dashboard/location", icon: "📍", title: "Location & Experience", desc: "Geographic spread across cities, experience buckets, and designation-level distribution for staffing planning.", pills: ["7 Locations", `${summary?.by_age_bucket ? Object.keys(summary.by_age_bucket).length : 0} Age Buckets`] },
  ];

  return (
    <div className="landing-screen">
      <nav className="ln-nav">
        <div className="ln-logo">
          <strong>BMD</strong>
          <span className="ln-logo-sep" />
          <span className="ln-logo-title">Bench Management Dashboard</span>
        </div>
        <Link href="/dashboard/overview" className="ln-open-btn">
          Open App →
        </Link>
      </nav>

      <section className="ln-hero">
        <div className="ln-badge">
          <span className="ln-badge-dot" />
          DATA &amp; AI PRACTICE · INTERNAL TOOL
        </div>

        <h1 className="ln-heading">
          Bench data that Sales<br />
          <em>and Delivery both trust.</em>
        </h1>

        <p className="ln-sub">
          Stop guessing who&apos;s available. A live, role-aware view of every resource —
          from fresh joiner to billable — with skill drill-down, aging alerts, and
          full accountability at every stage.
        </p>

        <div className="ln-btns">
          <Link href="/dashboard/overview" className="ln-cta-primary">
            Launch Dashboard
          </Link>
          <a href="#sections" className="ln-cta-secondary">
            See what&apos;s inside ↓
          </a>
        </div>

        {stats.length > 0 && (
          <div className="ln-stats">
            {stats.map((s) => (
              <div className="ln-stat" key={s.label}>
                <div className="ln-stat-num" style={s.color ? { color: s.color } : undefined}>
                  {s.value}
                </div>
                <div className="ln-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="ln-cards-wrap" id="sections">
        <div className="ln-cards-head">Explore Dashboard Sections</div>
        <div className="ln-cards">
          {sections.map((s) => (
            <Link href={s.href} className="ln-card" key={s.href}>
              <span className="ln-card-arrow">→</span>
              <div className="ln-card-icon">{s.icon}</div>
              <div className="ln-card-title">{s.title}</div>
              <div className="ln-card-desc">{s.desc}</div>
              <div className="ln-card-pills">
                {s.pills.map((p) => (
                  <span className="ln-pill" key={p}>{p}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
