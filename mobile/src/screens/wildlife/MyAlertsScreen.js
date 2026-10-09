import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { styles, severityColor } from './ui';
import { apiMessage } from './actions';

export default function MyAlertsScreen({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/wildlife/alerts', { params: { limit: 50 } })
      .then(({ data }) => setAlerts(data.alerts || []))
      .catch((err) => setError(apiMessage(err)));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>My alerts</Text>
        <Text style={styles.sub}>Assignments for the signed-in ranger</Text>
      </View>
      {error ? <Text style={[styles.error, { margin: 16 }]}>{error}</Text> : null}
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.alertId}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Text style={styles.value}>No alerts are assigned to you yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('WildlifeAlertDetail', { alertId: item.alertId })}>
            <View style={styles.row}>
              <Text style={[styles.value, { color: severityColor[item.severity] || '#fff' }]}>{item.severity}</Text>
              <Text style={styles.label}>{item.status}</Text>
            </View>
            <Text style={styles.value}>{item.species || item.category} · {item.animalCode || item.sensorCode}</Text>
            <Text style={styles.label}>{item.alertId}</Text>
            <Text style={styles.label}>{item.park || 'Protected area'} · {new Date(item.detectedAt).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={[styles.button, { margin: 16 }]} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Back</Text></TouchableOpacity>
    </View>
  );
}
