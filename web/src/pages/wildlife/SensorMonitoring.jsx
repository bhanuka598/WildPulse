import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { coordLabel, when } from './format';
import { Badge, DemoBanner, EmptyState } from './Status';

export default function SensorMonitoring() {
  const { user } = useAuth();
  const canDemo = user?.role === 'PARK_MANAGER' || user?.role === 'ADMIN';
  const [sensors, setSensors] = useState([]);
  const [status, setStatus] = useState('');
  const [sensorType, setSensorType] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      const { data } = await api.get('/wildlife/sensors', { params: { status: status || undefined, sensorType: sensorType || undefined, limit: 50 } });
      setSensors(data.sensors || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Sensors could not be loaded.');
    }
  }

  useEffect(() => {
    let cancelled = false;
    api.get('/wildlife/sensors', { params: { status: status || undefined, sensorType: sensorType || undefined, limit: 50 } })
      .then(({ data }) => {
        if (!cancelled) {
          setSensors(data.sensors || []);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Sensors could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, [status, sensorType]);

  async function openSensor(sensorId) {
    const { data } = await api.get(`/wildlife/sensors/${sensorId}`);
    setSelected(data);
  }

  async function simulate(sensorId, nextStatus) {
    setError('');
    try {
      await api.post(`/wildlife/demo/sensors/${sensorId}/status`, { status: nextStatus });
      setNotice(nextStatus === 'OFFLINE' ? `${sensorId} marked offline with a maintenance warning. DEMO / SIMULATED.` : `${sensorId} heartbeat restored. DEMO / SIMULATED.`);
      await load();
      await openSensor(sensorId);
    } catch (err) {
      setError(err.response?.data?.message || 'Sensor simulation failed.');
    }
  }

  const collars = sensors.filter((sensor) => sensor.sensorType === 'GPS_COLLAR');
  const cameras = sensors.filter((sensor) => sensor.sensorType === 'CAMERA_TRAP');

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-stone-900">Sensor monitoring</h1>
      <DemoBanner />
      {notice && <p className="text-sm bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{notice}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <select value={sensorType} onChange={(event) => setSensorType(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="GPS_COLLAR">GPS collars</option>
          <option value="CAMERA_TRAP">Camera traps</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option>ONLINE</option>
          <option>OFFLINE</option>
          <option>MAINTENANCE</option>
        </select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SensorTable title="GPS collars" rows={collars} onOpen={openSensor} />
        <SensorTable title="Camera traps" rows={cameras} onOpen={openSensor} />
      </div>
      {selected && (
        <section className="bg-white rounded-3xl border border-stone-200 p-5 space-y-2">
          <h2 className="font-bold">{selected.sensor.sensorId}</h2>
          <p className="text-sm">Type {selected.sensor.sensorType} · <Badge value={selected.sensor.status} /></p>
          <p className="text-sm">Last heartbeat {when(selected.sensor.lastHeartbeatAt)}</p>
          <p className="text-sm">Battery {selected.sensor.batteryLevel ?? '—'}% · GPS signal quality {selected.sensor.signalStrength ?? '—'}%</p>
          <p className="text-sm">Last transmission {when(selected.telemetry?.[0]?.recordedAt)}</p>
          <p className="text-sm">Location {coordLabel(selected.sensor.location)}</p>
          {selected.sensor.maintenanceWarning && <p className="text-sm bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{selected.sensor.maintenanceWarning}</p>}
          {canDemo && (
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => simulate(selected.sensor.sensorId, 'OFFLINE')} className="px-3 py-2 rounded-xl bg-red-700 text-white text-sm">Simulate offline</button>
              <button type="button" onClick={() => simulate(selected.sensor.sensorId, 'ONLINE')} className="px-3 py-2 rounded-xl border border-stone-300 text-sm">Restore heartbeat</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SensorTable({ title, rows, onOpen }) {
  return (
    <section className="bg-white rounded-3xl border border-stone-200 p-4">
      <h2 className="font-bold mb-2">{title}</h2>
      {rows.length === 0 && <EmptyState title="None in this filter" body="Change the status or type filter." />}
      <ul className="divide-y divide-stone-100">
        {rows.map((sensor) => (
          <li key={sensor.sensorId}>
            <button type="button" onClick={() => onOpen(sensor.sensorId)} className="w-full text-left py-2 text-sm hover:bg-stone-50">
              <span className="font-semibold">{sensor.sensorId}</span> · {sensor.animal?.animalId || sensor.animalCode || 'Unassigned'}
              <span className="float-right"><Badge value={sensor.status} /></span>
              <span className="block text-xs text-stone-500">Heartbeat {when(sensor.lastHeartbeatAt)} · battery {sensor.batteryLevel ?? '—'}%</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
