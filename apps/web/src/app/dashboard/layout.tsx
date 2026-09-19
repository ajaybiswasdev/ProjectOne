"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const tabs = [
  { href: "/dashboard/overview", label: "Overview", icon: "📊" },
  { href: "/dashboard/aging", label: "Aging Analysis", icon: "⏱" },
  { href: "/dashboard/skills", label: "Skills on Bench", icon: "🧠" },
  { href: "/dashboard/pipeline", label: "IFB Pipeline", icon: "🎯" },
  { href: "/dashboard/register", label: "Bench Register", icon: "📋" },
  { href: "/dashboard/location", label: "Location & Exp", icon: "📍" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <header className="neo dash-header mb-28">
        <div>
          <h1>Bench Management Dashboard</h1>
          <p>Data &amp; AI Practice · Bench Report as of 1 Sep 2026</p>
        </div>
        <div className="header-right">
          <div className="live-badge neo-sm">
            <span className="live-dot" /> Live
          </div>
          <div className="date-chip neo-sm">📅 1 Sep 2026</div>
        </div>
      </header>

      <div className="neo tab-nav-wrap">
        <nav className="tab-nav">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`tab-nav-btn ${active ? "active" : ""}`}
              >
                {tab.icon} {tab.label}
              </Link>
            );
          })}
          <Link href="/" className="home-btn">
            🏠 Home
          </Link>
        </nav>
      </div>

      <div className="dash-content">
        {children}
      </div>

      <div className="neo footer-bar">
        <span>🏖️ Bench Management Dashboard · Data &amp; AI Practice</span>
        <span>Source: Bench Data from RMG · Live data</span>
      </div>
    </>
  );
}
