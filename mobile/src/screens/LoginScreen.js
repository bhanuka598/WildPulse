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
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check network or credentials.';
      Alert.alert('Authentication Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.headerArea}>
          <Text style={styles.badge}>🛡️ WILDPULSE</Text>
          <Text style={styles.title}>WildPulse Ranger App</Text>
          <Text style={styles.subtitle}>Mobile Field Operations & Conflict Dispatch</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.passwordRow}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder=""
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In to Field Station →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.switchText}>New Officer? Create Field Account</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.publicReportBtn}
            onPress={() => navigation.navigate('PublicReport')}
          >
            <Text style={styles.publicReportBtnIcon}>📢</Text>
            <View style={styles.publicReportBtnTextContainer}>
              <Text style={styles.publicReportBtnTitle}>Community Wildlife Incident</Text>
              <Text style={styles.publicReportBtnSub}>Report animal sighting / crop raiding without login →</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064e3b',
    justifyContent: 'center',
    padding: 20,
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
    marginBottom: 24,
  },
  badge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c1917',
  },
  subtitle: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#44403c',
    marginBottom: 6,
    marginTop: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 12,
  },
  forgotText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
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
  button: {
    backgroundColor: '#047857',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
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
  divider: {
    height: 1,
    backgroundColor: '#e7e5e4',
    marginVertical: 18,
  },
  publicReportBtn: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  publicReportBtnIcon: {
    fontSize: 24,
  },
  publicReportBtnTextContainer: {
    flex: 1,
  },
  publicReportBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
  },
  publicReportBtnSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
});
