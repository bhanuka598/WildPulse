import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import OsmMap from '../../components/OsmMap';
import { styles } from './ui';

const DEMO_RANGER = { latitude: 6.39, longitude: 81.48 };

export default function LocationMapScreen({ navigation, route }) {
  const alert = route.params?.alert;
  const pair = alert?.location?.coordinates || [81.45, 6.4];
  const [ranger, setRanger] = useState(null);
  const [permissionNote, setPermissionNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await Location.requestForegroundPermissionsAsync();
        if (result.status !== 'granted') {
          if (!cancelled) {
            setRanger({ ...DEMO_RANGER, simulated: true });
            setPermissionNote('Location permission denied. Showing a labeled demo ranger position near Yala, not your phone.');
          }
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          setRanger({ latitude: position.coords.latitude, longitude: position.coords.longitude, simulated: false });
          setPermissionNote('Foreground location only. Tracking stops when you leave this screen.');
        }
      } catch {
        if (!cancelled) {
          setRanger({ ...DEMO_RANGER, simulated: true });
          setPermissionNote('Location was unavailable. Showing a labeled demo position.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markers = [
    { id: 'alert', label: 'Alert', latitude: pair[1], longitude: pair[0], color: '#f87171', simulated: true },
  ];
  if (ranger) {
    markers.push({ id: 'ranger', label: 'You', latitude: ranger.latitude, longitude: ranger.longitude, color: '#34d399', simulated: ranger.simulated });
  }

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Alert location</Text>
        <Text style={styles.sub}>{alert?.alertId || 'Wildlife alert'}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{permissionNote}</Text>
        <OsmMap center={{ latitude: pair[1], longitude: pair[0] }} markers={markers} />
        <Text style={styles.label}>Protected boundary geometry is shown on the manager web map. This screen shows the reported point and your position.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Back</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}
