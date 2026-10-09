import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { styles, severityColor } from './ui';
import { apiMessage } from './actions';

export default function DispatchListScreen({ navigation }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/wildlife/my-dispatches')
      .then(({ data }) => setRows(data.dispatches || []))
      .catch((err) => setError(apiMessage(err)));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Assigned dispatches</Text>
      </View>
      {error ? <Text style={[styles.error, { margin: 16 }]}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.dispatchId}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.value}>No dispatches are assigned to you.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, { marginBottom: 10 }]} onPress={() => navigation.navigate('DispatchDetail', { dispatchId: item.dispatchId })}>
            <Text style={[styles.value, { color: severityColor[item.priority] || '#fff' }]}>{item.priority}</Text>
            <Text style={styles.value}>{item.dispatchId}</Text>
            <Text style={styles.label}>{item.status} · {item.alert?.alertId || 'Alert'}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={[styles.button, { margin: 16 }]} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Back</Text></TouchableOpacity>
    </View>
  );
}
