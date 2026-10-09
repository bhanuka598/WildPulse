import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState({ incidents: 0, patrols: 0, alerts: 0, conflicts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const fetchCount = async (url) => {
        try {
          const res = await api.get(url);
          return res.data?.count ?? 0;
        } catch {
          return 0;
        }
      };

      const [incidents, patrols, alerts, conflicts] = await Promise.all([
        fetchCount('/incidents'),
        fetchCount('/patrols'),
        fetchCount('/wildlife/alerts?status=NEW'),
        fetchCount('/conflicts'),
      ]);

      setStats({ incidents, patrols, alerts, conflicts });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-8">
      {/* Title & Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-stone-900 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="bg-emerald-700/60 text-emerald-200 border border-emerald-500/40 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-3">
            National Wildlife Protection Command
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Conservation Operations Center</h1>
          <p className="text-sm text-stone-300 mt-2 leading-relaxed">
            Real-time multi-sensor telemetry, field patrol tracking, and community conflict response coordination across protected sectors.
          </p>
        </div>
        <div className="absolute right-6 -bottom-6 text-9xl opacity-10 select-none pointer-events-none">
          🐾
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Community Reports */}
        <Link
          to="/conflicts"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl p-3 bg-amber-50 rounded-xl">📢</span>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              Liaison
            </span>
          </div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mt-4">
            Community Reports
          </p>
          <p className="text-3xl font-black text-stone-900 mt-1">
            {loading ? '...' : stats.conflicts}
          </p>
          <p className="text-xs text-emerald-600 mt-2 font-medium group-hover:underline">
            Manage conflicts & assign rangers →
          </p>
        </Link>

        {/* Card 2: Field Patrols */}
        <Link
          to="/patrols"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl p-3 bg-emerald-50 rounded-xl">🥾</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Field Ops
            </span>
          </div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mt-4">
            Active Patrols
          </p>
          <p className="text-3xl font-black text-stone-900 mt-1">
            {loading ? '...' : stats.patrols}
          </p>
          <p className="text-xs text-emerald-600 mt-2 font-medium group-hover:underline">
            View ranger routes & coverage →
          </p>
        </Link>

        {/* Card 3: Poaching / Field Incidents */}
        <Link
          to="/incidents"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-red-400 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl p-3 bg-red-50 rounded-xl">🚨</span>
            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
              Poaching/Snare
            </span>
          </div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mt-4">
            Field Incidents
          </p>
          <p className="text-3xl font-black text-stone-900 mt-1">
            {loading ? '...' : stats.incidents}
          </p>
          <p className="text-xs text-red-600 mt-2 font-medium group-hover:underline">
            Inspect verified incident log →
          </p>
        </Link>

        {/* Card 4: Perimeter & Sensor Alerts */}
        <Link
          to="/alerts"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-purple-400 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl p-3 bg-purple-50 rounded-xl">🔔</span>
            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
              Sensors
            </span>
          </div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mt-4">
            Unread Alerts
          </p>
          <p className="text-3xl font-black text-stone-900 mt-1">
            {loading ? '...' : stats.alerts}
          </p>
          <p className="text-xs text-purple-600 mt-2 font-medium group-hover:underline">
            Triage geofence breaches →
          </p>
        </Link>
      </div>

      {/* Quick Launch & Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-stone-100 pb-4">
            <h2 className="text-lg font-bold text-stone-900">System Telemetry & Fast Actions</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
              🛰️ Sensors Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/conflicts"
              className="p-4 rounded-2xl border border-stone-200 hover:border-emerald-500 bg-stone-50 hover:bg-white transition flex flex-col justify-between"
            >
              <div>
                <p className="font-bold text-stone-900">👥 Community Liaison Hub</p>
                <p className="text-xs text-stone-500 mt-1">
                  Assign available rangers to incoming elephant sightings, crop damage, and village reports.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 mt-3 block">
                Open Liaison Board →
              </span>
            </Link>

            <a
              href="/report"
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-2xl border border-stone-200 hover:border-amber-500 bg-stone-50 hover:bg-white transition flex flex-col justify-between"
            >
              <div>
                <p className="font-bold text-stone-900">📢 Public Incident Form</p>
                <p className="text-xs text-stone-500 mt-1">
                  Shareable link for villagers to submit wildlife incidents without authentication.
                </p>
              </div>
              <span className="text-xs font-bold text-amber-700 mt-3 block">
                Open Community Portal ↗
              </span>
            </a>
          </div>
        </div>

        {/* Protection Zone Status */}
        <div className="bg-stone-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-emerald-400">Tactical Status Summary</h2>
            <p className="text-xs text-stone-400 mt-1">WildPulse Mesh Network</p>

            <div className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between border-b border-stone-800 pb-2">
                <span className="text-stone-400">Encryption:</span>
                <span className="font-mono text-emerald-300">AES-256 Validated</span>
              </div>
              <div className="flex justify-between border-b border-stone-800 pb-2">
                <span className="text-stone-400">Offline SQLite Sync:</span>
                <span className="text-emerald-300">Supported</span>
              </div>
              <div className="flex justify-between border-b border-stone-800 pb-2">
                <span className="text-stone-400">Geofence Radius:</span>
                <span className="text-stone-200">500m Buffer</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Auto-Alert Trigger:</span>
                <span className="text-amber-300">Critical Conflicts</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-800 text-[11px] text-stone-500">
            WildPulse Monitoring Infrastructure · SLIIT CSSE
          </div>
        </div>
      </div>
    </div>
  );
}