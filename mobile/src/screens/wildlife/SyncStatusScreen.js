import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import syncService from '../../services/syncService';
import { API_URL } from '../../api/client';
import { styles } from './ui';

export default function SyncStatusScreen({ navigation }) {
  const [online, setOnline] = useState(false);
  const [ops, setOps] = useState([]);
  const [notice, setNotice] = useState('');
  const [lastSync, setLastSync] = useState('Not yet in this session');

  const load = useCallback(async () => {
    setOnline(await syncService.isConnected());
    setOps(await syncService.getWildlifeOps());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function retry() {
    setNotice('');
    const result = await syncService.triggerSync();
    const queued = await syncService.getWildlifeOps();
    setOps(queued);
    setOnline(await syncService.isConnected());
    setLastSync(new Date().toLocaleString());
    setNotice(queued.length
      ? 'Some actions are still pending. They are not marked as saved on the server.'
      : `Sync finished. ${result?.synced || 0} wildlife action(s) confirmed in this pass, or the queue was already empty.`);
  }

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}><Text style={styles.title}>Network and sync</Text></View>
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.label}>Connection</Text>
          <Text style={styles.value}>{online ? 'Online' : 'Offline'}</Text>
          <Text style={styles.label}>API</Text>
          <Text style={styles.value}>{API_URL || 'EXPO_PUBLIC_API_URL is not set'}</Text>
          <Text style={styles.label}>Pending actions</Text>
          <Text style={styles.value}>{ops.length}</Text>
          <Text style={styles.label}>Last sync attempt</Text>
          <Text style={styles.value}>{lastSync}</Text>
        </View>
        {ops.map((op) => (
          <View key={op.operationId} style={styles.card}>
            <Text style={styles.value}>{op.action} · {op.dispatchId}</Text>
            <Text style={styles.label}>{op.operationId}</Text>
            <Text style={styles.label}>{op.lastError || 'Waiting to send'}</Text>
          </View>
        ))}
        {notice ? <Text style={styles.bannerText}>{notice}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={retry}><Text style={styles.buttonText}>Retry sync</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Back</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}
