"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState, useEffect } from "react";
import { isAdminLoggedIn } from "@/lib/adminApi";

const navLinks = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/resources", label: "Resources", icon: "📦" },
  { href: "/admin/import", label: "Import / Export", icon: "📥" },
  { href: "/admin/users", label: "Users", icon: "👥" },
];

const sidebarStyle = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  width: 240,
  height: "100vh",
  background: "#e8eaf6",
  boxShadow: "6px 0 16px #b0b8d8",
  display: "flex",
  flexDirection: "column" as const,
  zIndex: 200,
  transition: "transform .28s ease",
};

const overlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,.35)",
  zIndex: 199,
  display: "none",
};

const headerStyle = {
  padding: "20px 20px 16px",
  borderBottom: "1px solid rgba(163,177,198,.25)",
};

const logoStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const logoIconStyle = {
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "#6366f1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  color: "#fff",
  boxShadow: "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
};

const navContainerStyle = {
  flex: 1,
  padding: "16px 12px",
  overflowY: "auto" as const,
};

const linkBaseStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  color: "#a0aec0",
  textDecoration: "none",
  marginBottom: 4,
  transition: "all .18s",
  background: "transparent",
  border: "none",
  width: "100%",
  cursor: "pointer" as const,
};

const linkActiveStyle = {
  ...linkBaseStyle,
  color: "#6366f1",
  background: "rgba(99,102,241,.08)",
  boxShadow: "inset 3px 3px 8px #b0b8d8, inset -3px -3px 8px #ffffff",
};

const logoutBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  color: "#e97b8a",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  width: "100%",
  marginBottom: 4,
  transition: "all .18s",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setAuthorized(true);
      return;
    }
    if (isAdminLoggedIn()) {
      setAuthorized(true);
    } else {
      router.push("/admin/login");
    }
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!authorized) return null;

  function handleLogout() {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 300,
          width: 40,
          height: 40,
          borderRadius: 10,
          border: "none",
          background: "#e8eaf6",
          boxShadow: "3px 3px 8px #b0b8d8, -3px -3px 8px #ffffff",
          display: "none",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          cursor: "pointer",
        }}
        className="admin-hamburger"
      >
        ☰
      </button>

      {/* Sidebar */}
      <aside
        className={`admin-sidebar${sidebarOpen ? " open" : ""}`}
        style={sidebarStyle}
      >
        <div style={headerStyle}>
          <div style={logoStyle}>
            <div style={logoIconStyle}>⚙</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Admin Panel</div>
              <div style={{ fontSize: 10, color: "#a0aec0" }}>Management Console</div>
            </div>
          </div>
        </div>

        <nav style={navContainerStyle}>
          {navLinks.map((link) => {
            const isActive =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={isActive ? linkActiveStyle : linkBaseStyle}
                onClick={() => setSidebarOpen(false)}
              >
                <span style={{ fontSize: 16 }}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "12px", borderTop: "1px solid rgba(163,177,198,.25)" }}>
          <Link
            href="/"
            style={{
              ...linkBaseStyle,
              color: "#5c6bc0",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 16 }}>🏠</span>
            Back to App
          </Link>
          <button onClick={handleLogout} style={logoutBtnStyle}>
            <span style={{ fontSize: 16 }}>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      <div
        style={sidebarOpen ? { ...overlayStyle, display: "block" } : overlayStyle}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main
        style={{
          minHeight: "100vh",
          padding: 12,
        }}
        className="admin-main"
      >
        {/* Top bar */}
        <header
          className="neo admin-topbar"
          style={{
            padding: "12px 20px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>
              Admin Panel
            </h1>
            <p style={{ fontSize: 11, color: "#a0aec0" }}>
              Bench Management · Administrative Console
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                color: "#6366f1",
                background: "#e8eaf6",
                boxShadow: "2px 2px 6px #b0b8d8, -2px -2px 6px #ffffff",
              }}
            >
              👤 Admin
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                color: "#e97b8a",
                background: "#e8eaf6",
                border: "none",
                cursor: "pointer",
                boxShadow: "2px 2px 6px #b0b8d8, -2px -2px 6px #ffffff",
              }}
            >
              🚪 Logout
            </button>
          </div>
        </header>

        <div className="dash-content">{children}</div>
      </main>

      {/* Responsive CSS */}
      <style jsx global>{`
        .admin-hamburger {
          display: none !important;
        }
        .admin-sidebar {
          transform: translateX(0) !important;
        }
        .admin-main {
          margin-left: 240px !important;
          width: calc(100% - 240px) !important;
          box-sizing: border-box;
        }
        .admin-topbar {
          padding: 12px 20px !important;
        }
        .admin-topbar h1 {
          font-size: 18px;
        }
        @media (max-width: 768px) {
          .admin-hamburger {
            display: flex !important;
          }
          .admin-sidebar {
            transform: translateX(-100%) !important;
          }
          .admin-sidebar.open {
            transform: translateX(0) !important;
          }
          .admin-main {
            margin-left: 0 !important;
            width: 100% !important;
            padding-top: 56px !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          .admin-topbar {
            padding: 10px 12px !important;
            margin-bottom: 12px !important;
          }
          .admin-topbar h1 {
            font-size: 15px !important;
            margin-left: 40px !important;
          }
          .admin-topbar p {
            display: none !important;
          }
          .neo {
            border-radius: 14px !important;
          }
          .admin-modal {
            padding: 20px 16px !important;
            border-radius: 16px !important;
            margin: 0 8px !important;
          }
        }
        @media (max-width: 480px) {
          .admin-topbar h1 {
            font-size: 14px !important;
          }
        }
      `}</style>
    </>
  );
}
