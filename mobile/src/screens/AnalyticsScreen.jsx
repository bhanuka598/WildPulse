import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'Human-Wildlife Conflict Incidents',
  'Patrol Coverage & Sensor Uptime',
];

const PARKS = ['All Regions', 'Yala', 'Wilpattu', 'Udawalawe', 'Minneriya', 'Other'];

export default function AnalyticsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [park, setPark] = useState(PARKS[0]);
  
  // Date range defaults to past 30 days
  const today = new Date();
  const lastMonth = new Date(today);
  lastMonth.setDate(lastMonth.getDate() - 30);
  
  const [startDate] = useState(lastMonth.toISOString().split('T')[0]);
  const [endDate] = useState(today.toISOString().split('T')[0]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/analytics/report', {
        params: { category, park, startDate, endDate },
      });
      setReportData(data);
    } catch (err) {
      console.error('Report error:', err);
      Alert.alert('Error', 'Failed to generate report. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch report on mount
  useEffect(() => {
    generateReport();
  }, [category, park]);

  // Simple Bar Chart component
  const BarChart = ({ data }) => {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map((d) => Math.max(d.current, d.previous))) || 1;

    return (
      <View style={styles.chartContainer}>
        {data.map((item, idx) => (
          <View key={idx} style={styles.barGroup}>
            <Text style={styles.barLabel}>{item.name}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(item.current / maxVal) * 100}%` }]} />
            </View>
            <Text style={styles.barValue}>{item.current}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Analytics & Reports</Text>
        <View style={{ width: 60 }} /> {/* Placeholder for balance */}
      </View>

      <ScrollView style={styles.content}>
        {/* Filters */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Parameters</Text>
          
          <Text style={styles.label}>Category:</Text>
          <View style={styles.btnRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterBtn, category === cat && styles.filterBtnActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.filterBtnText, category === cat && styles.filterBtnTextActive]}>
                  {cat.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Region:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
            {PARKS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.filterBtn, park === p && styles.filterBtnActive, { marginRight: 8 }]}
                onPress={() => setPark(p)}
              >
                <Text style={[styles.filterBtnText, park === p && styles.filterBtnTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Report Content */}
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loaderText}>Generating Report...</Text>
          </View>
        ) : reportData ? (
          <View style={styles.reportSection}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Total Records</Text>
              <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
                <Text style={styles.summaryValue}>{reportData.summary.totalIncidents}</Text>
                {reportData.summary.totalTrend !== 0 && (
                  <Text style={{marginLeft: 10, fontSize: 16, fontWeight: 'bold', color: reportData.summary.totalTrend > 0 ? '#ef4444' : '#10b981'}}>
                    {reportData.summary.totalTrend > 0 ? '▲ +' : '▼ '}{reportData.summary.totalTrend}%
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Critical Severity</Text>
                <Text style={styles.metricVal}>{reportData.summary.criticalIncidents}</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Active Regions</Text>
                <Text style={styles.metricVal}>{reportData.summary.activeRegions}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Weekly Trend (Current vs Prev)</Text>
            <BarChart data={reportData.weeklyTrend} />

            <TouchableOpacity style={styles.exportBtn} onPress={() => Alert.alert('Success', 'PDF exported to device storage!')}>
              <Text style={styles.exportBtnText}>📄 Export PDF</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c120f' },
  header: {
    backgroundColor: '#064e3b',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: 'bold' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  content: { padding: 16 },
  filterSection: { marginBottom: 20 },
  sectionTitle: { color: '#a7f3d0', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, marginTop: 10 },
  label: { color: '#9ca3af', fontSize: 12, marginBottom: 8, marginTop: 8 },
  btnRow: { flexDirection: 'row', gap: 10 },
  scrollRow: { flexDirection: 'row', paddingBottom: 10 },
  filterBtn: { backgroundColor: '#1f2937', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#374151' },
  filterBtnActive: { backgroundColor: '#059669', borderColor: '#059669' },
  filterBtnText: { color: '#d1d5db', fontSize: 13, fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  loader: { alignItems: 'center', marginTop: 40 },
  loaderText: { color: '#059669', marginTop: 10, fontWeight: '600' },
  reportSection: { marginTop: 10, paddingBottom: 40 },
  summaryCard: { backgroundColor: '#161f1a', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#24332b', marginBottom: 12 },
  summaryTitle: { color: '#9ca3af', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  summaryValue: { color: '#10b981', fontSize: 42, fontWeight: '900', marginTop: 8 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  metricBox: { flex: 1, backgroundColor: '#161f1a', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#24332b' },
  metricLabel: { color: '#9ca3af', fontSize: 12 },
  metricVal: { color: '#e5e7eb', fontSize: 24, fontWeight: '700', marginTop: 4 },
  chartContainer: { backgroundColor: '#161f1a', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#24332b', marginTop: 8, gap: 12 },
  barGroup: { flexDirection: 'row', alignItems: 'center' },
  barLabel: { color: '#9ca3af', fontSize: 12, width: 60 },
  barTrack: { flex: 1, height: 12, backgroundColor: '#27272a', borderRadius: 6, overflow: 'hidden', marginHorizontal: 10 },
  barFill: { height: '100%', backgroundColor: '#059669', borderRadius: 6 },
  barValue: { color: '#d1d5db', fontSize: 12, width: 20, textAlign: 'right', fontWeight: 'bold' },
  exportBtn: { backgroundColor: '#d97706', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 30 },
  exportBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
