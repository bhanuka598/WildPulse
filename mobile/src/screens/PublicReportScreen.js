import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/client';

const CONFLICT_TYPES = [
  { id: 'CROP_RAIDING', label: 'Crop Raiding', icon: '🌾', desc: 'Wildlife destroying agricultural crops' },
  { id: 'SIGHTING', label: 'Elephant Sighting', icon: '🐘', desc: 'Elephant spotted near boundary / roads' },
  { id: 'WILD_ANIMAL_NEAR_VILLAGE', label: 'Animal Near Village', icon: '🐾', desc: 'Predator or wild animal near houses' },
  { id: 'LIVESTOCK_ATTACK', label: 'Livestock Attack', icon: '🐆', desc: 'Attacks on cattle or farm animals' },
  { id: 'PROPERTY_DAMAGE', label: 'Property Damage', icon: '🛖', desc: 'Damage to fences, buildings, or water tanks' },
  { id: 'HUMAN_INJURY', label: 'Human Injury (Urgent)', icon: '🚨', desc: 'Critical emergency assistance needed' },
  { id: 'OTHER', label: 'Other Incident', icon: '⚠️', desc: 'Other wildlife encounters or hazards' },
];

export default function PublicReportScreen({ navigation }) {
  const [step, setStep] = useState(1);

  // Form states
  const [conflictType, setConflictType] = useState('CROP_RAIDING');
  const [latitude, setLatitude] = useState(6.3721);
  const [longitude, setLongitude] = useState(81.5142);
  const [villageArea, setVillageArea] = useState('');
  const [nearbyLandmark, setNearbyLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [animalSpecies, setAnimalSpecies] = useState('Elephant');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [imageUri, setImageUri] = useState(null);

  // Status & states
  const [locating, setLocating] = useState(false);
  const [gpsAcquired, setGpsAcquired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);

  const detectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission was denied. You can manually enter the village name and coordinates.'
        );
        setLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(Number(loc.coords.latitude.toFixed(5)));
      setLongitude(Number(loc.coords.longitude.toFixed(5)));
      setGpsAcquired(true);
      Alert.alert('GPS Acquired', `Coordinates: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
    } catch (err) {
      Alert.alert('GPS Error', 'Could not obtain GPS fix. Please verify location services.');
    } finally {
      setLocating(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media gallery permission is needed to attach evidence.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is needed to take incident photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Camera error:', err);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Missing Field', 'Please enter a description of the wildlife incident.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('conflictType', conflictType);
      formData.append('latitude', String(latitude));
      formData.append('longitude', String(longitude));
      formData.append('villageArea', villageArea || 'Community Area');
      formData.append('nearbyLandmark', nearbyLandmark);
      formData.append('description', description);
      formData.append('animalSpecies', animalSpecies);
      formData.append('reporterName', reporterName || 'Community Villager');
      formData.append('reporterPhone', reporterPhone || '0770000000');
      formData.append('reporterType', 'COMMUNITY_MEMBER');

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'incident.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('image', {
          uri: imageUri,
          name: filename,
          type,
        });
      }

      const { data } = await api.post('/conflicts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSubmittedReport(data.conflict || data.data);
      setStep(4);
    } catch (err) {
      console.error(err);
      Alert.alert(
        'Submission Failed',
        err.response?.data?.message || 'Could not connect to WildPulse server. Please check your network and server IP.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerIcon}>🐘</Text>
          <View>
            <Text style={styles.headerTitle}>WildGuard Community</Text>
            <Text style={styles.headerSubtitle}>Public Wildlife Incident Report</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.closeBtnText}>Officer Login</Text>
        </TouchableOpacity>
      </View>

      {/* Step Indicator */}
      {step < 4 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepText}>Step {step} of 3</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(step / 3) * 100}%` }]} />
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* STEP 1: Select Type */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>What did you observe?</Text>
            <Text style={styles.sectionSub}>
              Select the incident category to immediately alert the right response team.
            </Text>

            <View style={styles.typeList}>
              {CONFLICT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeOption,
                    conflictType === t.id && styles.typeOptionActive,
                  ]}
                  onPress={() => setConflictType(t.id)}
                >
                  <Text style={styles.typeIcon}>{t.icon}</Text>
                  <View style={styles.typeContent}>
                    <Text
                      style={[
                        styles.typeLabel,
                        conflictType === t.id && styles.typeLabelActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                    <Text style={styles.typeDesc}>{t.desc}</Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      conflictType === t.id && styles.radioCircleActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setStep(2)}
            >
              <Text style={styles.primaryBtnText}>Continue to Location →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Incident Location */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Where did it happen?</Text>
            <Text style={styles.sectionSub}>
              Pinpoint the location so field rangers can navigate quickly.
            </Text>

            {/* GPS Detection Box */}
            <View style={styles.gpsBox}>
              <View>
                <Text style={styles.gpsTitle}>
                  {gpsAcquired ? '📍 GPS Fixed' : '📍 Auto GPS Detection'}
                </Text>
                <Text style={styles.gpsCoords}>
                  Lat: {latitude} | Long: {longitude}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.gpsBtn}
                onPress={detectLocation}
                disabled={locating}
              >
                {locating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.gpsBtnText}>📡 Fix GPS</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Village / Community Area *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Maduruwa Village, Boundary Sector 4"
                value={villageArea}
                onChangeText={setVillageArea}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Nearby Landmark</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Near old irrigation channel / banyan tree"
                value={nearbyLandmark}
                onChangeText={setNearbyLandmark}
              />
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setStep(1)}
              >
                <Text style={styles.secondaryBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtnFlex}
                onPress={() => {
                  if (!villageArea.trim()) {
                    Alert.alert('Required', 'Please enter the village or area name.');
                    return;
                  }
                  setStep(3);
                }}
              >
                <Text style={styles.primaryBtnText}>Continue →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: Details & Evidence */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Incident Details & Evidence</Text>
            <Text style={styles.sectionSub}>
              Provide descriptions and optional photos for ranger dispatch.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Species Observed</Text>
              <View style={styles.speciesRow}>
                {['Elephant', 'Leopard', 'Wild Boar', 'Other'].map((sp) => (
                  <TouchableOpacity
                    key={sp}
                    style={[
                      styles.speciesChip,
                      animalSpecies === sp && styles.speciesChipActive,
                    ]}
                    onPress={() => setAnimalSpecies(sp)}
                  >
                    <Text
                      style={[
                        styles.speciesChipText,
                        animalSpecies === sp && styles.speciesChipTextActive,
                      ]}
                    >
                      {sp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Describe what happened *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. 2 wild elephants broke through the paddy fence. Crops damaged, villagers making noise to keep them away."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Photo / Evidence */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Photo / Evidence (Optional)</Text>
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setImageUri(null)}
                  >
                    <Text style={styles.removeImageText}>Remove Photo ×</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.mediaButtonRow}>
                  <TouchableOpacity style={styles.mediaBtn} onPress={takePhoto}>
                    <Text style={styles.mediaBtnIcon}>📷</Text>
                    <Text style={styles.mediaBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mediaBtn} onPress={pickImage}>
                    <Text style={styles.mediaBtnIcon}>🖼️</Text>
                    <Text style={styles.mediaBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Your Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Nimal Gamage"
                value={reporterName}
                onChangeText={setReporterName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Contact Phone (For SMS alerts)</Text>
              <TextInput
                style={styles.input}
                placeholder="0771234567"
                value={reporterPhone}
                onChangeText={setReporterPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setStep(2)}
              >
                <Text style={styles.secondaryBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtnFlex, submitting && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Submit Report 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 4: Success Confirmation */}
        {step === 4 && submittedReport && (
          <View style={styles.card}>
            <View style={styles.successBadge}>
              <Text style={styles.successCheck}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Report Submitted Successfully!</Text>
            <Text style={styles.successDesc}>
              Your incident report has been received and routed to the Community Liaison Officer & field units.
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Report ID:</Text>
                <Text style={styles.summaryValueHighlight}>
                  {submittedReport.reportId || submittedReport._id}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Incident Type:</Text>
                <Text style={styles.summaryValue}>{submittedReport.conflictType}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Village Area:</Text>
                <Text style={styles.summaryValue}>{submittedReport.villageArea}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Status:</Text>
                <Text style={styles.summaryStatusBadge}>{submittedReport.status}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setStep(1);
                setDescription('');
                setImageUri(null);
                setSubmittedReport(null);
              }}
            >
              <Text style={styles.primaryBtnText}>Report Another Incident</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeLinkBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.homeLinkText}>Return to Staff Portal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064e3b',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#022c22',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#a7f3d0',
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  stepContainer: {
    backgroundColor: '#022c22',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  stepText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: '#78716c',
    marginBottom: 16,
    lineHeight: 16,
  },
  typeList: {
    gap: 8,
    marginBottom: 20,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    backgroundColor: '#f5f5f4',
  },
  typeOptionActive: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  typeContent: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#292524',
  },
  typeLabelActive: {
    color: '#065f46',
  },
  typeDesc: {
    fontSize: 11,
    color: '#78716c',
    marginTop: 2,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d6d3d1',
  },
  radioCircleActive: {
    borderColor: '#059669',
    backgroundColor: '#059669',
  },
  gpsBox: {
    backgroundColor: '#f5f5f4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gpsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1c1917',
  },
  gpsCoords: {
    fontSize: 11,
    color: '#78716c',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  gpsBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  gpsBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#44403c',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f5f4',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1c1917',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  speciesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speciesChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  speciesChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  speciesChipText: {
    fontSize: 12,
    color: '#57534e',
    fontWeight: '600',
  },
  speciesChipTextActive: {
    color: '#ffffff',
  },
  mediaButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaBtn: {
    flex: 1,
    backgroundColor: '#f5f5f4',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  mediaBtnIcon: {
    fontSize: 20,
  },
  mediaBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#44403c',
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  imagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  removeImageBtn: {
    marginTop: 6,
  },
  removeImageText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#57534e',
  },
  primaryBtnFlex: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  successBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  successCheck: {
    fontSize: 28,
    color: '#059669',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1917',
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 12,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#f5f5f4',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#78716c',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1c1917',
  },
  summaryValueHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  summaryStatusBadge: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  homeLinkBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  homeLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
});
