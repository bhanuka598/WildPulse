import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'COMMUNITY_LIAISON_OFFICER',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
      });
      nav('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-950 p-4 py-12">
      <div className="w-full max-w-lg bg-stone-900/90 border border-emerald-900/60 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-emerald-950/60">
            🌿
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Officer Account</h1>
          <p className="text-xs text-emerald-400 mt-1">Register for WildPulse Conservation & Ops Access</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/60 border border-red-800 text-red-300 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full bg-stone-950/80 border border-emerald-900/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder=""
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
                Official Email
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full bg-stone-950/80 border border-emerald-900/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder=""
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
                Contact Phone
              </label>
              <input
                type="tel"
                name="phone"
                className="w-full bg-stone-950/80 border border-emerald-900/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder=""
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
              Assigned Operational Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full bg-stone-950/80 border border-emerald-900/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            >
              <option value="COMMUNITY_LIAISON_OFFICER">Community Liaison Officer</option>
              <option value="PARK_MANAGER">Park Manager</option>
              <option value="RANGER">Field Wildlife Ranger</option>
              <option value="ADMIN">System Administrator</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full bg-stone-950/80 border border-emerald-900/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                className="w-full bg-stone-950/80 border border-emerald-900/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="Repeat password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-900/40 text-sm transition-all disabled:opacity-50"
          >
            {submitting ? 'Creating Officer Account...' : 'Register & Enter Platform →'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-emerald-900/40 text-center">
          <p className="text-xs text-stone-400">
            Already have an active account?{' '}
            <Link to="/login" className="text-emerald-400 font-semibold hover:text-emerald-300 underline">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
