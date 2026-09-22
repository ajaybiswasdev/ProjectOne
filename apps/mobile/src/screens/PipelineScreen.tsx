import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { API_BASE_URL } from '../config';
import { authFetch } from '../authFetch';

interface PipelineSummary {
  ifb_selected: number;
  ifb_reserved: number;
  pipeline_planned: number;
  ifb_shadow: number;
  by_department: Record<string, number>;
}

interface Resource {
  id: string;
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

interface FilterOptions {
  hrbps: string[];
  leaders: string[];
  departments: string[];
  skills: string[];
  statuses: string[];
  age_buckets: string[];
}

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

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

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const getAvatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const neumorphicCard = {
  backgroundColor: '#e8eaf6',
  borderRadius: 16,
  shadowColor: '#b0b8d8',
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 6,
};

export default function PipelineScreen() {
  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [selectedHrbp, setSelectedHrbp] = useState<string>('');
  const [selectedLeader, setSelectedLeader] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedHrbp) params.append('hrbp', selectedHrbp);
      if (selectedLeader) params.append('leader', selectedLeader);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const [pipelineRes, resourcesRes, filtersRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/v1/pipeline${qs}`),
        authFetch(`${API_BASE_URL}/api/v1/resources${qs}`),
        authFetch(`${API_BASE_URL}/api/v1/filters`),
      ]);
      const [pipelineData, resourcesData, filtersData] = await Promise.all([
        pipelineRes.json(),
        resourcesRes.json(),
        filtersRes.json(),
      ]);
      setPipeline(pipelineData);
      setResources(resourcesData);
      setFilters(filtersData);
    } catch (e) {
      console.error('Failed to fetch pipeline data:', e);
    }
  };

  useEffect(() => { fetchData(); }, [selectedHrbp, selectedLeader]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (!pipeline) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const ifbResources = resources.filter(r => r.status === 'ifb');
  const selected = ifbResources.filter(r => r.rmg_status === 'IFB-Selected');
  const reserved = ifbResources.filter(r => r.rmg_status === 'IFB-Reserved' || r.rmg_status === 'Available-Pipeline Planned');

  const kpis = [
    { label: 'IFB-Selected', value: pipeline.ifb_selected, bg: '#e0f2f1' },
    { label: 'IFB-Reserved', value: pipeline.ifb_reserved, bg: '#e3f2fd' },
    { label: 'Pipeline Planned', value: pipeline.pipeline_planned, bg: '#f3e5f5' },
    { label: 'Shadowing', value: pipeline.ifb_shadow, bg: '#fff3e0' },
  ];

  const practiceData = Object.entries(pipeline.by_department).sort((a, b) => b[1] - a[1]);
  const maxPractice = Math.max(...practiceData.map(d => d[1]), 1);

  const renderCandidate = (r: Resource) => (
    <View key={r.id} style={styles.candidateCard}>
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(r.name) }]}>
        <Text style={styles.avatarText}>{getInitials(r.name)}</Text>
      </View>
      <View style={styles.candidateInfo}>
        <Text style={styles.candidateName} numberOfLines={1}>{r.name}</Text>
        <Text style={styles.candidateMeta}>{r.skill} · {r.location}</Text>
      </View>
      <View style={[styles.daysBadge, r.days_on_bench >= 91 ? styles.daysBadgeRed : r.days_on_bench >= 61 ? styles.daysBadgeYellow : styles.daysBadgeGreen]}>
        <Text style={[styles.daysText, r.days_on_bench >= 91 ? styles.daysTextRed : r.days_on_bench >= 61 ? styles.daysTextYellow : styles.daysTextGreen]}>{r.days_on_bench}d</Text>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {filters && (
        <View style={styles.filterRow}>
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>HRBP</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                <Text style={[styles.filterChip, !selectedHrbp && styles.filterChipActive]} onPress={() => setSelectedHrbp('')}>All</Text>
                {filters.hrbps.map(h => (
                  <Text key={h} style={[styles.filterChip, selectedHrbp === h && styles.filterChipActive]} onPress={() => setSelectedHrbp(h)}>{h}</Text>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Leader</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                <Text style={[styles.filterChip, !selectedLeader && styles.filterChipActive]} onPress={() => setSelectedLeader('')}>All</Text>
                {filters.leaders.map(l => (
                  <Text key={l} style={[styles.filterChip, selectedLeader === l && styles.filterChipActive]} onPress={() => setSelectedLeader(l)}>{l}</Text>
                ))}
              </View>
            </ScrollView>
          </View>
          {(selectedHrbp || selectedLeader) && (
            <Text style={styles.clearBtn} onPress={() => { setSelectedHrbp(''); setSelectedLeader(''); }}>✕ Clear</Text>
          )}
        </View>
      )}

      <View style={styles.kpiGrid}>
        {kpis.map((kpi, i) => (
          <View key={i} style={[styles.kpiCard, { backgroundColor: kpi.bg }]}>
            <Text style={styles.kpiValue}>{kpi.value}</Text>
            <Text style={styles.kpiLabel}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, neumorphicCard]}>
        <Text style={styles.cardTitle}>IFB-Selected — Top Candidates ({selected.length})</Text>
        <Text style={styles.cardSubtitle}>Shortlisted by clients, awaiting final deployment</Text>
        {selected.length === 0 ? (
          <Text style={styles.emptyText}>No resources match filter</Text>
        ) : (
          selected.slice(0, 10).map(renderCandidate)
        )}
      </View>

      <View style={[styles.card, neumorphicCard]}>
        <Text style={styles.cardTitle}>IFB-Reserved + Pipeline Planned ({reserved.length})</Text>
        <Text style={styles.cardSubtitle}>Reserved or planned for upcoming engagements</Text>
        {reserved.length === 0 ? (
          <Text style={styles.emptyText}>No resources match filter</Text>
        ) : (
          reserved.slice(0, 10).map(renderCandidate)
        )}
      </View>

      <View style={[styles.card, neumorphicCard]}>
        <Text style={styles.cardTitle}>IFB Pipeline by Practice</Text>
        {practiceData.map(([dept, count]) => (
          <View key={dept} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>{dept}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(count / maxPractice) * 100}%`, backgroundColor: DEPT_COLORS[dept] || '#6366f1' }]} />
            </View>
            <Text style={styles.barValue}>{count}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, paddingBottom: 80 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#78849e' },
  filterRow: { marginBottom: 16 },
  filterContainer: { marginBottom: 8 },
  filterLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  filterChips: { flexDirection: 'row', gap: 6 },
  filterChip: { fontSize: 11, color: '#78849e', backgroundColor: '#d5dae5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' },
  filterChipActive: { backgroundColor: '#6366f1', color: '#fff' },
  clearBtn: { fontSize: 12, color: '#ef4444', marginTop: 6, fontWeight: '600' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  kpiCard: { width: '48%', borderRadius: 16, padding: 14, alignItems: 'center', marginBottom: 10, shadowColor: '#b0b8d8', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  kpiValue: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  kpiLabel: { fontSize: 11, color: '#78849e', textAlign: 'center', marginTop: 2 },
  card: { padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  cardSubtitle: { fontSize: 11, color: '#78849e', marginBottom: 12 },
  candidateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#d5dae5', borderRadius: 12, padding: 10, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  candidateInfo: { flex: 1, marginLeft: 10 },
  candidateName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  candidateMeta: { fontSize: 11, color: '#78849e', marginTop: 2 },
  daysBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  daysBadgeRed: { backgroundColor: '#fee2e2' },
  daysBadgeYellow: { backgroundColor: '#fef3c7' },
  daysBadgeGreen: { backgroundColor: '#dcfce7' },
  daysText: { fontSize: 11, fontWeight: '700' },
  daysTextRed: { color: '#dc2626' },
  daysTextYellow: { color: '#d97706' },
  daysTextGreen: { color: '#16a34a' },
  emptyText: { fontSize: 13, color: '#a0aec0', textAlign: 'center', paddingVertical: 16 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 110, fontSize: 11, color: '#78849e', textAlign: 'right', marginRight: 10 },
  barTrack: { flex: 1, height: 14, backgroundColor: '#d5dae5', borderRadius: 7, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 7 },
  barValue: { width: 36, fontSize: 12, fontWeight: '600', color: '#1e293b', textAlign: 'right', marginLeft: 8 },
});
