import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { API_BASE_URL } from '../config';
import { authFetch } from '../authFetch';

interface AgingBucketSummary {
  bucket: string;
  count: number;
  label: string;
}

interface AgingDepartmentRow {
  department: string;
  total: number;
  buckets: Record<string, number>;
  risk: string;
}

interface SummaryRead {
  total: number;
  critical_91_plus: number;
  watch_zone_61_90: number;
}

interface FilterOptions {
  hrbps: string[];
  leaders: string[];
  departments: string[];
  skills: string[];
  statuses: string[];
  age_buckets: string[];
}

const BUCKET_EMOJIS: Record<string, string> = {
  '0-30': '🟢',
  '31-60': '🔵',
  '61-90': '🟣',
  '91-120': '🟡',
  '121-180': '🟠',
  '181+': '🔴',
};

const BUCKET_COLORS: Record<string, string> = {
  '0-30': '#4caf50',
  '31-60': '#2196f3',
  '61-90': '#9c27b0',
  '91-120': '#ffc107',
  '121-180': '#ff9800',
  '181+': '#f44336',
};

const RISK_STYLES: Record<string, { bg: string; text: string }> = {
  High: { bg: '#f44336', text: '#fff' },
  Medium: { bg: '#ffc107', text: '#000' },
  Low: { bg: '#4caf50', text: '#fff' },
};

const neumorphicCard = {
  backgroundColor: '#e8eaf6',
  borderRadius: 16,
  shadowColor: '#b0b8d8',
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 6,
};

export default function AgingScreen() {
  const [summary, setSummary] = useState<SummaryRead | null>(null);
  const [buckets, setBuckets] = useState<AgingBucketSummary[]>([]);
  const [departments, setDepartments] = useState<AgingDepartmentRow[]>([]);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [selectedHrbp, setSelectedHrbp] = useState<string>('');
  const [selectedLeader, setSelectedLeader] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const buildParams = useCallback(() => {
    const params: string[] = [];
    if (selectedHrbp) params.push(`hrbp=${encodeURIComponent(selectedHrbp)}`);
    if (selectedLeader) params.push(`leader=${encodeURIComponent(selectedLeader)}`);
    return params.length ? `?${params.join('&')}` : '';
  }, [selectedHrbp, selectedLeader]);

  const fetchData = useCallback(async () => {
    try {
      const qs = buildParams();
      const [summaryRes, bucketsRes, deptRes, filtersRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/v1/summary${qs}`),
        authFetch(`${API_BASE_URL}/api/v1/aging/summary${qs}`),
        authFetch(`${API_BASE_URL}/api/v1/aging${qs}`),
        authFetch(`${API_BASE_URL}/api/v1/filters`),
      ]);
      const [summaryData, bucketsData, deptData, filtersData] = await Promise.all([
        summaryRes.json(),
        bucketsRes.json(),
        deptRes.json(),
        filtersRes.json(),
      ]);
      setSummary(summaryData);
      setBuckets(bucketsData);
      setDepartments(deptData);
      setFilters(filtersData);
    } catch (err) {
      console.error('Failed to fetch aging data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5c6bc0" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.screenTitle}>Bench Aging</Text>

      {filters && (
        <View style={[styles.filterRow, neumorphicCard]}>
          <Text style={styles.filterSectionLabel}>HRBP</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              style={[styles.chip, !selectedHrbp && styles.chipActive]}
              onPress={() => setSelectedHrbp('')}
            >
              <Text style={[styles.chipText, !selectedHrbp && styles.chipTextActive]}>All</Text>
            </TouchableOpacity>
            {filters.hrbps.map((h) => (
              <TouchableOpacity
                key={h}
                style={[styles.chip, selectedHrbp === h && styles.chipActive]}
                onPress={() => setSelectedHrbp(h)}
              >
                <Text style={[styles.chipText, selectedHrbp === h && styles.chipTextActive]}>{h}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterSectionLabel, { marginTop: 10 }]}>Leader</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              style={[styles.chip, !selectedLeader && styles.chipActive]}
              onPress={() => setSelectedLeader('')}
            >
              <Text style={[styles.chipText, !selectedLeader && styles.chipTextActive]}>All</Text>
            </TouchableOpacity>
            {filters.leaders.map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.chip, selectedLeader === l && styles.chipActive]}
                onPress={() => setSelectedLeader(l)}
              >
                <Text style={[styles.chipText, selectedLeader === l && styles.chipTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {summary && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, neumorphicCard]}>
            <Text style={styles.summaryLabel}>Total Bench</Text>
            <Text style={styles.summaryValue}>{summary.total}</Text>
          </View>
          <View style={[styles.summaryCard, neumorphicCard]}>
            <Text style={styles.summaryLabel}>Critical (&gt;91d)</Text>
            <Text style={[styles.summaryValue, { color: '#f44336' }]}>{summary.critical_91_plus}</Text>
          </View>
          <View style={[styles.summaryCard, neumorphicCard]}>
            <Text style={styles.summaryLabel}>Watch Zone (61-90d)</Text>
            <Text style={[styles.summaryValue, { color: '#9c27b0' }]}>{summary.watch_zone_61_90}</Text>
          </View>
        </View>
      )}

      <View style={[styles.bucketSection, neumorphicCard]}>
        <Text style={styles.sectionTitle}>Aging Distribution</Text>
        {buckets.map((b) => {
          const maxCount = Math.max(...buckets.map((x) => x.count), 1);
          const widthPct = (b.count / maxCount) * 100;
          const emoji = BUCKET_EMOJIS[b.bucket] || '⚪';
          const color = BUCKET_COLORS[b.bucket] || '#999';
          return (
            <View key={b.bucket} style={styles.bucketRow}>
              <Text style={styles.bucketEmoji}>{emoji}</Text>
              <Text style={styles.bucketLabel}>{b.bucket}d</Text>
              <View style={styles.bucketBarBg}>
                <View
                  style={[
                    styles.bucketBarFill,
                    { width: `${widthPct}%`, backgroundColor: color },
                  ]}
                />
              </View>
              <Text style={styles.bucketCount}>{b.count}</Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.tableCard, neumorphicCard]}>
        <Text style={styles.sectionTitle}>Department Heatmap</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.deptCol]}>Department</Text>
              <Text style={[styles.tableHeaderText, styles.colCol]}>0-30d</Text>
              <Text style={[styles.tableHeaderText, styles.colCol]}>31-60d</Text>
              <Text style={[styles.tableHeaderText, styles.colCol]}>61-90d</Text>
              <Text style={[styles.tableHeaderText, styles.colCol]}>91-120d</Text>
              <Text style={[styles.tableHeaderText, styles.colCol]}>121-180d</Text>
              <Text style={[styles.tableHeaderText, styles.colCol]}>181+d</Text>
              <Text style={[styles.tableHeaderText, styles.totalCol]}>Total</Text>
              <Text style={[styles.tableHeaderText, styles.riskCol]}>Risk</Text>
            </View>
            {departments.map((row, idx) => {
              const riskStyle = RISK_STYLES[row.risk] || RISK_STYLES.Low;
              return (
                <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}>
                  <Text style={[styles.tableCell, styles.deptCol]} numberOfLines={1}>
                    {row.department}
                  </Text>
                  {['0-30', '31-60', '61-90', '91-120', '121-180', '181+'].map((b) => (
                    <View key={b} style={[styles.colCol, styles.heatCell]}>
                      <View
                        style={[
                          styles.heatDot,
                          {
                            backgroundColor: BUCKET_COLORS[b],
                            opacity: row.buckets[b] ? 0.3 + (row.buckets[b] / Math.max(row.total, 1)) * 0.7 : 0,
                          },
                        ]}
                      />
                      <Text style={styles.heatValue}>{row.buckets[b] ?? 0}</Text>
                    </View>
                  ))}
                  <Text style={[styles.tableCell, styles.totalCol, styles.totalValue]}>{row.total}</Text>
                  <View style={[styles.riskCol]}>
                    <View style={[styles.riskPill, { backgroundColor: riskStyle.bg }]}>
                      <Text style={[styles.riskPillText, { color: riskStyle.text }]}>{row.risk}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f8',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f8',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  filterRow: {
    padding: 14,
    marginBottom: 16,
  },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5c6bc0',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#dde0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#c5c9e0',
  },
  chipActive: {
    backgroundColor: '#5c6bc0',
    borderColor: '#5c6bc0',
  },
  chipText: {
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  bucketSection: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 14,
  },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bucketEmoji: {
    fontSize: 18,
    width: 26,
  },
  bucketLabel: {
    width: 52,
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
  },
  bucketBarBg: {
    flex: 1,
    height: 20,
    backgroundColor: '#d8dce8',
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  bucketBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  bucketCount: {
    width: 36,
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'right',
  },
  tableCard: {
    padding: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#c5c9e0',
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5c6bc0',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e5f0',
  },
  tableRowEven: {
    backgroundColor: 'rgba(92,107,192,0.04)',
  },
  tableCell: {
    fontSize: 13,
    color: '#333',
  },
  deptCol: {
    width: 140,
  },
  colCol: {
    width: 56,
  },
  totalCol: {
    width: 48,
    textAlign: 'center',
  },
  riskCol: {
    width: 64,
    alignItems: 'center',
  },
  heatCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatDot: {
    width: 32,
    height: 20,
    borderRadius: 6,
    position: 'absolute',
  },
  heatValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
    zIndex: 1,
  },
  totalValue: {
    fontWeight: '700',
    color: '#1a1a2e',
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  riskPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
