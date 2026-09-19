import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { API_BASE_URL } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkillCount {
  skill: string;
  count: number;
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
  deployable: boolean;
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

const SKILL_GRADIENTS: Record<string, [string, string]> = {
  'Java': ['#667eea', '#764ba2'],
  'Python': ['#f093fb', '#f5576c'],
  'React': ['#4facfe', '#00f2fe'],
  'Angular': ['#43e97b', '#38f9d7'],
  'JavaScript': ['#fa709a', '#fee140'],
  'TypeScript': ['#a18cd1', '#fbc2eb'],
  'AWS': ['#ff9a9e', '#fecfef'],
  'Azure': ['#89f7fe', '#66a6ff'],
  'SQL': ['#fddb92', '#d1fdff'],
  'Node.js': ['#96fbc4', '#f9f586'],
  'Spring Boot': ['#c471f5', '#fa71cd'],
  'Kubernetes': ['#48c6ef', '#6f86d6'],
  'Docker': ['#feada6', '#f5efef'],
  'DevOps': ['#a1c4fd', '#c2e9fb'],
  'Machine Learning': ['#d4fc79', '#96e6a1'],
  'Default': ['#bdc3c7', '#95a5a6'],
};

const LEVEL_COLORS: Record<string, string> = {
  'Engineer': '#4facfe',
  'Sr Engineer': '#667eea',
  'Consultant': '#f093fb',
  'Sr+': '#43e97b',
};

const formatSkillName = (skill: string) => {
  const map: Record<string, string> = {
    'javascript': 'JavaScript',
    'java': 'Java',
    'python': 'Python',
    'react': 'React',
    'reactjs': 'React',
    'angular': 'Angular',
    'angularjs': 'Angular',
    'typescript': 'TypeScript',
    'aws': 'AWS',
    'amazon web services': 'AWS',
    'azure': 'Azure',
    'sql': 'SQL',
    'node': 'Node.js',
    'nodejs': 'Node.js',
    'spring': 'Spring Boot',
    'springboot': 'Spring Boot',
    'spring boot': 'Spring Boot',
    'kubernetes': 'Kubernetes',
    'k8s': 'Kubernetes',
    'docker': 'Docker',
    'devops': 'DevOps',
    'machine learning': 'Machine Learning',
    'ml': 'Machine Learning',
  };
  const lower = skill.toLowerCase().trim();
  return map[lower] || skill.charAt(0).toUpperCase() + skill.slice(1);
};

const getGradient = (skill: string): [string, string] => {
  const formatted = formatSkillName(skill);
  return SKILL_GRADIENTS[formatted] || SKILL_GRADIENTS['Default'];
};

export default function SkillsScreen() {
  const [skillCounts, setSkillCounts] = useState<SkillCount[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [selectedHrbps, setSelectedHrbps] = useState<string[]>([]);
  const [selectedLeaders, setSelectedLeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [skillsRes, resourcesRes, filtersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/skills`),
        fetch(`${API_BASE_URL}/api/v1/resources`),
        fetch(`${API_BASE_URL}/api/v1/filters`),
      ]);

      if (!skillsRes.ok || !resourcesRes.ok || !filtersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [skillsData, resourcesData, filtersData] = await Promise.all([
        skillsRes.json(),
        resourcesRes.json(),
        filtersRes.json(),
      ]);

      setSkillCounts(skillsData);
      setResources(resourcesData);
      setFilters(filtersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredResources = resources.filter((r) => {
    if (selectedHrbps.length > 0 && !selectedHrbps.includes(r.hrbp)) return false;
    if (selectedLeaders.length > 0 && !selectedLeaders.includes(r.leader)) return false;
    return true;
  });

  const filteredSkillCounts = skillCounts.map((sc) => {
    const count = filteredResources.filter((r) => {
      const rSkill = formatSkillName(r.skill);
      const scSkill = formatSkillName(sc.skill);
      return rSkill === scSkill;
    }).length;
    return { skill: sc.skill, count };
  }).filter((sc) => sc.count > 0);

  const top12 = [...filteredSkillCounts].sort((a, b) => b.count - a.count).slice(0, 12);
  const maxCount = top12.length > 0 ? top12[0].count : 1;

  const skillLevelData = top12.map((sc) => {
    const skillResources = filteredResources.filter(
      (r) => formatSkillName(r.skill) === formatSkillName(sc.skill)
    );
    const total = skillResources.length;
    const engineer = Math.round(total * 0.70);
    const srEngineer = Math.round(total * 0.15);
    const consultant = Math.round(total * 0.10);
    const srPlus = total - engineer - srEngineer - consultant;
    return {
      skill: sc.skill,
      Engineer: engineer,
      'Sr Engineer': srEngineer,
      'Consultant': consultant,
      'Sr+': Math.max(0, srPlus),
      Total: total,
    };
  });

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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading skills data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.screenTitle}>Skills Overview</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Filters</Text>

        {filters && filters.hrbps.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>HRBP</Text>
            <View style={styles.chipContainer}>
              {filters.hrbps.map((hrbp) => {
                const active = selectedHrbps.includes(hrbp);
                return (
                  <TouchableOpacity
                    key={hrbp}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleHrbp(hrbp)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {hrbp}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {filters && filters.leaders.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Leader</Text>
            <View style={styles.chipContainer}>
              {filters.leaders.map((leader) => {
                const active = selectedLeaders.includes(leader);
                return (
                  <TouchableOpacity
                    key={leader}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleLeader(leader)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {leader}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Primary Skills on Bench</Text>
        <View style={styles.barChart}>
          {top12.map((item, index) => {
            const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const colors = getGradient(item.skill);
            return (
              <View key={item.skill} style={styles.barRow}>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {formatSkillName(item.skill)}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.max(barWidth, 2)}%`,
                        backgroundColor: colors[0],
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{item.count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Skill × Level Distribution</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.tableColSkill]}>Skill</Text>
              <Text style={[styles.tableHeaderText, styles.tableColNum]}>Eng</Text>
              <Text style={[styles.tableHeaderText, styles.tableColNum]}>Sr Eng</Text>
              <Text style={[styles.tableHeaderText, styles.tableColNum]}>Cons.</Text>
              <Text style={[styles.tableHeaderText, styles.tableColNum]}>Sr+</Text>
              <Text style={[styles.tableHeaderText, styles.tableColNum]}>Total</Text>
            </View>
            {skillLevelData.map((row, index) => (
              <View
                key={row.skill}
                style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}
              >
                <Text style={[styles.tableCellSkill, styles.tableColSkill]} numberOfLines={1}>
                  {formatSkillName(row.skill)}
                </Text>
                <Text style={[styles.tableCellNum, styles.tableColNum]}>
                  {row.Engineer}
                </Text>
                <Text style={[styles.tableCellNum, styles.tableColNum]}>
                  {row['Sr Engineer']}
                </Text>
                <Text style={[styles.tableCellNum, styles.tableColNum]}>
                  {row.Consultant}
                </Text>
                <Text style={[styles.tableCellNum, styles.tableColNum]}>
                  {row['Sr+']}
                </Text>
                <Text style={[styles.tableCellNum, styles.tableColNum, styles.tableCellTotal]}>
                  {row.Total}
                </Text>
              </View>
            ))}
            {skillLevelData.length === 0 && (
              <Text style={styles.emptyTableText}>No data available</Text>
            )}
          </View>
        </ScrollView>
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Split: 70% Eng / 15% Sr Eng / 10% Cons. / 5% Sr+</Text>
          <View style={styles.legendRow}>
            {Object.entries(LEVEL_COLORS).map(([level, color]) => (
              <View key={level} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{level}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>All Skills</Text>
        <View style={styles.chipGrid}>
          {top12.map((sc) => {
            const colors = getGradient(sc.skill);
            return (
              <View
                key={sc.skill}
                style={[styles.skillChip, { backgroundColor: colors[0] }]}
              >
                <Text style={styles.skillChipName}>{formatSkillName(sc.skill)}</Text>
                <Text style={styles.skillChipCount}>{sc.count}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#e8eaf6',
    borderRadius: 16,
    shadowColor: '#b0b8d8',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 12,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636e72',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#d5dae5',
    shadowColor: '#b0b8d8',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chipActive: {
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
  },
  chipText: {
    fontSize: 13,
    color: '#636e72',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  barChart: {
    marginTop: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: {
    width: 90,
    fontSize: 12,
    color: '#2d3436',
    fontWeight: '500',
    marginRight: 8,
  },
  barTrack: {
    flex: 1,
    height: 22,
    backgroundColor: '#d5dae5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barValue: {
    width: 32,
    fontSize: 12,
    fontWeight: '700',
    color: '#2d3436',
    textAlign: 'right',
    marginLeft: 8,
  },
  tableContainer: {
    minWidth: 500,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#667eea',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  tableHeaderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d5dae5',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(102, 126, 234, 0.06)',
  },
  tableCellSkill: {
    fontSize: 12,
    color: '#2d3436',
    fontWeight: '500',
  },
  tableCellNum: {
    fontSize: 12,
    color: '#636e72',
    fontWeight: '600',
    textAlign: 'center',
  },
  tableCellTotal: {
    color: '#667eea',
    fontWeight: '700',
  },
  tableColSkill: {
    width: 110,
    textAlign: 'left',
  },
  tableColNum: {
    width: 70,
    textAlign: 'center',
  },
  emptyTableText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 24,
    fontSize: 14,
  },
  legendContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d5dae5',
  },
  legendTitle: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#636e72',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#b0b8d8',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  skillChipName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  skillChipCount: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden',
  },
});
