import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      nav('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-950 p-4">
      <div className="w-full max-w-md bg-stone-900/90 border border-emerald-900/60 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-emerald-950/60">
            🌿
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">WildPulse Station</h1>
          <p className="text-xs text-emerald-400 mt-1">Smart Wildlife Conservation & Anti-Poaching System</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/60 border border-red-800 text-red-300 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
              Officer Email
            </label>
            <input
              type="email"
              required
              className="w-full bg-stone-950/80 border border-emerald-900/60 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder=""
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              className="w-full bg-stone-950/80 border border-emerald-900/60 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder=""
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-900/40 text-sm transition-all disabled:opacity-50"
          >
            {submitting ? 'Authenticating...' : 'Sign In to Operations Console →'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-emerald-900/40 text-center">
          <p className="text-xs text-stone-400">
            Need a new officer account?{' '}
            <Link to="/register" className="text-emerald-400 font-semibold hover:text-emerald-300 underline">
              Create an account
            </Link>
          </p>
          <div className="mt-4 pt-4 border-t border-emerald-900/30">
            <p className="text-xs text-stone-400">
              Villager or community member reporting a wildlife incident?
            </p>
            <Link
              to="/report"
              className="inline-block mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
            >
              Access Public Community Report Portal (No Login Required) →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}