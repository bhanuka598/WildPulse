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
import syncService from '../services/syncService';

export default function RangerDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [patrols, setPatrols] = useState([]);
  const [offlineCount, setOfflineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingPatrol, setStartingPatrol] = useState(false);

  const checkOfflineQueue = async () => {
    const queued = await syncService.getOfflineIncidents();
    setOfflineCount(queued.length);
  };

  const fetchPatrols = async () => {
    try {
      const { data } = await api.get('/patrols');
      setPatrols(data.patrols || []);
    } catch (err) {
      console.warn('Error fetching patrols:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatrols();
    checkOfflineQueue();

    const unsubscribe = syncService.subscribe((event) => {
      if (['INCIDENT_SAVED', 'SYNC_SUCCESS', 'SYNC_FAILED'].includes(event.type)) {
        checkOfflineQueue();
      }
    });

    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPatrols();
    checkOfflineQueue();
  };

  const handleStartNewPatrol = () => {
    Alert.prompt
      ? Alert.prompt(
          'Start Field Patrol',
          'Enter sector or route identifier (e.g. Sector-3 North):',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Start',
              onPress: (routeName) => startPatrol(routeName || 'Active Sector Patrol'),
            },
          ]
        )
      : startPatrol('Ranger Route Alpha');
  };

  const startPatrol = async (routeName) => {
    setStartingPatrol(true);
    try {
      const { data } = await api.post('/patrols/start', {
        routeName: routeName || `Ranger Patrol ${new Date().toLocaleTimeString()}`,
      });
      navigation.navigate('ActivePatrol', { patrol: data.patrol });
    } catch (err) {
      Alert.alert('Patrol Error', err.response?.data?.message || err.message);
    } finally {
      setStartingPatrol(false);
    }
  };

  const handleResumePatrol = (patrol) => {
    navigation.navigate('ActivePatrol', { patrol });
  };

  const renderPatrolItem = ({ item }) => {
    const isActive = item.status === 'IN_PROGRESS';
    return (
      <View style={[styles.card, isActive && styles.activeCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <Text style={styles.routeTitle}>{item.routeName}</Text>
            <Text
              style={[
                styles.statusBadge,
                isActive ? styles.statusActive : styles.statusDone,
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Distance Covered:</Text>
          <Text style={styles.metaVal}>{item.distanceKm || 0} km</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Waypoints Logged:</Text>
          <Text style={styles.metaVal}>{item.waypoints?.length || 0} points</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Started:</Text>
          <Text style={styles.metaVal}>
            {item.startTime ? new Date(item.startTime).toLocaleTimeString() : 'Pending'}
          </Text>
        </View>

        <View style={styles.cardActions}>
          {isActive ? (
            <TouchableOpacity
              style={styles.resumeBtn}
              onPress={() => handleResumePatrol(item)}
            >
              <Text style={styles.resumeBtnText}>⚡ Continue Tracking</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() =>
                Alert.alert(
                  'Patrol Summary',
                  `Route: ${item.routeName}\nStatus: ${item.status}\nDistance: ${item.distanceKm} km\nWaypoints: ${item.waypoints?.length || 0}\nNotes: ${item.notes || 'None'}`
                )
              }
            >
              <Text style={styles.viewBtnText}>View Summary</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subTitle}>Tactical Field Station</Text>
          <Text style={styles.title}>{user?.name || 'Field Ranger'}</Text>
          <Text style={styles.badgeRole}>ID: IT23615502 • RANGER ACTOR</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Offline Sync Banner */}
      {offlineCount > 0 && (
        <View style={styles.offlineBanner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                {offlineCount} Pending Incident{offlineCount > 1 ? 's' : ''} in Queue
              </Text>
              <Text style={styles.bannerSub}>
                Waiting for cellular signal. Will auto-sync to HQ.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.syncBtn}
              onPress={() => syncService.triggerSync()}
            >
              <Text style={styles.syncBtnText}>Sync Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Action Bar */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.startPatrolBtn}
          onPress={handleStartNewPatrol}
          disabled={startingPatrol}
        >
          {startingPatrol ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.startBtnIcon}>🥾</Text>
              <View>
                <Text style={styles.startBtnTitle}>Initiate New Patrol</Text>
                <Text style={styles.startBtnSub}>Start GPS Breadcrumb Logging & Incident Watch</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Quick Report Button */}
        <TouchableOpacity
          style={styles.quickIncidentBtn}
          onPress={() => navigation.navigate('ReportIncident')}
        >
          <Text style={styles.quickIncidentText}>🚨 Report Field Incident Now</Text>
        </TouchableOpacity>

        {/* View Dispatched Community Incidents Button */}
        <TouchableOpacity
          style={styles.dispatchedIncidentsBtn}
          onPress={() => navigation.navigate('Assignments')}
        >
          <Text style={styles.dispatchedIncidentsText}>📋 View Dispatched Community Incidents →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dispatchedIncidentsBtn}
          onPress={() => navigation.navigate('WildlifeHome')}
        >
          <Text style={styles.dispatchedIncidentsText}>Wildlife alerts and dispatches</Text>
        </TouchableOpacity>
      </View>

      {/* Patrols History List */}
      <View style={styles.listHeader}>
        <Text style={styles.listSectionTitle}>Assigned & Recent Patrols</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#065f46" />
        </View>
      ) : (
        <FlatList
          data={patrols}
          keyExtractor={(item) => item._id}
          renderItem={renderPatrolItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No Patrol Records Found</Text>
              <Text style={styles.emptySub}>
                Tap 'Initiate New Patrol' above to begin your surveillance circuit.
              </Text>
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
    backgroundColor: '#0c120f',
  },
  header: {
    backgroundColor: '#064e3b',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#047857',
  },
  subTitle: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  badgeRole: {
    color: '#a7f3d0',
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600',
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
  offlineBanner: {
    backgroundColor: '#78350f',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#92400e',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerIcon: {
    fontSize: 20,
  },
  bannerTitle: {
    color: '#fef3c7',
    fontSize: 13,
    fontWeight: '700',
  },
  bannerSub: {
    color: '#fde68a',
    fontSize: 11,
  },
  syncBtn: {
    backgroundColor: '#d97706',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionSection: {
    padding: 16,
    gap: 10,
  },
  startPatrolBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnIcon: {
    fontSize: 28,
  },
  startBtnTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  startBtnSub: {
    color: '#a7f3d0',
    fontSize: 11,
  },
  quickIncidentBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  quickIncidentText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  dispatchedIncidentsBtn: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  dispatchedIncidentsText: {
    color: '#a7f3d0',
    fontSize: 13,
    fontWeight: '700',
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listSectionTitle: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  card: {
    backgroundColor: '#161f1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#24332b',
    marginBottom: 8,
  },
  activeCard: {
    borderColor: '#10b981',
    backgroundColor: '#11221b',
  },
  cardHeader: {
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  statusActive: {
    backgroundColor: '#065f46',
    color: '#6ee7b7',
  },
  statusDone: {
    backgroundColor: '#27272a',
    color: '#a1a1aa',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  metaVal: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#24332b',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  resumeBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resumeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  viewBtn: {
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewBtnText: {
    color: '#d4d4d8',
    fontSize: 11,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#161f1a',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyTitle: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
