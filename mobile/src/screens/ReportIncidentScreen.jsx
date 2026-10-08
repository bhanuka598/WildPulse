import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../api/client';
import syncService from '../services/syncService';

const INCIDENT_TYPES = [
  { id: 'SNARE_TRAP', label: '🪤 Snare / Wire Trap' },
  { id: 'POACHING_SIGN', label: '🎯 Poaching Activity / Sign' },
  { id: 'INJURED_ANIMAL', label: '🩹 Injured Wildlife' },
  { id: 'TRESPASSING', label: '🚶 Illegal Trespassing' },
  { id: 'ILLEGAL_LOGGING', label: '🪓 Illegal Logging' },
  { id: 'OTHER', label: '⚠️ Other Threat / Incident' },
];

const SEVERITY_LEVELS = [
  { id: 'LOW', label: 'Low', color: '#10b981' },
  { id: 'MEDIUM', label: 'Medium', color: '#f59e0b' },
  { id: 'HIGH', label: 'High', color: '#f97316' },
  { id: 'CRITICAL', label: 'Critical', color: '#ef4444' },
];

export default function ReportIncidentScreen({ route, navigation }) {
  const patrolId = route.params?.patrolId;
  const initialCoords = route.params?.coords;

  const [incidentType, setIncidentType] = useState('SNARE_TRAP');
  const [severity, setSeverity] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [coordinates, setCoordinates] = useState(initialCoords || null);
  const [imageUri, setImageUri] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(!initialCoords);
  const [submitting, setSubmitting] = useState(false);

  // Auto-acquire current GPS coordinates
  useEffect(() => {
    async function getGPS() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setCoordinates({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch (err) {
        console.warn('GPS acquire error:', err.message);
      } finally {
        setLoadingLocation(false);
      }
    }

    if (!coordinates) {
      getGPS();
    }
  }, []);

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is needed to select evidence photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Capture photo with camera
  const capturePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required for field photographic evidence.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Missing Field', 'Please provide a clear description of the observed incident.');
      return;
    }

    if (!coordinates) {
      Alert.alert('Missing Location', 'GPS location is required to map this threat.');
      return;
    }

    setSubmitting(true);

    const isOnline = await syncService.isConnected();

    if (isOnline) {
      try {
        const formData = new FormData();
        formData.append('incidentType', incidentType);
        formData.append('severity', severity);
        formData.append('description', description);
        formData.append('latitude', String(coordinates.latitude));
        formData.append('longitude', String(coordinates.longitude));
        if (patrolId) formData.append('patrolId', patrolId);

        if (imageUri) {
          formData.append('images', {
            uri: imageUri,
            name: `evidence_${Date.now()}.jpg`,
            type: 'image/jpeg',
          });
        }

        await api.post('/field-incidents', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        Alert.alert(
          'Incident Dispatched',
          'Field incident report submitted directly to Central Command.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } catch (err) {
        console.warn('Network upload failed, falling back to offline storage:', err.message);
        await saveOfflineFallback();
      } finally {
        setSubmitting(false);
      }
    } else {
      // Offline mode
      await saveOfflineFallback();
      setSubmitting(false);
    }
  };

  const saveOfflineFallback = async () => {
    try {
      await syncService.saveIncidentOffline({
        patrolId,
        incidentType,
        severity,
        description,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        localImageUri: imageUri,
      });

      Alert.alert(
        '💾 Incident Saved Offline',
        'No cellular link detected. This incident has been encrypted into your local offline queue and will automatically sync when connection returns.',
        [{ text: 'Acknowledged', onPress: () => navigation.goBack() }]
      );
    } catch (storageErr) {
      Alert.alert('Storage Error', 'Failed to store report locally: ' + storageErr.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Report Field Incident</Text>
        <Text style={styles.subTitle}>Tactical Observation Logging</Text>
      </View>

      {/* Incident Category Selection */}
      <Text style={styles.sectionTitle}>Incident Classification</Text>
      <View style={styles.typeGrid}>
        {INCIDENT_TYPES.map((type) => {
          const selected = incidentType === type.id;
          return (
            <TouchableOpacity
              key={type.id}
              style={[styles.typeButton, selected && styles.typeButtonSelected]}
              onPress={() => setIncidentType(type.id)}
            >
              <Text
                style={[styles.typeText, selected && styles.typeTextSelected]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Threat Severity Selector */}
      <Text style={styles.sectionTitle}>Threat Severity</Text>
      <View style={styles.severityRow}>
        {SEVERITY_LEVELS.map((sev) => {
          const selected = severity === sev.id;
          return (
            <TouchableOpacity
              key={sev.id}
              style={[
                styles.severityBtn,
                selected && { backgroundColor: sev.color, borderColor: sev.color },
              ]}
              onPress={() => setSeverity(sev.id)}
            >
              <Text
                style={[
                  styles.severityText,
                  selected && { color: '#ffffff', fontWeight: '800' },
                ]}
              >
                {sev.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* GPS Coordinates Badge */}
      <View style={styles.gpsCard}>
        <View style={styles.gpsRow}>
          <Text style={styles.gpsTitle}>📍 GPS Location</Text>
          {loadingLocation && <ActivityIndicator size="small" color="#10b981" />}
        </View>
        <Text style={styles.gpsCoords}>
          {coordinates
            ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
            : 'Acquiring satellite lock...'}
        </Text>
      </View>

      {/* Photographic Evidence Attachment */}
      <Text style={styles.sectionTitle}>Photographic Evidence</Text>
      <View style={styles.photoActions}>
        <TouchableOpacity style={styles.photoBtn} onPress={capturePhoto}>
          <Text style={styles.photoBtnText}>📸 Capture Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
          <Text style={styles.photoBtnText}>🖼️ Pick from Gallery</Text>
        </TouchableOpacity>
      </View>

      {imageUri && (
        <View style={styles.previewBox}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageBtn}
            onPress={() => setImageUri(null)}
          >
            <Text style={styles.removeImageText}>Remove Photo ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Description Field */}
      <Text style={styles.sectionTitle}>Field Notes & Context</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Detailed threat observations, animal condition, tracks, or suspect direction..."
        placeholderTextColor="#71717a"
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      {/* Submit Button */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitBtnText}>Submit Incident Report 🚀</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c120f',
    padding: 16,
  },
  header: {
    paddingTop: 36,
    paddingBottom: 16,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  subTitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeGrid: {
    gap: 8,
  },
  typeButton: {
    backgroundColor: '#161f1a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#24332b',
  },
  typeButtonSelected: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
  },
  typeText: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '600',
  },
  typeTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityBtn: {
    flex: 1,
    backgroundColor: '#161f1a',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#24332b',
  },
  severityText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  gpsCard: {
    backgroundColor: '#161f1a',
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#24332b',
  },
  gpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
  },
  gpsCoords: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  photoBtnText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
  previewBox: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#161f1a',
    borderWidth: 1,
    borderColor: '#24332b',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  removeImageBtn: {
    padding: 8,
    alignItems: 'center',
    backgroundColor: '#7f1d1d',
  },
  removeImageText: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#161f1a',
    borderRadius: 10,
    padding: 14,
    color: '#ffffff',
    borderColor: '#24332b',
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 90,
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#059669',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
