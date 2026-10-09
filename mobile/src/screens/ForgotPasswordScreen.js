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
import api from '../api/client';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify & Reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');

  const handleRequestOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Required Field', 'Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      Alert.alert('Code Sent', data.message || 'OTP has been dispatched to your email.');
      if (data.otp) {
        setDevOtpHint(`Dev Mode OTP: ${data.otp}`);
      }
      setStep(2);
    } catch (err) {
      Alert.alert('Request Failed', err.response?.data?.message || 'Failed to dispatch OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim() || !newPassword) {
      Alert.alert('Required Fields', 'Please enter the 6-digit OTP and new password.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });

      Alert.alert('Success', data.message || 'Password successfully updated!', [
        { text: 'Go to Login', onPress: () => navigation.navigate('Login') },
      ]);
      setStep(3);
    } catch (err) {
      Alert.alert('Reset Failed', err.response?.data?.message || 'Invalid or expired OTP.');
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
            <Text style={styles.badge}>🛡️ WILDGUARD SECURITY</Text>
            <Text style={styles.title}>Password Recovery</Text>
            <Text style={styles.subtitle}>Email Verification via 6-Digit OTP</Text>
          </View>

          {devOtpHint ? (
            <View style={styles.devHintBox}>
              <Text style={styles.devHintText}>💡 {devOtpHint}</Text>
            </View>
          ) : null}

          {/* STEP 1: Request OTP */}
          {step === 1 && (
            <View style={styles.form}>
              <Text style={styles.infoText}>
                Enter your registered officer email address. A one-time verification passcode will be sent.
              </Text>

              <Text style={styles.label}>Official Email</Text>
              <TextInput
                style={styles.input}
                placeholder="ranger@wildpulse.org"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRequestOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP Code →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchBtn}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.switchText}>Remembered password? Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: Verify OTP & New Password */}
          {step === 2 && (
            <View style={styles.form}>
              <Text style={styles.infoText}>
                Enter the 6-digit OTP code received at <Text style={styles.boldText}>{email}</Text> and choose a new password.
              </Text>

              <Text style={styles.label}>Verification OTP</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="123456"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />

              <Text style={styles.label}>New Password (min 6 chars)</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />

              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP & Reset Password ✓</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchBtn}
                onPress={() => setStep(1)}
              >
                <Text style={styles.switchText}>← Re-enter email address</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: Complete */}
          {step === 3 && (
            <View style={styles.successArea}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>Password Reset Complete</Text>
              <Text style={styles.successDesc}>
                Your password has been securely updated. You can now log into your field station.
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.buttonText}>Sign In Now →</Text>
              </TouchableOpacity>
            </View>
          )}
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
  devHintBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  devHintText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  infoText: {
    fontSize: 12,
    color: '#57534e',
    lineHeight: 17,
    marginBottom: 10,
  },
  boldText: {
    fontWeight: '700',
    color: '#047857',
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
  otpInput: {
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 6,
    fontWeight: '700',
    color: '#047857',
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
    fontSize: 12,
    fontWeight: '600',
  },
  successArea: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    fontSize: 36,
    color: '#047857',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 4,
  },
  successDesc: {
    fontSize: 12,
    color: '#78716c',
    textAlign: 'center',
    marginBottom: 16,
  },
});
