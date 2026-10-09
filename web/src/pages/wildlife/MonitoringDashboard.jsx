import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import WildlifeMap from '../../components/wildlife/WildlifeMap';
import { coordLabel, when } from './format';
import { Badge, DemoBanner, EmptyState } from './Status';
import { playAlertTone, useWildlifeSocket } from '../../hooks/useWildlifeSocket';

const SCENARIOS = [
  ['A', 'Elephant crosses buffer'],
  ['B', 'Camera trap poaching'],
  ['C', 'Collar stops transmitting'],
  ['D', 'Animal leaves danger zone'],
  ['E', 'No nearby field unit'],
  ['F', 'Repeat collar fixes'],
];

function fetchDashboard(filters) {
  return Promise.all([
    api.get('/wildlife/overview'),
    api.get('/wildlife/animals', { params: { park: filters.park || undefined, species: filters.species || undefined, limit: 50 } }),
    api.get('/wildlife/sensors', { params: { status: filters.sensorStatus || undefined, limit: 50 } }),
    api.get('/wildlife/zones', { params: { park: filters.park || undefined } }),
    api.get('/wildlife/alerts', { params: { severity: filters.severity || undefined, status: filters.status || undefined, park: filters.park || undefined, species: filters.species || undefined, limit: 20 } }),
    api.get('/wildlife/dispatches', { params: { limit: 8 } }),
  ]).then(async ([overviewRes, animalRes, sensorRes, zoneRes, alertRes, dispatchRes]) => {
    let units;
    try {
      const unitRes = await api.get('/wildlife/response-units', {
        params: { longitude: 81.45, latitude: 6.4, radiusKm: 80, availability: 'ALL' },
      });
      units = (unitRes.data.units || []).map((row) => row.unit);
    } catch {
      units = [];
    }
    return {
      overview: overviewRes.data.overview,
      animals: animalRes.data.animals || [],
      sensors: sensorRes.data.sensors || [],
      zones: zoneRes.data.zones || [],
      alerts: alertRes.data.alerts || [],
      dispatches: dispatchRes.data.dispatches || [],
      telemetry: overviewRes.data.recentTelemetry || [],
      units,
    };
  });
}

function applyDashboard(data, setters) {
  setters.setOverview(data.overview);
  setters.setAnimals(data.animals);
  setters.setSensors(data.sensors);
  setters.setZones(data.zones);
  setters.setAlerts(data.alerts);
  setters.setDispatches(data.dispatches);
  setters.setTelemetry(data.telemetry);
  setters.setUnits(data.units);
  setters.setError('');
  setters.setLoading(false);
}

export default function MonitoringDashboard() {
  const { user } = useAuth();
  const canDemo = user?.role === 'PARK_MANAGER' || user?.role === 'ADMIN';
  const [overview, setOverview] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [units, setUnits] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [selectedId, setSelectedId] = useState('ELE-001');
  const [filters, setFilters] = useState({ park: 'Yala', species: '', severity: '', status: '', sensorStatus: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(localStorage.getItem('wildlife-alert-sound') === 'on');

const load = useCallback(() => {
  let cancelled = false;
  fetchDashboard(filters).then((data) => {
    if (cancelled) return;
    applyDashboard(data, { setOverview, setAnimals, setSensors, setZones, setAlerts, setDispatches, setTelemetry, setUnits, setError, setLoading });
  }).catch((err) => {
    if (!cancelled) {
      setError(err.response?.data?.message || 'Wildlife data could not be loaded. Check the API and sign in again.');
      setLoading(false);
    }
  });
  return () => {
    cancelled = true;
  };
}, [filters]);

useEffect(() => load(), [load]);

  useEffect(() => {
    if (!selectedId) return undefined;
    let cancelled = false;
    api.get(`/wildlife/animals/${selectedId}/telemetry`).then(({ data }) => {
      if (!cancelled) setTelemetry(data.telemetry || []);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useWildlifeSocket((event) => {
    if (event === 'wildlife:alert-created') {
      playAlertTone();
      setNotice('New simulated alert received.');
    }
    if (event === 'socket:connected') setNotice('Live channel reconnected. Refreshing.');
    load();
  });

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(async () => {
      try {
        await api.post('/wildlife/demo/playback', { action: 'tick' });
        load();
      } catch (err) {
        setError(err.response?.data?.message || 'Playback tick failed.');
        setPlaying(false);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [playing, load]);

  async function scenario(code) {
    setError('');
    try {
      await api.post(`/wildlife/demo/scenarios/${code}`);
      setNotice(`Scenario ${code} completed. Readings are DEMO / SIMULATED.`);
      if (code === 'A' || code === 'F') playAlertTone();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Scenario failed.');
    }
  }

  async function resetDemo() {
    setPlaying(false);
    try {
      await api.post('/wildlife/demo/playback', { action: 'pause' });
      await api.post('/wildlife/demo/reset');
      setNotice('Demo state reset to the Yala / Wilpattu sample.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Seed a manager and two rangers first.');
    }
  }

  const cards = [
    ['Tracked animals', overview?.trackedAnimals, '/map'],
    ['Active high-risk alerts', overview?.activeHighRiskAlerts, '/alerts'],
    ['Online sensors', overview?.onlineSensors, '/sensors'],
    ['Offline sensors', overview?.offlineSensors, '/sensors'],
    ['Camera trap detections', overview?.cameraTrapDetections, '/alerts'],
    ['Active dispatches', overview?.activeDispatches, '/dispatches'],
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-950 to-stone-900 rounded-3xl p-6 text-white">
        <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">Member 4 · Park manager</p>
        <h1 className="text-2xl md:text-3xl font-extrabold mt-1">Wildlife Monitoring Dashboard & Live Sensor Alerts</h1>
        <p className="text-sm text-stone-300 mt-2 max-w-3xl">Track collar positions, camera traps, and field response against protected and high-risk zones.</p>
      </div>
      <DemoBanner />
      {notice && <p className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-3 py-2">{notice}</p>}
      {error && <p className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-xl px-3 py-2">{error}</p>}

      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" onClick={() => { const next = !soundOn; setSoundOn(next); localStorage.setItem('wildlife-alert-sound', next ? 'on' : 'off'); }} className="px-3 py-1.5 rounded-full border border-stone-300 text-sm">
          Alert sound {soundOn ? 'on' : 'off'}
        </button>
        <button type="button" onClick={load} className="px-3 py-1.5 rounded-full border border-stone-300 text-sm">Refresh</button>
        {canDemo && (
          <>
            <button type="button" onClick={async () => { setPlaying(true); await api.post('/wildlife/demo/playback', { action: 'play' }); }} className="px-3 py-1.5 rounded-full bg-emerald-700 text-white text-sm">Play simulation</button>
            <button type="button" onClick={async () => { setPlaying(false); await api.post('/wildlife/demo/playback', { action: 'pause' }); }} className="px-3 py-1.5 rounded-full border border-stone-300 text-sm">Pause</button>
            <button type="button" onClick={resetDemo} className="px-3 py-1.5 rounded-full border border-amber-400 text-amber-900 text-sm">Reset demo</button>
            {SCENARIOS.map(([code, label]) => (
              <button key={code} type="button" onClick={() => scenario(code)} className="px-3 py-1.5 rounded-full bg-stone-900 text-white text-sm">
                {code}. {label}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {cards.map(([label, value, to]) => (
          <Link key={label} to={to} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm hover:border-emerald-400">
            <p className="text-[11px] uppercase tracking-wide text-stone-400">{label}</p>
            <p className="text-2xl font-black text-stone-900 mt-1">{loading ? '…' : value ?? 0}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <Select label="Protected area" value={filters.park} onChange={(park) => setFilters({ ...filters, park })} options={['', 'Yala', 'Wilpattu']} />
        <Select label="Species" value={filters.species} onChange={(species) => setFilters({ ...filters, species })} options={['', 'Asian Elephant', 'Sri Lankan Leopard']} />
        <Select label="Alert severity" value={filters.severity} onChange={(severity) => setFilters({ ...filters, severity })} options={['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']} />
        <Select label="Alert status" value={filters.status} onChange={(status) => setFilters({ ...filters, status })} options={['', 'NEW', 'ACKNOWLEDGED', 'RESPONSE_DISPATCHED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED']} />
        <Select label="Sensor status" value={filters.sensorStatus} onChange={(sensorStatus) => setFilters({ ...filters, sensorStatus })} options={['', 'ONLINE', 'OFFLINE', 'MAINTENANCE']} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-3xl border border-stone-200 p-4 shadow-sm">
          <h2 className="font-bold text-stone-900 mb-3">Interactive wildlife tracking map</h2>
          <WildlifeMap
            animals={animals}
            sensors={sensors}
            units={units}
            zones={zones}
            alerts={alerts}
            telemetry={telemetry}
            selectedAnimalId={selectedId}
            onSelectAnimal={(animal) => setSelectedId(animal.animalId)}
          />
        </div>
        <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-stone-900">Live alert feed</h2>
            <Link to="/alerts" className="text-sm text-emerald-700 font-semibold">Open center</Link>
          </div>
          {alerts.length === 0 && <EmptyState title="No alerts for this filter" body="Run scenario A or B after seeding the demo, or clear the filters." />}
          {alerts.slice(0, 6).map((alert) => (
            <Link key={alert.alertId} to={`/alerts/${alert.alertId}`} className="block border border-stone-200 rounded-2xl p-3 hover:border-emerald-400">
              <div className="flex justify-between gap-2"><span className="font-semibold text-sm">{alert.alertId}</span><Badge value={alert.severity} /></div>
              <p className="text-xs text-stone-500 mt-1">{alert.category} · {alert.animalCode || alert.sensorCode}</p>
              <p className="text-xs text-stone-500">{when(alert.detectedAt)} · {alert.status}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel title="Recent collar telemetry">
          {telemetry.length === 0 && <p className="text-sm text-stone-500">No fixes yet. Playback or scenario A records simulated points.</p>}
          {telemetry.slice(0, 6).map((row) => (
            <p key={row._id} className="text-sm border-b border-stone-100 py-2">
              {row.animalCode || row.sensorCode} · {coordLabel(row.coordinates)} · {when(row.recordedAt)}
              <span className="block text-[11px] text-amber-700">DEMO / SIMULATED</span>
            </p>
          ))}
        </Panel>
        <Panel title="Sensor connectivity">
          <p className="text-sm">Online {overview?.onlineSensors ?? 0} · Offline {overview?.offlineSensors ?? 0}</p>
          {sensors.slice(0, 6).map((sensor) => (
            <p key={sensor.sensorId} className="text-sm flex justify-between border-b border-stone-100 py-2">
              <span>{sensor.sensorId}</span>
              <Badge value={sensor.status} />
            </p>
          ))}
          <Link to="/sensors" className="text-sm text-emerald-700 font-semibold">Sensor monitoring</Link>
        </Panel>
        <Panel title="Field response activity">
          {dispatches.length === 0 && <p className="text-sm text-stone-500">No dispatch orders yet.</p>}
          {dispatches.map((row) => (
            <p key={row.dispatchId} className="text-sm border-b border-stone-100 py-2">
              {row.dispatchId} · {row.status}
              <span className="block text-xs text-stone-500">{row.assignedRanger?.name || 'Ranger'} · {when(row.dispatchedAt)}</span>
            </p>
          ))}
          <Link to="/dispatches" className="text-sm text-emerald-700 font-semibold">Dispatch history</Link>
        </Panel>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="text-xs text-stone-500">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-2 py-2 text-sm text-stone-800">
        {options.map((option) => <option key={option || 'all'} value={option}>{option || 'All'}</option>)}
      </select>
    </label>
  );
}

function Panel({ title, children }) {
  return (
    <section className="bg-white rounded-3xl border border-stone-200 p-4 shadow-sm space-y-2">
      <h2 className="font-bold text-stone-900">{title}</h2>
      {children}
    </section>
  );
}
