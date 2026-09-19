import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { API_BASE_URL } from '../config';

interface Resource {
  id: number;
  employee_id: string;
  name: string;
  level: string;
  skill: string;
  department: string;
  location: string;
  days_on_bench: number;
  age_bucket: string;
  deployable: string;
  rmg_status: string;
  status: string;
  experience_bucket: string;
  hrbp: string;
  leader: string;
}

interface Summary {
  total: number;
  available: number;
  deployable: number;
  non_deployable: number;
  ifb_pipeline: number;
  critical_91_plus: number;
  average_days_on_bench: number;
  by_department: Record<string, number>;
  by_age_bucket: Record<string, number>;
  by_location: Record<string, number>;
}

const DEPT_COLORS: Record<string, string> = {
  'Cloud & Infrastructure': '#6366f1',
  'Data & AI': '#8b5cf6',
  'Digital': '#a855f7',
  'Enterprise Apps': '#d946ef',
  'GenAI & AI Services': '#ec4899',
  'Quality': '#f43f5e',
  'SAP': '#f97316',
  'Vodafone': '#ef4444',
};

const AGE_LABELS = ['0-15 Days', '16-30 Days', '31-45 Days', '46-60 Days', '61-90 Days', '91+ days'];
const AGE_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#eab308', '#f97316', '#ef4444'];

export default function OverviewScreen() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [summaryRes, resourcesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/summary`),
        fetch(`${API_BASE_URL}/api/v1/resources`),
      ]);
      const [summaryData, resourcesData] = await Promise.all([
        summaryRes.json(),
        resourcesRes.json(),
      ]);
      setSummary(summaryData);
      setResources(resourcesData);
    } catch (e) {
      console.error('Failed to fetch overview data:', e);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (!summary) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const availableOpen = Array.isArray(resources) ? resources.filter((r: Resource) => r.status === 'available').length : 0;
  const upskillingCount = Array.isArray(resources) ? resources.filter((r: Resource) => r.rmg_status === 'Available-Upskilling').length : 0;
  const proposedCount = Array.isArray(resources) ? resources.filter((r: Resource) => r.rmg_status === 'Proposed').length : 0;
  const deployablePct = summary.total > 0 ? Math.round((summary.deployable / summary.total) * 100) : 0;
  const nonDeployablePct = summary.total > 0 ? Math.round((summary.non_deployable / summary.total) * 100) : 0;
  const availablePct = summary.total > 0 ? Math.round((availableOpen / summary.total) * 100) : 0;

  const kpis = [
    { icon: '🏖️', label: 'Total on Bench', value: summary.total, desc: 'Current date', bg: '#e8eaf6' },
    { icon: '⏱', label: 'Avg Days on Bench', value: summary.average_days_on_bench, desc: '% of bench', bg: '#e8f5e9' },
    { icon: '✅', label: 'Deployable', value: summary.deployable, desc: `${deployablePct}% of bench`, bg: '#e0f2f1' },
    { icon: '🚨', label: 'Critical Aged (91+)', value: summary.critical_91_plus, desc: '>91 days — Act now', bg: '#fce4ec' },
    { icon: '🎯', label: 'IFB Pipeline', value: summary.ifb_pipeline, desc: 'In deployment pipeline', bg: '#fff3e0' },
    { icon: '🟢', label: 'Available (Open)', value: availableOpen, desc: `${availablePct}% of bench`, bg: '#e8f5e9' },
    { icon: '📚', label: 'Upskilling', value: upskillingCount, desc: 'Active L&D', bg: '#e3f2fd' },
    { icon: '📋', label: 'Proposed', value: proposedCount, desc: 'Submitted to client', bg: '#f3e5f5' },
    { icon: '🔴', label: 'Non Deployable', value: summary.non_deployable, desc: `${nonDeployablePct}% of bench`, bg: '#ffebee' },
  ];

  const deptData = Object.entries(summary.by_department).sort((a, b) => b[1] - a[1]);
  const maxDept = Math.max(...deptData.map(d => d[1]), 1);

  const agingData = AGE_LABELS.map((label, i) => ({
    label,
    count: summary.by_age_bucket?.[label] || 0,
    color: AGE_COLORS[i],
  }));
  const maxAging = Math.max(...agingData.map(d => d.count), 1);

  const newJoiner = Array.isArray(resources) ? resources.filter((r: Resource) => r.days_on_bench <= 15).length : 0;
  const availableCount = Array.isArray(resources) ? resources.filter((r: Resource) => r.status === 'available').length : 0;
  const upskillingPipeline = Array.isArray(resources) ? resources.filter((r: Resource) => r.rmg_status === 'Available-Upskilling').length : 0;
  const proposed = Array.isArray(resources) ? resources.filter((r: Resource) => r.rmg_status === 'Proposed').length : 0;
  const internalExtended = Array.isArray(resources) ? resources.filter((r: Resource) => r.status === 'internal_extended').length : 0;
  const billedDelivery = Array.isArray(resources) ? resources.filter((r: Resource) => r.status === 'billed_delivery_support').length : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kpiScroll}>
        <View style={styles.kpiRow}>
          {kpis.map((kpi, i) => (
            <View key={i} style={[styles.kpiCard, { backgroundColor: kpi.bg }]}>
              <View style={styles.kpiIconCircle}>
                <Text style={styles.kpiIcon}>{kpi.icon}</Text>
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              <Text style={styles.kpiDesc}>{kpi.desc}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Bench by Practice</Text>
        <Text style={styles.cardSubtitle}>Headcount distribution ({deptData.length} departments)</Text>
        {deptData.map(([dept, count]) => (
          <View key={dept} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>{dept}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(count / maxDept) * 100}%`, backgroundColor: DEPT_COLORS[dept] || '#6366f1' }]} />
            </View>
            <Text style={styles.barValue}>{count}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>⏱ Bench Aging Snapshot</Text>
        <Text style={styles.cardSubtitle}>Resources by days on bench</Text>
        {agingData.map((d) => (
          <View key={d.label} style={styles.barRow}>
            <Text style={styles.barLabel}>{d.label}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(d.count / maxAging) * 100}%`, backgroundColor: d.color }]} />
            </View>
            <Text style={styles.barValue}>{d.count}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Bench Status Breakdown</Text>
        <Text style={styles.cardSubtitle}>Current status of all {summary.total} resources</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusValue}>{summary.deployable}</Text>
            <Text style={styles.statusLabel}>Deployable</Text>
            <View style={[styles.statusBar, { backgroundColor: '#22c55e' }]} />
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusValue}>{summary.non_deployable}</Text>
            <Text style={styles.statusLabel}>Non Deployable</Text>
            <View style={[styles.statusBar, { backgroundColor: '#ef4444' }]} />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔀 Resource Source Flow</Text>
        <Text style={styles.cardSubtitle}>Resource distribution by source</Text>
        <Text style={styles.flowSectionTitle}>Deployment Track</Text>
        <View style={styles.flowRow}>
          {[
            { label: 'New Joiner', count: newJoiner, color: '#6366f1' },
            { label: 'Available', count: availableCount, color: '#22c55e' },
            { label: 'Upskilling', count: upskillingPipeline, color: '#eab308' },
            { label: 'Proposed', count: proposed, color: '#f97316' },
            { label: 'IFB Pipeline', count: summary.ifb_pipeline, color: '#ef4444' },
          ].map((item, i) => (
            <React.Fragment key={item.label}>
              <View style={styles.flowNode}>
                <View style={[styles.flowCircle, { backgroundColor: item.color }]}> 
                  <Text style={styles.flowCount}>{item.count}</Text>
                </View>
                <Text style={styles.flowLabel}>{item.label}</Text>
              </View>
              {i < 4 && <Text style={styles.flowArrow}>→</Text>}
            </React.Fragment>
          ))}
        </View>
        <Text style={styles.flowSectionTitle}>Non-Deployable Pool</Text>
        <View style={styles.flowPoolRow}>
          <View style={styles.poolCard}>
            <Text style={styles.poolLabel}>Internal / Extended</Text>
            <Text style={styles.poolValue}>{internalExtended}</Text>
            <View style={styles.poolBar}>
              <View style={[styles.poolBarFill, { width: `${summary.total > 0 ? (internalExtended / summary.total) * 100 : 0}%`, backgroundColor: '#8b5cf6' }]} />
            </View>
          </View>
          <View style={styles.poolCard}>
            <Text style={styles.poolLabel}>Billed / Delivery Support</Text>
            <Text style={styles.poolValue}>{billedDelivery}</Text>
            <View style={styles.poolBar}>
              <View style={[styles.poolBarFill, { width: `${summary.total > 0 ? (billedDelivery / summary.total) * 100 : 0}%`, backgroundColor: '#f97316' }]} />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, paddingBottom: 80 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#78849e' },
  kpiScroll: { marginBottom: 16 },
  kpiRow: { flexDirection: 'row', paddingBottom: 4 },
  kpiCard: { width: 150, borderRadius: 16, padding: 14, marginRight: 10, alignItems: 'center', shadowColor: '#b0b8d8', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  kpiIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 6, backgroundColor: 'rgba(99,102,241,0.1)' },
  kpiIcon: { fontSize: 18 },
  kpiValue: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  kpiLabel: { fontSize: 11, color: '#78849e', textAlign: 'center', marginTop: 2 },
  kpiDesc: { fontSize: 10, color: '#a0aec0', textAlign: 'center', marginTop: 2 },
  card: { backgroundColor: '#e8eaf6', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#b0b8d8', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  cardSubtitle: { fontSize: 11, color: '#78849e', marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 110, fontSize: 11, color: '#78849e', textAlign: 'right', marginRight: 10 },
  barTrack: { flex: 1, height: 14, backgroundColor: '#d5dae5', borderRadius: 7, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 7 },
  barValue: { width: 36, fontSize: 12, fontWeight: '600', color: '#1e293b', textAlign: 'right', marginLeft: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  statusItem: { alignItems: 'center', flex: 1 },
  statusValue: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  statusLabel: { fontSize: 11, color: '#78849e', marginTop: 4 },
  statusBar: { width: '80%', height: 4, borderRadius: 2, marginTop: 6 },
  flowSectionTitle: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
  flowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 },
  flowNode: { alignItems: 'center', marginHorizontal: 4 },
  flowCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  flowCount: { fontSize: 14, fontWeight: '700', color: '#fff' },
  flowLabel: { fontSize: 9, color: '#78849e', marginTop: 4, textAlign: 'center' },
  flowArrow: { fontSize: 16, color: '#a0aec0', marginHorizontal: 2 },
  flowPoolRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  poolCard: { flex: 1, backgroundColor: '#d5dae5', borderRadius: 12, padding: 12, marginHorizontal: 4, alignItems: 'center', shadowColor: '#b0b8d8', shadowOffset: { width: -3, height: -3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  poolLabel: { fontSize: 10, color: '#78849e', textAlign: 'center' },
  poolValue: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 4 },
  poolBar: { width: '100%', height: 4, backgroundColor: '#b0b8d8', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  poolBarFill: { height: '100%', borderRadius: 2 },
});
