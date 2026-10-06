import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function RangerAssignmentsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAssignments = async () => {
    try {
      const { data } = await api.get('/conflicts');
      const allConflicts = data.conflicts || data.data || [];
      // Filter for conflicts assigned to this ranger or unassigned/actionable
      const myWork = allConflicts.filter(
        (c) =>
          c.assignedRanger?._id === user?.id ||
          c.assignedRanger === user?.id ||
          ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)
      );
      setAssignments(myWork.length > 0 ? myWork : allConflicts);
    } catch (err) {
      console.warn('Error fetching ranger assignments', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments();
  };

  const updateStatus = async (conflictId, newStatus) => {
    try {
      await api.put(`/conflicts/${conflictId}/status`, {
        status: newStatus,
        resolutionNotes:
          newStatus === 'RESOLVED'
            ? 'Ranger responded to incident location; wildlife guided safely away from buffer zone.'
            : undefined,
      });
      Alert.alert('Status Updated', `Incident status set to ${newStatus}`);
      fetchAssignments();
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Could not update status');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeRow}>
          <Text style={styles.typeText}>{item.conflictType}</Text>
          <Text style={styles.idBadge}>{item.reportId || item._id.slice(-6)}</Text>
        </View>
        <Text style={[styles.statusBadge, styles[`status_${item.status}`]]}>
          {item.status}
        </Text>
      </View>

      <Text style={styles.desc}>{item.description}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          📍 {item.villageArea || 'Area Registered'} {item.nearbyLandmark ? `(${item.nearbyLandmark})` : ''}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          🗺️ {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          👤 Reporter: {item.reporterName} ({item.reporterPhone})
        </Text>
      </View>

      {item.resolutionNotes ? (
        <View style={styles.resolutionBox}>
          <Text style={styles.resolutionTitle}>Action Log:</Text>
          <Text style={styles.resolutionText}>{item.resolutionNotes}</Text>
        </View>
      ) : null}

      <View style={styles.actionButtons}>
        {item.status === 'ASSIGNED' && (
          <TouchableOpacity
            style={styles.inProgressBtn}
            onPress={() => updateStatus(item._id, 'IN_PROGRESS')}
          >
            <Text style={styles.btnText}>Attend / In Progress</Text>
          </TouchableOpacity>
        )}

        {item.status !== 'RESOLVED' && (
          <TouchableOpacity
            style={styles.resolveBtn}
            onPress={() => updateStatus(item._id, 'RESOLVED')}
          >
            <Text style={styles.btnText}>Mark Resolved ✓</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Day, Ranger</Text>
          <Text style={styles.rangerName}>{user?.name || 'Field Officer'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.sectionTitle}>Dispatched Community Incidents</Text>
        <Text style={styles.subText}>Live feed from Community Liaison Officer</Text>
      </View>

      {loading ? (
        <View style={styles.loaderArea}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.loadingText}>Fetching assignments...</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Dispatched Incidents</Text>
              <Text style={styles.emptySub}>Pull down to check for new assignments from the liaison officer.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f4',
  },
  header: {
    backgroundColor: '#064e3b',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rangerName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  subHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  subText: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1c1917',
  },
  idBadge: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#e7e5e4',
    color: '#44403c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  status_REPORTED: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  status_ASSIGNED: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  status_IN_PROGRESS: {
    backgroundColor: '#f3e8ff',
    color: '#6b21a8',
  },
  status_RESOLVED: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  desc: {
    fontSize: 13,
    color: '#44403c',
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#78716c',
  },
  resolutionBox: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  resolutionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  resolutionText: {
    fontSize: 11,
    color: '#15803d',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
    paddingTop: 10,
  },
  inProgressBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resolveBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  loaderArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#78716c',
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#44403c',
  },
  emptySub: {
    fontSize: 12,
    color: '#a8a29e',
    textAlign: 'center',
    marginTop: 4,
  },
});
