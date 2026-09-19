import React from "react";
import {
  SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import type { Summary } from "../apiClient";

const SECTIONS = [
  { key: "overview", icon: "📊", title: "Overview", desc: "KPI summary, practice composition, aging snapshot, status breakdown.", pills: ["KPIs", "Charts"] },
  { key: "aging", icon: "⏳", title: "Aging Analysis", desc: "Breakdown of bench duration by practice and bucket.", pills: ["Critical Alerts", "Heatmap"] },
  { key: "skills", icon: "🧠", title: "Skills on Bench", desc: "Skill distribution, seniority matrix, and availability cards.", pills: ["Top Skills", "Chips"] },
  { key: "pipeline", icon: "🎯", title: "IFB Pipeline", desc: "Resources in active interview and deployment pipeline.", pills: ["IFB-Selected", "Reserved"] },
  { key: "register", icon: "📋", title: "Bench Register", desc: "Searchable roster of all bench resources with Excel download.", pills: ["Live Search", "Export"] },
  { key: "location", icon: "📍", title: "Location & Experience", desc: "Geographic spread, experience buckets, and designation mix.", pills: ["7 Locations", "Experience"] },
];

type Props = {
  summary: Summary | null;
  onOpen: (tab: string) => void;
};

export function LandingScreen({ summary, onOpen }: Props) {
  const stats = summary
    ? [
        { value: String(summary.total), label: "On Bench", color: "#172033" },
        { value: String(summary.deployable), label: "Deployable", color: "#2563eb" },
        { value: String(summary.ifb_pipeline), label: "IFB Pipeline", color: "#7c3aed" },
        { value: String(summary.critical_91_plus), label: "Critical Aged", color: "#d14343" },
      ]
    : [];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Nav */}
        <View style={styles.nav} accessibilityRole="header">
          <View style={styles.navLeft}>
            <Text style={styles.logo}>BMD</Text>
            <View style={styles.logoDot} />
            <Text style={styles.navTitle}>Bench Dashboard</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.badge} accessibilityLabel="Data and AI Practice, Internal Tool">
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>DATA & AI PRACTICE · INTERNAL TOOL</Text>
          </View>

          <Text style={styles.heading}>
            Bench data that{"\n"}Sales and Delivery{"\n"}
            <Text style={styles.headingItalic}>both trust.</Text>
          </Text>

          <Text style={styles.sub}>
            Stop guessing who's available. A live, role-aware view of every resource
            — with skill drill-down, aging alerts, and full accountability.
          </Text>

          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={() => onOpen("overview")}
            accessibilityLabel="Launch Dashboard"
            accessibilityRole="button"
          >
            <Text style={styles.ctaPrimaryText}>Launch Dashboard →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ctaSecondary}
            onPress={() => onOpen("overview")}
            accessibilityLabel="Explore dashboard sections"
            accessibilityRole="button"
          >
            <Text style={styles.ctaSecondaryText}>Explore Sections ↓</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {stats.length > 0 && (
          <View style={styles.statsRow} accessibilityLabel={`Summary: ${stats.map((s) => `${s.label} ${s.value}`).join(", ")}`}>
            {stats.map((s) => (
              <View style={styles.statItem} key={s.label}>
                <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Section Cards */}
        <View style={styles.cardsWrap}>
          <Text style={styles.cardsHead}>Explore Dashboard Sections</Text>
          {SECTIONS.map((s) => (
            <TouchableOpacity
              style={styles.card}
              key={s.key}
              onPress={() => onOpen(s.key)}
              activeOpacity={0.7}
              accessibilityLabel={`${s.title}: ${s.desc}`}
              accessibilityRole="button"
            >
              <Text style={styles.cardArrow}>→</Text>
              <Text style={styles.cardIcon}>{s.icon}</Text>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardDesc}>{s.desc}</Text>
              <View style={styles.cardPills}>
                {s.pills.map((p) => (
                  <View style={styles.pill} key={p}>
                    <Text style={styles.pillText}>{p}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bench Management Dashboard · Data & AI Practice</Text>
          <Text style={styles.footerText}>Source: Bench Data from RMG</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8eaf6" },
  scroll: { paddingBottom: 40 },

  // Nav
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(26,58,110,.08)" },
  navLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { fontSize: 15, fontWeight: "900", color: "#0f2759" },
  logoDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#e36120" },
  navTitle: { fontSize: 12, color: "#4a6080", fontWeight: "500" },

  // Hero
  hero: { alignItems: "center", paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
  badge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,.7)", borderWidth: 1, borderColor: "rgba(26,58,110,.12)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 28 },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#e36120" },
  badgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8, color: "#2a4a88" },
  heading: { fontSize: 30, fontWeight: "900", color: "#0d1d45", textAlign: "center", lineHeight: 36, marginBottom: 16 },
  headingItalic: { color: "#2563eb", fontStyle: "italic" },
  sub: { fontSize: 14, color: "#4a6080", textAlign: "center", lineHeight: 22, marginBottom: 28, paddingHorizontal: 8 },
  ctaPrimary: { backgroundColor: "#1B3A8A", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 10, marginBottom: 12, shadowColor: "#1B3A8A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  ctaPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  ctaSecondary: { backgroundColor: "rgba(255,255,255,.75)", borderWidth: 1.5, borderColor: "rgba(26,58,110,.15)", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  ctaSecondaryText: { color: "#1a3a6e", fontSize: 14, fontWeight: "600" },

  // Stats
  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,.6)", borderWidth: 1, borderColor: "rgba(26,58,110,.1)", borderRadius: 14, marginHorizontal: 20, marginBottom: 28, overflow: "hidden" },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 16, borderRightWidth: 1, borderRightColor: "rgba(26,58,110,.08)" },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 9, color: "#6a80a0", marginTop: 3, fontWeight: "500" },

  // Cards
  cardsWrap: { paddingHorizontal: 20 },
  cardsHead: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", color: "#4a6080", marginBottom: 14 },
  card: { backgroundColor: "rgba(255,255,255,.72)", borderWidth: 1, borderColor: "rgba(26,58,110,.09)", borderRadius: 14, padding: 18, marginBottom: 12, shadowColor: "#1a3a6e", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardArrow: { position: "absolute", top: 16, right: 16, fontSize: 16, color: "#b0bdd0" },
  cardIcon: { fontSize: 22, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0d1d45", marginBottom: 6 },
  cardDesc: { fontSize: 12, color: "#5a7090", lineHeight: 18, marginBottom: 10 },
  cardPills: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  pill: { backgroundColor: "#e0e7ff", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 10, fontWeight: "700", color: "#3730a3" },

  // Footer
  footer: { paddingHorizontal: 20, paddingTop: 28, alignItems: "center" },
  footerText: { fontSize: 11, color: "#6a80a0", marginBottom: 4 },
});
