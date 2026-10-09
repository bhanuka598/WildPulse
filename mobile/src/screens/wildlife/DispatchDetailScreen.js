import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { styles } from './ui';
import { apiMessage, sendDispatchAction } from './actions';

export default function DispatchDetailScreen({ navigation, route }) {
  const { dispatchId } = route.params;
  const [dispatch, setDispatch] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/wildlife/dispatches/${dispatchId}`)
      .then(({ data }) => setDispatch(data.dispatch))
      .catch((err) => setError(apiMessage(err)));
  }, [dispatchId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function act(action) {
    setBusy(true);
    setError('');
    try {
      const result = await sendDispatchAction({ dispatchId, action, note: '' });
      setNotice(result.queued ? `Saved on this phone only (${result.operationId}). It is not on the server until sync succeeds.` : 'Server confirmed the update.');
      if (!result.queued) load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const pair = dispatch?.targetLocation?.coordinates || [];
  const directives = dispatch?.directives || {};

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{dispatchId}</Text>
        <Text style={styles.sub}>{dispatch?.status || 'Loading'}</Text>
      </View>
      <View style={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.bannerText}>{notice}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.label}>Priority</Text>
          <Text style={styles.value}>{dispatch?.priority}</Text>
          <Text style={styles.label}>Assigned ranger</Text>
          <Text style={styles.value}>{dispatch?.assignedRanger?.name || 'You'}</Text>
          <Text style={styles.label}>Target</Text>
          <Text style={styles.value}>{pair.length ? `${pair[1].toFixed(5)}, ${pair[0].toFixed(5)}` : '—'}</Text>
          <Text style={styles.label}>Assignment time</Text>
          <Text style={styles.value}>{dispatch?.dispatchedAt ? new Date(dispatch.dispatchedAt).toLocaleString() : '—'}</Text>
          <Text style={styles.label}>Manager instructions</Text>
          <Text style={styles.value}>{directives.officerNotes || 'None'}</Text>
          <Text style={styles.label}>Required action</Text>
          <Text style={styles.value}>{directives.safetyInstructions || 'Follow the dispatch directives.'}</Text>
          <Text style={styles.label}>Animal warning</Text>
          <Text style={styles.value}>{directives.animalWarning || '—'}</Text>
        </View>
        <TouchableOpacity disabled={busy || dispatch?.status !== 'ASSIGNED'} style={styles.button} onPress={() => act('accept')}><Text style={styles.buttonText}>Accept Dispatch</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy || dispatch?.status !== 'ACCEPTED'} style={styles.button} onPress={() => act('start')}><Text style={styles.buttonText}>Start Response</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy || !['ACCEPTED', 'IN_PROGRESS'].includes(dispatch?.status)} style={styles.button} onPress={() => navigation.navigate('ResponseUpdate', { dispatchId, mode: 'progress' })}><Text style={styles.buttonText}>Update Status</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy || dispatch?.status !== 'IN_PROGRESS'} style={[styles.button, styles.danger]} onPress={() => navigation.navigate('ResponseUpdate', { dispatchId, mode: 'complete' })}><Text style={styles.buttonText}>Complete Response</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Back</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}
