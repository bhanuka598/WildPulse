import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import syncService from '../../services/syncService';
import { useWildlifeSocket } from '../../hooks/useWildlifeSocket';
import { styles } from './ui';
import { apiMessage } from './actions';

export default function WildlifeHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [dispatches, setDispatches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const connected = await syncService.isConnected();
      setOnline(connected);
      const queued = await syncService.getWildlifeOps();
      setPending(queued.length);
      const [dispatchRes, alertRes] = await Promise.all([
        api.get('/wildlife/my-dispatches', { params: { active: 'true' } }),
        api.get('/wildlife/alerts', { params: { limit: 20 } }),
      ]);
      setDispatches(dispatchRes.data.dispatches || []);
      setAlerts(alertRes.data.alerts || []);
      setRefreshedAt(new Date());
    } catch (err) {
      setError(apiMessage(err));
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  useWildlifeSocket(() => load());

  const active = dispatches[0];

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.sub}>Field response</Text>
        <Text style={styles.title}>{user?.name || 'Ranger'}</Text>
      </View>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>DEMO / SIMULATED wildlife events. Your assignment status comes from the server.</Text>
      </View>
      <View style={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.label}>Assigned active dispatches</Text>
          <Text style={styles.value}>{dispatches.length}</Text>
          <Text style={styles.label}>New alerts on your assignments</Text>
          <Text style={styles.value}>{alerts.filter((alert) => alert.status === 'RESPONSE_DISPATCHED').length}</Text>
          <Text style={styles.label}>Current response</Text>
          <Text style={styles.value}>{active ? `${active.dispatchId} · ${active.status}` : 'No active assignment'}</Text>
          <Text style={styles.label}>Synchronization</Text>
          <Text style={styles.value}>{online ? 'Online' : 'Offline'} · {pending} pending</Text>
          <Text style={styles.label}>Last refresh</Text>
          <Text style={styles.value}>{refreshedAt ? refreshedAt.toLocaleString() : 'Not yet'}</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('MyAlerts')}><Text style={styles.buttonText}>My Alerts</Text></TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('AssignedDispatches')}><Text style={styles.buttonText}>Assigned Dispatches</Text></TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ResponseHistory')}><Text style={styles.buttonText}>Response History</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.navigate('SyncStatus')}><Text style={styles.buttonText}>Network and sync</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Back to patrols</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}
