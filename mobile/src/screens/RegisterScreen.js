import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('RANGER');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Required Fields', 'Please fill in Name, Email, and Password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register({ name, email, phone, password, role });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please check network/credentials.';
      Alert.alert('Registration Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.headerArea}>
            <Text style={styles.badge}>🛡️ WILDPULSE FIELD APP</Text>
            <Text style={styles.title}>Register Field Personnel</Text>
            <Text style={styles.subtitle}>Wildlife Ranger & Field Officer Enrollment</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Official Email</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Operational Role</Text>
            <View style={styles.roleContainer}>
              {[
                { id: 'RANGER', label: 'Ranger' },
                { id: 'COMMUNITY_LIAISON_OFFICER', label: 'Liaison' },
                { id: 'PARK_MANAGER', label: 'Manager' },
              ].map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleBtn, role === r.id && styles.roleBtnActive]}
                  onPress={() => setRole(r.id)}
                >
                  <Text style={[styles.roleText, role === r.id && styles.roleTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Password (min 6 characters)</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Field Account →</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.switchText}>Already have an account? Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064e3b',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
  },
  subtitle: {
    fontSize: 11,
    color: '#78716c',
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#44403c',
    marginBottom: 4,
    marginTop: 10,
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
  roleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
  },
  roleBtnActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  roleText: {
    fontSize: 12,
    color: '#57534e',
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#047857',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  switchBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '600',
  },
});
