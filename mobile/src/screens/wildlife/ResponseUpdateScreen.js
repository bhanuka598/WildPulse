import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { styles } from './ui';
import { apiMessage, sendDispatchAction } from './actions';

const OUTCOMES = [
  ['ANIMAL_MOVED_AWAY', 'Animal moved away'],
  ['BOUNDARY_INSPECTED', 'Boundary inspected'],
  ['AREA_SECURED', 'Area secured'],
  ['POACHING_REPORTED', 'Suspected poaching activity reported'],
  ['FURTHER_ASSISTANCE', 'Further assistance needed'],
];

export default function ResponseUpdateScreen({ navigation, route }) {
  const { dispatchId, mode } = route.params;
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState('BOUNDARY_INSPECTED');
  const [photo, setPhoto] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo permission denied. You can still submit notes without an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const result = await sendDispatchAction({
        dispatchId,
        action: mode === 'complete' ? 'complete' : 'progress',
        note,
        outcome: mode === 'complete' ? outcome : undefined,
        photoUri: photo,
      });
      if (result.queued) {
        setNotice(`Queued locally as ${result.operationId}. This update is not saved on the server yet.`);
      } else if (mode === 'complete' && photo && !result.photoStored) {
        setNotice('Response saved on the server. The photo was not stored. Check Cloudinary configuration if a picture was required.');
      } else {
        setNotice('Server confirmed this update.');
      }
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{mode === 'complete' ? 'Complete response' : 'Update response'}</Text>
        <Text style={styles.sub}>{dispatchId}</Text>
      </View>
      <View style={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.bannerText}>{notice}</Text> : null}
        <Text style={styles.label}>Observation notes</Text>
        <TextInput value={note} onChangeText={setNote} multiline style={styles.input} placeholder="What did you observe?" placeholderTextColor="#78716c" />
        {mode === 'complete' && OUTCOMES.map(([value, label]) => (
          <TouchableOpacity key={value} style={[styles.card, outcome === value && { borderColor: '#34d399' }]} onPress={() => setOutcome(value)}>
            <Text style={styles.value}>{label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={pickPhoto}><Text style={styles.buttonText}>{photo ? 'Photo selected' : 'Attach photo'}</Text></TouchableOpacity>
        {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: 160, borderRadius: 12 }} /> : null}
        <TouchableOpacity disabled={busy} style={styles.button} onPress={submit}><Text style={styles.buttonText}>{busy ? 'Sending…' : 'Submit update'}</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Back</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}
