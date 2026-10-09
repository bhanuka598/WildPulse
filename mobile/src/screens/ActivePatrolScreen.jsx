import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import api from '../api/client';
import syncService from '../services/syncService';

export default function ActivePatrolScreen({ route, navigation }) {
  const { patrol } = route.params;
  const [seconds, setSeconds] = useState(0);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [distanceKm, setDistanceKm] = useState(patrol.distanceKm || 0);
  const [waypointsCount, setWaypointsCount] = useState(patrol.waypoints?.length || 0);
  const [completing, setCompleting] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isFinishingDialog, setIsFinishingDialog] = useState(false);

  const localWaypointsBuffer = useRef([]);
  const locationSubscription = useRef(null);

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Setup live GPS Location tracking via expo-location
  useEffect(() => {
    let isMounted = true;

    async function startLocationTracking() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'GPS Permission Denied',
            'Location tracking is required to log patrol waypoints and ensure ranger safety.'
          );
          return;
        }

        // Get initial fix
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (isMounted) {
          setCurrentCoords({
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
          });
        }

        // Subscribe to live position updates
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 15, // update every 15 meters
            timeInterval: 10000, // or every 10 seconds
          },
          (newLocation) => {
            if (!isMounted) return;
            const newPoint = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              timestamp: new Date().toISOString(),
            };
            setCurrentCoords({
              latitude: newPoint.latitude,
              longitude: newPoint.longitude,
            });

            localWaypointsBuffer.current.push(newPoint);
            setWaypointsCount((c) => c + 1);

            // Flush in batches of 3 or when online
            if (localWaypointsBuffer.current.length >= 3) {
              flushWaypoints();
            }
          }
        );
      } catch (err) {
        console.warn('Location tracking error:', err.message);
      }
    }

    startLocationTracking();

    return () => {
      isMounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      flushWaypoints();
    };
  }, []);

  // Flush buffer to API or offline storage
  const flushWaypoints = async () => {
    if (localWaypointsBuffer.current.length === 0) return;
    const batch = [...localWaypointsBuffer.current];
    localWaypointsBuffer.current = [];

    const online = await syncService.isConnected();
    if (online) {
      try {
        const { data } = await api.post(`/patrols/${patrol._id}/waypoints`, {
          waypoints: batch,
        });
        if (data.distanceKm !== undefined) {
          setDistanceKm(data.distanceKm);
        }
      } catch (err) {
        console.warn('Online waypoint upload failed, queueing offline:', err.message);
        await syncService.saveWaypointsOffline(patrol._id, batch);
      }
    } else {
      await syncService.saveWaypointsOffline(patrol._id, batch);
    }
  };

  const handleCompletePatrol = async () => {
    setCompleting(true);
    try {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      // Flush any pending waypoints
      const pendingLocal = [...localWaypointsBuffer.current];
      const offlineQueued = await syncService.getOfflineWaypoints(patrol._id);
      const allFinalWaypoints = [...offlineQueued, ...pendingLocal];

      await api.post(`/patrols/${patrol._id}/complete`, {
        notes: completionNotes || 'Surveillance completed as scheduled.',
        finalWaypoints: allFinalWaypoints,
      });

      await syncService.clearOfflineWaypoints(patrol._id);

      Alert.alert('Patrol Completed', 'Patrol logged and synced with Central Command.', [
        { text: 'OK', onPress: () => navigation.navigate('RangerDashboard') },
      ]);
    } catch (err) {
      Alert.alert('Completion Error', err.response?.data?.message || err.message);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Active Banner */}
      <View style={styles.topStatus}>
        <View style={styles.liveIndicator}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveText}>PATROL ACTIVE • GPS LOGGING</Text>
        </View>
        <Text style={styles.routeHeader}>{patrol.routeName}</Text>
      </View>

      {/* Main Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>ELAPSED TIME</Text>
          <Text style={styles.statValue}>{formatTime(seconds)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>EST. DISTANCE</Text>
          <Text style={styles.statValue}>{distanceKm} km</Text>
        </View>
      </View>

      <View style={styles.telemetryCard}>
        <Text style={styles.cardTitle}>🛰️ Real-time Ranger Telemetry</Text>
        <View style={styles.telemetryRow}>
          <Text style={styles.tLabel}>Latitude:</Text>
          <Text style={styles.tValue}>{currentCoords?.latitude?.toFixed(6) || 'Acquiring...'}</Text>
        </View>
        <View style={styles.telemetryRow}>
          <Text style={styles.tLabel}>Longitude:</Text>
          <Text style={styles.tValue}>{currentCoords?.longitude?.toFixed(6) || 'Acquiring...'}</Text>
        </View>
        <View style={styles.telemetryRow}>
          <Text style={styles.tLabel}>Breadcrumbs Captured:</Text>
          <Text style={styles.tValue}>{waypointsCount} coordinates</Text>
        </View>
      </View>

      {/* Primary Field Incident Button */}
      <TouchableOpacity
        style={styles.incidentActionBtn}
        onPress={() =>
          navigation.navigate('ReportIncident', {
            patrolId: patrol._id,
            coords: currentCoords,
          })
        }
      >
        <Text style={styles.incidentIcon}>🚨</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.incidentBtnTitle}>Report Field Incident</Text>
          <Text style={styles.incidentBtnSub}>
            Log snare traps, injured wildlife, poaching signs, or trespassing
          </Text>
        </View>
      </TouchableOpacity>

      {/* Complete Patrol Section */}
      {!isFinishingDialog ? (
        <TouchableOpacity
          style={styles.finishPromptBtn}
          onPress={() => setIsFinishingDialog(true)}
        >
          <Text style={styles.finishPromptText}>Complete & Conclude Patrol 🏁</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.finishBox}>
          <Text style={styles.finishTitle}>Debrief / Concluding Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add sector observations, wildlife sightings, or fence status..."
            placeholderTextColor="#71717a"
            multiline
            numberOfLines={4}
            value={completionNotes}
            onChangeText={setCompletionNotes}
          />
          <View style={styles.finishButtons}>
            <TouchableOpacity
              style={styles.cancelFinishBtn}
              onPress={() => setIsFinishingDialog(false)}
            >
              <Text style={styles.cancelText}>Resume Patrol</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmFinishBtn}
              onPress={handleCompletePatrol}
              disabled={completing}
            >
              {completing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.confirmText}>Submit & Finish</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c120f',
    padding: 16,
  },
  topStatus: {
    paddingTop: 36,
    paddingBottom: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  liveText: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  routeHeader: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#161f1a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#24332b',
    alignItems: 'center',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
  },
  statValue: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  telemetryCard: {
    backgroundColor: '#161f1a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#24332b',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2d24',
  },
  tLabel: {
    color: '#9ca3af',
    fontSize: 13,
  },
  tValue: {
    color: '#6ee7b7',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  incidentActionBtn: {
    backgroundColor: '#b91c1c',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  incidentIcon: {
    fontSize: 28,
  },
  incidentBtnTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  incidentBtnSub: {
    color: '#fecaca',
    fontSize: 11,
    marginTop: 2,
  },
  finishPromptBtn: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  finishPromptText: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '700',
  },
  finishBox: {
    backgroundColor: '#161f1a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#059669',
  },
  finishTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  notesInput: {
    backgroundColor: '#0c120f',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 10,
    color: '#ffffff',
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  finishButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  cancelFinishBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#27272a',
  },
  cancelText: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmFinishBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  confirmText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
