import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { API_BASE_URL } from '../config';

type Resource = {
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
};

type FilterOptions = {
  hrbps: string[];
  leaders: string[];
  departments: string[];
  skills: string[];
  statuses: string[];
  age_buckets: string[];
};

type ActiveChipFilter = 'All' | '91+ Days' | '61-90 Days' | 'Available' | 'IFB Pipeline' | 'Deployable' | 'Non Deployable';

const CHIPS: ActiveChipFilter[] = ['All', '91+ Days', '61-90 Days', 'Available', 'IFB Pipeline', 'Deployable', 'Non Deployable'];

function getRiskPill(days: number): { label: string; color: string; bg: string } {
  if (days >= 91) return { label: 'Critical', color: '#fff', bg: '#e53935' };
  if (days >= 61) return { label: 'Watch', color: '#000', bg: '#ffc107' };
  return { label: 'Safe', color: '#fff', bg: '#43a047' };
}

function getDeployablePill(val: string): { label: string; color: string; bg: string } {
  if (val === 'Deployable') return { label: 'Y', color: '#fff', bg: '#43a047' };
  return { label: 'N', color: '#fff', bg: '#e53935' };
}

export default function RegisterScreen() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({ hrbps: [], leaders: [], departments: [], skills: [], statuses: [], age_buckets: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState<ActiveChipFilter>('All');
  const [selectedHrbps, setSelectedHrbps] = useState<string[]>([]);
  const [selectedLeaders, setSelectedLeaders] = useState<string[]>([]);
  const [showHrbpPicker, setShowHrbpPicker] = useState(false);
  const [showLeaderPicker, setShowLeaderPicker] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [resRes, filterRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/resources`),
        fetch(`${API_BASE_URL}/api/v1/filters`),
      ]);
      const resData: Resource[] = await resRes.json();
      const filterData: FilterOptions = await filterRes.json();
      setResources(resData);
      setFilters(filterData);
    } catch (e) {
      console.error('Failed to fetch data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const toggleHrbp = (hrbp: string) => {
    setSelectedHrbps((prev) =>
      prev.includes(hrbp) ? prev.filter((h) => h !== hrbp) : [...prev, hrbp]
    );
  };

  const toggleLeader = (leader: string) => {
    setSelectedLeaders((prev) =>
      prev.includes(leader) ? prev.filter((l) => l !== leader) : [...prev, leader]
    );
  };

  const filtered = resources.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.name.toLowerCase().includes(q) &&
        !r.employee_id.toLowerCase().includes(q) &&
        !r.skill.toLowerCase().includes(q) &&
        !r.department.toLowerCase().includes(q) &&
        !r.location.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (selectedHrbps.length > 0 && !selectedHrbps.includes(r.hrbp)) return false;
    if (selectedLeaders.length > 0 && !selectedLeaders.includes(r.leader)) return false;

    switch (activeChip) {
      case '91+ Days':
        return r.days_on_bench >= 91;
      case '61-90 Days':
        return r.days_on_bench >= 61 && r.days_on_bench <= 90;
      case 'Available':
        return r.status === 'Available';
      case 'IFB Pipeline':
        return r.status === 'IFB Pipeline';
      case 'Deployable':
        return r.deployable === 'Deployable';
      case 'Non Deployable':
        return r.deployable === 'Non Deployable';
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5c6bc0" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Resource Register</Text>

      {/* HRBP & Leader filter chips */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.pickerChip, showHrbpPicker && styles.pickerChipActive]}
          onPress={() => {
            setShowHrbpPicker(!showHrbpPicker);
            setShowLeaderPicker(false);
          }}
        >
          <Text style={styles.pickerChipText}>
            HRBP{selectedHrbps.length > 0 ? ` (${selectedHrbps.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pickerChip, showLeaderPicker && styles.pickerChipActive]}
          onPress={() => {
            setShowLeaderPicker(!showLeaderPicker);
            setShowHrbpPicker(false);
          }}
        >
          <Text style={styles.pickerChipText}>
            Leader{selectedLeaders.length > 0 ? ` (${selectedLeaders.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* HRBP dropdown */}
      {showHrbpPicker && (
        <View style={styles.dropdownCard}>
          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
            {filters.hrbps.map((h) => (
              <TouchableOpacity key={h} style={styles.dropdownItem} onPress={() => toggleHrbp(h)}>
                <View style={[styles.checkbox, selectedHrbps.includes(h) && styles.checkboxChecked]}>
                  {selectedHrbps.includes(h) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.dropdownText}>{h}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selectedHrbps.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedHrbps([])}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Leader dropdown */}
      {showLeaderPicker && (
        <View style={styles.dropdownCard}>
          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
            {filters.leaders.map((l) => (
              <TouchableOpacity key={l} style={styles.dropdownItem} onPress={() => toggleLeader(l)}>
                <View style={[styles.checkbox, selectedLeaders.includes(l) && styles.checkboxChecked]}>
                  {selectedLeaders.includes(l) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.dropdownText}>{l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selectedLeaders.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedLeaders([])}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID, skill, dept, location..."
          placeholderTextColor="#9e9e9e"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Chip strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipStrip}>
        {CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={[styles.chip, activeChip === chip && styles.chipActive]}
            onPress={() => setActiveChip(chip)}
          >
            <Text style={[styles.chipText, activeChip === chip && styles.chipTextActive]}>
              {chip}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Showing count */}
      <Text style={styles.countText}>
        Showing {filtered.length} of {resources.length} resources
      </Text>

      {/* Table */}
      <View style={styles.tableCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 40 }]}>#</Text>
              <Text style={[styles.th, { width: 140 }]}>Name</Text>
              <Text style={[styles.th, { width: 110 }]}>Designation</Text>
              <Text style={[styles.th, { width: 130 }]}>Primary Skill</Text>
              <Text style={[styles.th, { width: 130 }]}>Practice</Text>
              <Text style={[styles.th, { width: 110 }]}>Location</Text>
              <Text style={[styles.th, { width: 90 }]}>Days</Text>
              <Text style={[styles.th, { width: 100 }]}>Exp</Text>
              <Text style={[styles.th, { width: 100 }]}>Deployable</Text>
              <Text style={[styles.th, { width: 110 }]}>RMG Status</Text>
            </View>

            {/* Rows */}
            {filtered.map((r, i) => {
              const risk = getRiskPill(r.days_on_bench);
              const dep = getDeployablePill(r.deployable);
              return (
                <View key={r.id} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.td, { width: 40 }]}>{i + 1}</Text>
                  <Text style={[styles.td, { width: 140 }]} numberOfLines={1}>{r.name}</Text>
                  <Text style={[styles.td, { width: 110 }]} numberOfLines={1}>{r.level}</Text>
                  <Text style={[styles.td, { width: 130 }]} numberOfLines={1}>{r.skill}</Text>
                  <Text style={[styles.td, { width: 130 }]} numberOfLines={1}>{r.department}</Text>
                  <Text style={[styles.td, { width: 110 }]} numberOfLines={1}>{r.location}</Text>
                  <View style={[styles.td, { width: 90, alignItems: 'center' }]}>
                    <View style={[styles.pill, { backgroundColor: risk.bg }]}>
                      <Text style={[styles.pillText, { color: risk.color }]}>{r.days_on_bench}d</Text>
                    </View>
                    <Text style={[styles.riskLabel, { color: risk.bg }]}>{risk.label}</Text>
                  </View>
                  <Text style={[styles.td, { width: 100 }]} numberOfLines={1}>{r.experience_bucket}</Text>
                  <View style={[styles.td, { width: 100, alignItems: 'center' }]}>
                    <View style={[styles.pill, { backgroundColor: dep.bg, minWidth: 32 }]}>
                      <Text style={[styles.pillText, { color: dep.color }]}>{dep.label}</Text>
                    </View>
                  </View>
                  <Text style={[styles.td, { width: 110 }]} numberOfLines={1}>{r.rmg_status}</Text>
                </View>
              );
            })}

            {filtered.length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No resources match the current filters.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  pickerChip: {
    backgroundColor: '#e8eaf6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#b0b8d8',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  pickerChipActive: {
    backgroundColor: '#5c6bc0',
  },
  pickerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  dropdownCard: {
    backgroundColor: '#e8eaf6',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#b0b8d8',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#7986cb',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5c6bc0',
    borderColor: '#5c6bc0',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
  clearText: {
    color: '#e53935',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8eaf6',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: '#b0b8d8',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#1a1a2e',
  },
  chipStrip: {
    marginBottom: 10,
  },
  chip: {
    backgroundColor: '#e8eaf6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    shadowColor: '#b0b8d8',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  chipActive: {
    backgroundColor: '#5c6bc0',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  chipTextActive: {
    color: '#fff',
  },
  countText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  tableCard: {
    backgroundColor: '#e8eaf6',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#b0b8d8',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#c5cae9',
    paddingBottom: 8,
    marginBottom: 4,
  },
  th: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a2e',
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5e4',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(200, 210, 240, 0.25)',
  },
  td: {
    fontSize: 12,
    color: '#333',
    paddingHorizontal: 6,
  },
  pill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  riskLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyRow: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
});
