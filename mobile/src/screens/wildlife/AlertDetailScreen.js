import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { styles } from './ui';
import { apiMessage } from './actions';

export default function AlertDetailScreen({ navigation, route }) {
  const { alertId } = route.params;
  const [alert, setAlert] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get(`/wildlife/alerts/${alertId}`)
      .then(({ data }) => setAlert(data.alert))
      .catch((err) => setError(apiMessage(err)));
  }, [alertId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pair = alert?.location?.coordinates || [];
  const animal = alert?.animal && typeof alert.animal === 'object' ? alert.animal : null;

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{alertId}</Text>
        <Text style={styles.sub}>{alert?.severity} · {alert?.status}</Text>
      </View>
      <View style={styles.banner}><Text style={styles.bannerText}>Positions are DEMO / SIMULATED unless a collar fix says otherwise.</Text></View>
      <View style={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.label}>Animal</Text>
          <Text style={styles.value}>{animal?.name || 'Name not recorded'} · {animal?.animalId || alert?.animalCode || '—'}</Text>
          <Text style={styles.label}>Species</Text>
          <Text style={styles.value}>{alert?.species || 'Unknown'}</Text>
          <Text style={styles.label}>GPS</Text>
          <Text style={styles.value}>{pair.length ? `${pair[1].toFixed(5)}, ${pair[0].toFixed(5)}` : 'Unknown'}</Text>
          <Text style={styles.label}>Threat</Text>
          <Text style={styles.value}>{alert?.threatClassification || alert?.category}</Text>
          <Text style={styles.label}>Priority</Text>
          <Text style={styles.value}>{alert?.severity}</Text>
          <Text style={styles.label}>Distance to village</Text>
          <Text style={styles.value}>{alert?.distanceToVillageKm != null ? `${alert.distanceToVillageKm} km straight-line · ${alert.nearestVillage}` : 'Unavailable'}</Text>
          <Text style={styles.label}>Assigned time</Text>
          <Text style={styles.value}>{alert?.detectedAt ? new Date(alert.detectedAt).toLocaleString() : '—'}</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('WildlifeMap', { alert })}><Text style={styles.buttonText}>View Map</Text></TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('WildlifeEvidence', { alert })}><Text style={styles.buttonText}>View Evidence</Text></TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            const dispatch = alert?.activeDispatch;
            const dispatchId = dispatch?.dispatchId;
            if (!dispatchId) {
              setError('No dispatch is assigned to you for this alert yet.');
              return;
            }
            navigation.navigate('DispatchDetail', { dispatchId });
          }}
        >
          <Text style={styles.buttonText}>Acknowledge Assignment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Back</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}
