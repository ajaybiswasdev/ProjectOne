import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { API_BASE_URL } from '../config';

const LOC_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
const EXP_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#eab308', '#f97316', '#ef4444', '#6366f1'];
const DESIG_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#06b6d4'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SummaryRead {
  total: number;
  deployable: number;
  non_deployable: number;
  available: number;
  ifb_pipeline: number;
  critical_91_plus: number;
  average_days_on_bench: number;
  by_department: Record<string, number>;
  by_age_bucket: Record<string, number>;
  by_location: Record<string, number>;
}

interface LocationCount {
  location: string;
  count: number;
}

interface ExperienceBucket {
  bucket: string;
  count: number;
}

interface DesignationCount {
  level: string;
  count: number;
}

interface FilterOptions {
  hrbps: string[];
  leaders: string[];
  departments: string[];
  skills: string[];
  statuses: string[];
  age_buckets: string[];
}

export default function LocationScreen() {
  const [summary, setSummary] = useState<SummaryRead | null>(null);
  const [locations, setLocations] = useState<LocationCount[]>([]);
  const [experience, setExperience] = useState<ExperienceBucket[]>([]);
  const [designations, setDesignations] = useState<DesignationCount[]>([]);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHRBP, setSelectedHRBP] = useState<string | null>(null);
  const [selectedLeader, setSelectedLeader] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedHRBP, selectedLeader]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedHRBP) params.append('hrbp', selectedHRBP);
      if (selectedLeader) params.append('leader', selectedLeader);
      const qs = params.toString();
      const suffix = qs ? `?${qs}` : '';

      const [summaryRes, locRes, expRes, desigRes, filterRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/summary${suffix}`),
        fetch(`${API_BASE_URL}/api/v1/locations${suffix}`),
        fetch(`${API_BASE_URL}/api/v1/experience${suffix}`),
        fetch(`${API_BASE_URL}/api/v1/designations${suffix}`),
        fetch(`${API_BASE_URL}/api/v1/filters`),
      ]);

      setSummary(await summaryRes.json());
      setLocations(await locRes.json());
      setExperience(await expRes.json());
      setDesignations(await desigRes.json());
      setFilters(await filterRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLargestPractice = (): string => {
    if (!summary?.by_department) return 'N/A';
    const entries = Object.entries(summary.by_department);
    if (entries.length === 0) return 'N/A';
    return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  };

  const getLargestLocation = (): string => {
    if (!locations.length) return 'N/A';
    return locations.reduce((a, b) => (b.count > a.count ? b : a)).location;
  };

  const getDominantExperience = (): string => {
    if (!experience.length) return 'N/A';
    return experience.reduce((a, b) => (b.count > a.count ? b : a)).bucket;
  };

  const getDeployablePercent = (): string => {
    if (!summary || summary.total === 0) return '0';
    return ((summary.deployable / summary.total) * 100).toFixed(1);
  };

  const getNonDeployablePercent = (): string => {
    if (!summary || summary.total === 0) return '0';
    return ((summary.non_deployable / summary.total) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {filters && (
        <View style={styles.filtersSection}>
          <Text style={styles.filterLabel}>HRBP</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, !selectedHRBP && styles.chipActive]}
              onPress={() => setSelectedHRBP(null)}
            >
              <Text style={[styles.chipText, !selectedHRBP && styles.chipTextActive]}>All</Text>
            </TouchableOpacity>
            {filters.hrbps.map((h) => (
              <TouchableOpacity
                key={h}
                style={[styles.chip, selectedHRBP === h && styles.chipActive]}
                onPress={() => setSelectedHRBP(h)}
              >
                <Text style={[styles.chipText, selectedHRBP === h && styles.chipTextActive]}>{h}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterLabel, { marginTop: 10 }]}>Leader</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, !selectedLeader && styles.chipActive]}
              onPress={() => setSelectedLeader(null)}
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary Statistics</Text>
          <View style={styles.metricsGrid}>
            <MetricItem label="Total on Bench" value={String(summary.total)} />
            <MetricItem label="Deployable (%)" value={`${getDeployablePercent()}%`} />
            <MetricItem label="Non Deployable (%)" value={`${getNonDeployablePercent()}%`} />
            <MetricItem label="Avg Days on Bench" value={String(summary.average_days_on_bench)} />
            <MetricItem label="Critical Aged (91+)" value={String(summary.critical_91_plus)} />
            <MetricItem label="IFB Pipeline" value={String(summary.ifb_pipeline)} />
            <MetricItem label="Available" value={String(summary.available)} />
            <MetricItem label="Largest Practice" value={getLargestPractice()} />
            <MetricItem label="Largest Location" value={getLargestLocation()} />
            <MetricItem label="Dominant Experience" value={getDominantExperience()} />
          </View>
        </View>
      )}

      {locations.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bench by Location</Text>
          <View style={styles.chartContainer}>
            {locations.map((loc, idx) => {
              const maxCount = Math.max(...locations.map((l) => l.count));
              const barWidth = maxCount > 0 ? (loc.count / maxCount) * (SCREEN_WIDTH - 120) : 0;
              return (
                <View key={loc.location} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {loc.location}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: barWidth,
                          backgroundColor: LOC_COLORS[idx % LOC_COLORS.length],
                        },
                      ]}
                    />
                    <Text style={styles.barValue}>{loc.count}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {experience.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Experience Bucket Distribution</Text>
          <View style={styles.chartContainer}>
            {experience.map((exp, idx) => {
              const maxCount = Math.max(...experience.map((e) => e.count));
              const barWidth = maxCount > 0 ? (exp.count / maxCount) * (SCREEN_WIDTH - 120) : 0;
              return (
                <View key={exp.bucket} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {exp.bucket}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: barWidth,
                          backgroundColor: EXP_COLORS[idx % EXP_COLORS.length],
                        },
                      ]}
                    />
                    <Text style={styles.barValue}>{exp.count}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {designations.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Designation Mix</Text>
          <View style={styles.chartContainer}>
            {designations.map((des, idx) => {
              const maxCount = Math.max(...designations.map((d) => d.count));
              const barWidth = maxCount > 0 ? (des.count / maxCount) * (SCREEN_WIDTH - 120) : 0;
              return (
                <View key={des.level} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {des.level}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: barWidth,
                          backgroundColor: DESIG_COLORS[idx % DESIG_COLORS.length],
                        },
                      ]}
                    />
                    <Text style={styles.barValue}>{des.count}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f8',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f8',
  },
  filtersSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginLeft: 4,
  },
  chipRow: {
    flexGrow: 0,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#e8eaf6',
    marginRight: 8,
    shadowColor: '#b0b8d8',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chipActive: {
    backgroundColor: '#6366f1',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.5,
  },
  chipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#e8eaf6',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#b0b8d8',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    backgroundColor: '#dde1f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6366f1',
  },
  metricLabel: {
    fontSize: 11,
    color: '#777',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  chartContainer: {
    marginTop: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barLabel: {
    width: 90,
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
    marginRight: 8,
  },
  barTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  barFill: {
    height: 20,
    borderRadius: 10,
    minWidth: 4,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
});
