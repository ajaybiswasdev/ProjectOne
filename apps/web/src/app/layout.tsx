import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bench Management Dashboard | Data & AI Practice",
  description:
    "Live bench resource planning dashboard — skill drill-down, aging alerts, pipeline tracking, and full accountability for every resource.",
  keywords: ["bench management", "resource planning", "workforce dashboard", "IFB pipeline"],
  authors: [{ name: "Data & AI Practice" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#e8eaf6",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ErrorBoundary>
          <main id="main-content">{children}</main>
        </ErrorBoundary>
      </body>
    </html>
  );
}
