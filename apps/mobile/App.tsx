import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";

import { BenchApiClient, type Resource, type Summary, type SkillCount, type AgingBucketSummary, type AgingDepartmentRow, type PipelineSummary, type LocationCount, type ExperienceBucket, type DesignationCount, ApiError } from "./src/apiClient";
import { API_BASE_URL, APP_CONFIG } from "./src/config";

import { LandingScreen } from "./src/screens/LandingScreen";
import OverviewScreen from "./src/screens/OverviewScreen";
import AgingScreen from "./src/screens/AgingScreen";
import SkillsScreen from "./src/screens/SkillsScreen";
import PipelineScreen from "./src/screens/PipelineScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LocationScreen from "./src/screens/LocationScreen";

const TABS = [
  { key: "overview", label: "📊 Overview", a11yLabel: "Overview dashboard" },
  { key: "aging", label: "⏱ Aging", a11yLabel: "Aging analysis" },
  { key: "skills", label: "🧠 Skills", a11yLabel: "Skills on bench" },
  { key: "pipeline", label: "🎯 Pipeline", a11yLabel: "IFB pipeline" },
  { key: "register", label: "📋 Register", a11yLabel: "Bench register" },
  { key: "location", label: "📍 Location", a11yLabel: "Location and experience" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_TITLES: Record<TabKey, string> = {
  overview: "Bench Overview",
  aging: "Aging Analysis",
  skills: "Skills on Bench",
  pipeline: "IFB Pipeline",
  register: "Bench Register",
  location: "Location & Experience",
};

const TAB_SUBTITLES: Record<TabKey, string> = {
  overview: "Headcount, aging & status at a glance",
  aging: "Duration-based resource aging breakdown",
  skills: "Skill distribution & top primary skills",
  pipeline: "IFB shortlist & pipeline tracking",
  register: "Searchable resource-level register",
  location: "Office, experience & designation mix",
};

export default function App() {
  const api = useMemo(() => new BenchApiClient(API_BASE_URL), []);
  const [screen, setScreen] = useState<"landing" | "dashboard">("landing");
  const [tab, setTab] = useState<TabKey>("overview");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        api.getSummary(),
        api.getResources(),
      ]);
      setSummary(s);
      setResources(r);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Server error (${err.status}). Please try again.`);
      } else if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. Check your connection.");
      } else {
        setError("Unable to load dashboard data. Check if the API server is running.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const openTab = (key: string) => {
    setTab(key as TabKey);
    setScreen("dashboard");
  };

  if (error && !loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData} accessibilityLabel="Retry loading data">
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#5c6bc0" />
        <Text style={styles.loadingText}>Loading {APP_CONFIG.name}…</Text>
      </SafeAreaView>
    );
  }

  if (screen === "landing") {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <LandingScreen summary={summary} onOpen={openTab} />
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.dashHeader} accessibilityRole="header">
        <View style={{ flex: 1 }}>
          <Text style={styles.dashTitle}>Bench Management Dashboard</Text>
          <Text style={styles.dashSub}>Data & AI Practice · Bench Report</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
          <View style={styles.dateChip}>
            <Text style={styles.dateChipText}>📅 1 Sep 2026</Text>
          </View>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => setScreen("landing")}
            accessibilityLabel="Go to home screen"
            accessibilityRole="button"
          >
            <Text style={styles.homeBtnText}>🏠 Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        accessibilityRole="tablist"
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
            accessibilityLabel={t.a11yLabel}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.tabInfoBar}>
        <Text style={styles.tabInfoTitle}>{TAB_TITLES[tab]}</Text>
        <Text style={styles.tabInfoSubtitle}>{TAB_SUBTITLES[tab]}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === "overview" && <OverviewScreen />}
        {tab === "aging" && <AgingScreen />}
        {tab === "skills" && <SkillsScreen />}
        {tab === "pipeline" && <PipelineScreen />}
        {tab === "register" && <RegisterScreen />}
        {tab === "location" && <LocationScreen />}
      </ScrollView>

      <View style={styles.footerBar}>
        <Text style={styles.footerText}>🏖️ Bench Management Dashboard</Text>
        <Text style={styles.footerSub}>Source: Bench Data from RMG · Live data</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#e8eaf6" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#e8eaf6", padding: 24 },
  loadingText: { marginTop: 12, color: "#718096", fontSize: 14 },

  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: "800", color: "#172033", marginBottom: 8 },
  errorText: { fontSize: 13, color: "#718096", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  retryBtn: { backgroundColor: "#1B3A8A", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  dashHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#e8eaf6",
    shadowColor: "#b0b8d8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  dashTitle: { color: "#172033", fontSize: 17, fontWeight: "800" },
  dashSub: { color: "#718096", fontSize: 11, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#dcfce7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22c55e", marginRight: 5 },
  liveText: { fontSize: 11, fontWeight: "700", color: "#16a34a" },
  dateChip: { backgroundColor: "#d5dae5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dateChipText: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  homeBtn: { backgroundColor: "rgba(197,184,240,.22)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, shadowColor: "#b0b8d8", shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 2 },
  homeBtnText: { fontSize: 11, fontWeight: "700", color: "#5c6bc0" },

  tabBar: { maxHeight: 42, paddingHorizontal: 12, marginBottom: 0, marginTop: 4 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginRight: 5, backgroundColor: "#e8eaf6", shadowColor: "#b0b8d8", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 3 },
  tabActive: { backgroundColor: "rgba(197,184,240,.22)", shadowColor: "#b0b8d8", shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 11, fontWeight: "600", color: "#7a8a9e" },
  tabTextActive: { color: "#5c6bc0", fontWeight: "700" },

  tabInfoBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#e0e3ed",
    borderBottomWidth: 1,
    borderBottomColor: "#d5dae5",
  },
  tabInfoTitle: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  tabInfoSubtitle: { fontSize: 10, color: "#78849e", marginTop: 1 },

  content: { flex: 1 },
  contentContainer: { paddingBottom: 20 },

  footerBar: {
    backgroundColor: "#e0e3ed",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#d5dae5",
    shadowColor: "#b0b8d8",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  footerText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  footerSub: { fontSize: 10, color: "#a0aec0", marginTop: 2 },
});
