import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { styles } from './ui';
import { apiMessage } from './actions';

export default function ResponseHistoryScreen({ navigation }) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/wildlife/my-dispatches', { params: { status: 'COMPLETED' } })
      .then(({ data }) => setRows(data.dispatches || []))
      .catch((err) => setError(apiMessage(err)));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <View style={styles.header}><Text style={styles.title}>Response history</Text></View>
      {error ? <Text style={[styles.error, { margin: 16 }]}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.dispatchId}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.value}>No completed assignments yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, { marginBottom: 10 }]} onPress={() => setOpen(open === item.dispatchId ? null : item.dispatchId)}>
            <Text style={styles.value}>{item.alert?.alertId || item.dispatchId}</Text>
            <Text style={styles.label}>Outcome {item.outcome || '—'}</Text>
            <Text style={styles.label}>Completed {item.completedAt ? new Date(item.completedAt).toLocaleString() : '—'}</Text>
            {open === item.dispatchId && (
              <Text style={styles.value}>{item.responseNotes || 'No field notes.'}</Text>
            )}
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={[styles.button, { margin: 16 }]} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Back</Text></TouchableOpacity>
    </View>
  );
}
