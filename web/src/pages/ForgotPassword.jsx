import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify OTP & Reset Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSuccessMsg(data.message || 'Verification code sent to your email.');
      if (data.otp) {
        setDevOtpHint(`Development Mode OTP: ${data.otp}`);
      }
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code. Please check email address.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and set new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email,
        otp: otp.trim(),
        newPassword,
      });

      setSuccessMsg(data.message || 'Password successfully updated!');
      setStep(3); // Success step
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-950 p-4">
      <div className="w-full max-w-md bg-stone-900/90 border border-emerald-900/60 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-emerald-950/60">
            🔐
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Password Recovery</h1>
          <p className="text-xs text-emerald-400 mt-1">Verify Email via One-Time Passcode (OTP)</p>
        </div>

        {error && (
          <div className="mb-5 bg-red-950/60 border border-red-800 text-red-300 text-xs px-4 py-3 rounded-xl flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold ml-2">×</button>
          </div>
        )}

        {successMsg && step !== 3 && (
          <div className="mb-5 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs px-4 py-3 rounded-xl">
            {successMsg}
          </div>
        )}

        {devOtpHint && step === 2 && (
          <div className="mb-5 bg-amber-950/60 border border-amber-800 text-amber-300 text-xs px-4 py-2.5 rounded-xl font-mono text-center">
            💡 {devOtpHint}
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-xs text-stone-300 leading-relaxed">
              Enter your registered officer email address. We will transmit a 6-digit verification code to reset your access credentials.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
                Officer Email
              </label>
              <input
                type="email"
                required
                className="w-full bg-stone-950/80 border border-emerald-900/60 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="officer@wildpulse.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-900/40 text-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Sending Verification Code...' : 'Send OTP Code →'}
            </button>
          </form>
        )}

        {/* STEP 2: Verify OTP & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-400">Verifying code for:</span>
              <span className="text-emerald-300 font-mono font-medium">{email}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
                6-Digit Verification OTP
              </label>
              <input
                type="text"
                maxLength={6}
                required
                className="w-full bg-stone-950/80 border border-emerald-900/60 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-emerald-400 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <input
                type="password"
                required
                className="w-full bg-stone-950/80 border border-emerald-900/60 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                className="w-full bg-stone-950/80 border border-emerald-900/60 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 text-xs text-stone-400 hover:text-stone-200 border border-stone-800 rounded-xl transition"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-900/40 text-sm transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Reset & Save Password ✓'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-900/50 text-emerald-400 border border-emerald-700 rounded-full flex items-center justify-center text-3xl mx-auto mb-2">
              ✓
            </div>
            <h2 className="text-xl font-bold text-white">Password Updated!</h2>
            <p className="text-xs text-stone-300 leading-relaxed">
              Your security credentials have been successfully updated. You can now log in to the field station with your new password.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg text-sm transition"
            >
              Sign In with New Password →
            </button>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-emerald-900/40 text-center">
          <Link to="/login" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            Remembered your credentials? Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
