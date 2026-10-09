import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from '../api/client';

export const OFFLINE_INCIDENTS_KEY = '@offline_field_incidents';
export const OFFLINE_WAYPOINTS_KEY = '@offline_patrol_waypoints';
export const WILDLIFE_QUEUE_KEY = '@offline_wildlife_ops';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.listeners = new Set();
    this.setupNetworkListener();
  }

  // Subscribe to sync event changes
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.warn('Listener error in SyncService', err);
      }
    });
  }

  // Monitor connectivity
  setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (isOnline) {
        this.triggerSync();
      }
    });
  }

  // Queue an incident when offline
  async saveIncidentOffline(incident) {
    try {
      const existing = await this.getOfflineIncidents();
      const payload = {
        ...incident,
        tempId: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        queuedAt: new Date().toISOString(),
      };
      existing.push(payload);
      await AsyncStorage.setItem(OFFLINE_INCIDENTS_KEY, JSON.stringify(existing));
      this.notifyListeners({ type: 'INCIDENT_SAVED', count: existing.length });
      return payload;
    } catch (err) {
      console.error('Failed to save incident offline:', err);
      throw err;
    }
  }

  // Retrieve queued offline incidents
  async getOfflineIncidents() {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_INCIDENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn('Error reading offline incidents:', err);
      return [];
    }
  }

  // Queue waypoints when offline
  async saveWaypointsOffline(patrolId, waypoints) {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_WAYPOINTS_KEY);
      const queue = data ? JSON.parse(data) : {};
      if (!queue[patrolId]) queue[patrolId] = [];
      queue[patrolId].push(...waypoints);
      await AsyncStorage.setItem(OFFLINE_WAYPOINTS_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn('Error saving offline waypoints:', err);
    }
  }

  // Get offline waypoints for patrol
  async getOfflineWaypoints(patrolId) {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_WAYPOINTS_KEY);
      const queue = data ? JSON.parse(data) : {};
      return queue[patrolId] || [];
    } catch (err) {
      return [];
    }
  }

  // Clear offline waypoints for patrol
  async clearOfflineWaypoints(patrolId) {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_WAYPOINTS_KEY);
      const queue = data ? JSON.parse(data) : {};
      delete queue[patrolId];
      await AsyncStorage.setItem(OFFLINE_WAYPOINTS_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn('Error clearing offline waypoints:', err);
    }
  }

  // Check network connectivity
  async isConnected() {
    const net = await NetInfo.fetch();
    return Boolean(net.isConnected && net.isInternetReachable !== false);
  }

  // Trigger sync of queued items
  async triggerSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.notifyListeners({ type: 'SYNC_STARTING' });

    try {
      const queuedIncidents = await this.getOfflineIncidents();
      if (queuedIncidents.length > 0) {
        // Upload images if any local URIs exist (or pass directly if none)
        const preparedIncidents = [];
        for (const inc of queuedIncidents) {
          let uploadedImageUrls = [];
          if (inc.localImageUri) {
            try {
              const formData = new FormData();
              formData.append('images', {
                uri: inc.localImageUri,
                name: `evidence_${Date.now()}.jpg`,
                type: 'image/jpeg',
              });
              formData.append('latitude', String(inc.latitude || 0));
              formData.append('longitude', String(inc.longitude || 0));
              formData.append('description', inc.description || 'Offline incident');
              formData.append('incidentType', inc.incidentType || 'OTHER');
              formData.append('severity', inc.severity || 'MEDIUM');
              if (inc.patrolId) formData.append('patrolId', inc.patrolId);

              // POST directly as individual report
              await api.post('/field-incidents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              continue; // Handled directly
            } catch (uploadErr) {
              console.warn('Direct upload for offline item failed, fallback to sync-bulk:', uploadErr);
            }
          }

          preparedIncidents.push({
            patrolId: inc.patrolId,
            incidentType: inc.incidentType,
            description: inc.description,
            severity: inc.severity,
            latitude: inc.latitude,
            longitude: inc.longitude,
            images: inc.images || uploadedImageUrls,
            timestamp: inc.queuedAt,
          });
        }

        if (preparedIncidents.length > 0) {
          await api.post('/field-incidents/sync-bulk', {
            incidents: preparedIncidents,
          });
        }

        // Clear offline storage
        await AsyncStorage.removeItem(OFFLINE_INCIDENTS_KEY);
        this.notifyListeners({ type: 'SYNC_SUCCESS', count: queuedIncidents.length });
      }
      await this.syncWildlifeOps();
      return this.getWildlifeOps();
    } catch (err) {
      console.warn('Sync failed (will retry when online):', err.message);
      this.notifyListeners({ type: 'SYNC_FAILED', error: err.message });
    } finally {
      this.isSyncing = false;
    }
  }

  async getWildlifeOps() {
    try {
      const data = await AsyncStorage.getItem(WILDLIFE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async enqueueWildlifeOp(op) {
    const existing = await this.getWildlifeOps();
    if (existing.some((row) => row.operationId === op.operationId)) return op;
    const payload = { ...op, pending: true, createdAt: new Date().toISOString() };
    existing.push(payload);
    await AsyncStorage.setItem(WILDLIFE_QUEUE_KEY, JSON.stringify(existing));
    this.notifyListeners({ type: 'WILDLIFE_QUEUED', count: existing.length });
    return payload;
  }

  async syncWildlifeOps() {
    const ops = await this.getWildlifeOps();
    if (ops.length === 0) return { synced: 0, pending: 0 };
    const online = await this.isConnected();
    if (!online) {
      this.notifyListeners({ type: 'WILDLIFE_PENDING', count: ops.length });
      return { synced: 0, pending: ops.length };
    }
    const remaining = [];
    let synced = 0;
    for (const op of ops) {
      try {
        if (op.action === 'accept') await api.patch(`/wildlife/dispatches/${op.dispatchId}/accept`, { note: op.note || '' });
        else if (op.action === 'start') await api.patch(`/wildlife/dispatches/${op.dispatchId}/start`, { note: op.note || '' });
        else if (op.action === 'progress') await api.patch(`/wildlife/dispatches/${op.dispatchId}/progress`, { note: op.note || '' });
        else if (op.action === 'complete') {
          if (op.photoUri) {
            const form = new FormData();
            form.append('note', op.note || '');
            form.append('outcome', op.outcome || '');
            form.append('photo', { uri: op.photoUri, name: 'response.jpg', type: 'image/jpeg' });
            await api.patch(`/wildlife/dispatches/${op.dispatchId}/complete`, form, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          } else {
            await api.patch(`/wildlife/dispatches/${op.dispatchId}/complete`, { note: op.note || '', outcome: op.outcome });
          }
        } else {
          throw new Error('Unknown queued action');
        }
        synced += 1;
      } catch (err) {
        if (!err.response) {
          remaining.push(op, ...ops.slice(ops.indexOf(op) + 1));
          break;
        }
        remaining.push({ ...op, lastError: err.response?.data?.message || err.message });
      }
    }
    await AsyncStorage.setItem(WILDLIFE_QUEUE_KEY, JSON.stringify(remaining));
    this.notifyListeners({ type: remaining.length ? 'WILDLIFE_PENDING' : 'SYNC_SUCCESS', count: remaining.length, synced });
    return { synced, pending: remaining.length };
  }
}

export default new SyncService();
