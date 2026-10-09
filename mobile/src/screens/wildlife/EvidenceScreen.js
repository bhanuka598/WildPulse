import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { API_URL } from '../../api/client';
import { styles } from './ui';

export default function EvidenceScreen({ navigation, route }) {
  const alert = route.params?.alert;
  const evidence = alert?.evidence || {};
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(Boolean(evidence.available));
  const source = evidence.imageUrl?.startsWith('/') && API_URL
    ? `${API_URL.replace(/\/api\/?$/, '')}${evidence.imageUrl}`
    : evidence.imageUrl;

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Camera trap evidence</Text>
        <Text style={styles.sub}>{alert?.alertId}</Text>
      </View>
      <View style={styles.body}>
        {evidence.available ? (
          <View style={styles.card}>
            {loading ? <ActivityIndicator color="#34d399" /> : null}
            {!failed ? (
              <Image source={{ uri: source }} style={{ width: '100%', height: 220, borderRadius: 12 }} onLoadEnd={() => setLoading(false)} onError={() => { setFailed(true); setLoading(false); }} />
            ) : (
              <Text style={styles.error}>The simulated frame could not be loaded. Check the API address.</Text>
            )}
            <Text style={styles.label}>Camera</Text>
            <Text style={styles.value}>{evidence.cameraId || '—'}</Text>
            <Text style={styles.label}>Captured</Text>
            <Text style={styles.value}>{evidence.capturedAt ? new Date(evidence.capturedAt).toLocaleString() : '—'}</Text>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>{evidence.locationLabel || '—'}</Text>
            <Text style={styles.label}>Detected activity</Text>
            <Text style={styles.value}>{evidence.detectionCategory || '—'}</Text>
            <Text style={styles.label}>Alert type</Text>
            <Text style={styles.value}>{alert?.category}</Text>
            <Text style={styles.bannerText}>DEMO / SIMULATED. This is not a real camera photograph.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.value}>No evidence image is stored for this alert.</Text>
            <Text style={styles.label}>A missing frame is not replaced with a pretend capture.</Text>
          </View>
        )}
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Back</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}
