import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { coordLabel, when } from './format';
import { Badge, DemoBanner, EmptyState } from './Status';

export default function AlertCenter() {
  const [alerts, setAlerts] = useState([]);
  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/wildlife/alerts', { params: { q: q || undefined, severity: severity || undefined, status: status || undefined, category: category || undefined, limit: 50 } })
      .then(({ data }) => {
        if (!cancelled) {
          setAlerts(data.alerts || []);
          setError('');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Alerts could not be loaded.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [q, severity, status, category]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">Live alert management</h1>
        <p className="text-sm text-stone-500">Acknowledgement is separate from the field response status.</p>
      </div>
      <DemoBanner />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search alert, animal, or sensor" className="rounded-xl border border-stone-300 px-3 py-2 text-sm" />
        <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-2 text-sm">
          <option value="">All severities</option>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {['NEW', 'ACKNOWLEDGED', 'RESPONSE_DISPATCHED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-2 text-sm">
          <option value="">All categories</option>
          {['HIGH_RISK_BOUNDARY', 'CAMERA_TRAP_POACHING', 'SENSOR_OFFLINE', 'GPS_SIGNAL_LOST', 'WILDLIFE_PROXIMITY'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {loading && <p className="text-sm text-stone-500">Loading alerts…</p>}
      {!loading && alerts.length === 0 && <EmptyState title="No alerts match" body="Adjust the filters or run a demo scenario from the monitoring dashboard." />}
      <div className="overflow-x-auto bg-white border border-stone-200 rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr>
              {['Alert', 'Subject', 'Category', 'Severity', 'Detected', 'Location', 'Village km', 'Source', 'Acknowledged', 'Response', ''].map((heading) => (
                <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.alertId} className="border-t border-stone-100">
                <td className="px-3 py-2 font-semibold">{alert.alertId}</td>
                <td className="px-3 py-2">{alert.animalCode || alert.sensorCode}</td>
                <td className="px-3 py-2">{alert.category}</td>
                <td className="px-3 py-2"><Badge value={alert.severity} /></td>
                <td className="px-3 py-2">{when(alert.detectedAt)}</td>
                <td className="px-3 py-2">{coordLabel(alert.location)}</td>
                <td className="px-3 py-2">{alert.distanceToVillageKm ?? '—'}</td>
                <td className="px-3 py-2">{alert.sensorCode || 'collar'}</td>
                <td className="px-3 py-2">{alert.acknowledgedAt ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2"><Badge value={alert.status} /></td>
                <td className="px-3 py-2"><Link className="text-emerald-700 font-semibold" to={`/alerts/${alert.alertId}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
