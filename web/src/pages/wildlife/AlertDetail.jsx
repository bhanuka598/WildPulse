import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import DispatchModal from '../../components/wildlife/DispatchModal';
import WildlifeMap from '../../components/wildlife/WildlifeMap';
import { coordLabel, when } from './format';
import { Badge, DemoBanner } from './Status';

export default function AlertDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = user?.role === 'PARK_MANAGER' || user?.role === 'ADMIN';
  const [alert, setAlert] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError('');
    try {
      const [{ data }, auditRes] = await Promise.all([
        api.get(`/wildlife/alerts/${id}`),
        api.get(`/wildlife/alerts/${id}/audit`),
      ]);
      setAlert(data.alert);
      setTelemetry(data.telemetry || []);
      setAudit(auditRes.data.audit || []);
    } catch (err) {
      setError(err.response?.data?.message || 'This alert could not be opened.');
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/wildlife/alerts/${id}`),
      api.get(`/wildlife/alerts/${id}/audit`),
    ]).then(([detail, auditRes]) => {
      if (cancelled) return;
      setAlert(detail.data.alert);
      setTelemetry(detail.data.telemetry || []);
      setAudit(auditRes.data.audit || []);
      setError('');
    }).catch((err) => {
      if (!cancelled) setError(err.response?.data?.message || 'This alert could not be opened.');
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function acknowledge() {
    setBusy(true);
    try {
      await api.patch(`/wildlife/alerts/${id}/acknowledge`);
      setNotice('Alert acknowledged. Response status is unchanged until you dispatch.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Acknowledge failed.');
    } finally {
      setBusy(false);
    }
  }

  async function retreat() {
    setBusy(true);
    try {
      await api.patch(`/wildlife/alerts/${id}/resolve`, { reason: 'ANIMAL_RETREATED', notes: 'Manager resolved the alert because the animal left the danger zone before dispatch.' });
      setNotice('Resolved as Animal Retreated.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'This alert cannot be resolved as Animal Retreated.');
    } finally {
      setBusy(false);
    }
  }

  if (!alert && error) return <p className="text-red-700">{error}</p>;
  if (!alert) return <p className="text-stone-500">Loading alert…</p>;

  const animal = alert.animal && typeof alert.animal === 'object' ? alert.animal : null;
  const canRetreat = ['NEW', 'ACKNOWLEDGED'].includes(alert.status) && !alert.activeDispatch;
  const canDispatch = canManage && ['NEW', 'ACKNOWLEDGED'].includes(alert.status);
  const evidence = alert.evidence || {};

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/alerts" className="text-sm text-emerald-700 font-semibold">Back to alerts</Link>
          <h1 className="text-2xl font-extrabold text-stone-900 mt-1">{alert.alertId}</h1>
          <div className="flex gap-2 mt-2"><Badge value={alert.severity} /><Badge value={alert.status} /></div>
        </div>
      </div>
      <DemoBanner />
      {notice && <p className="text-sm bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{notice}</p>}
      {error && <p className="text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-white rounded-3xl border border-stone-200 p-5 space-y-2">
          <h2 className="font-bold">Animal diagnostics</h2>
          <Row label="Animal ID" value={animal?.animalId || alert.animalCode || 'Not attached'} />
          <Row label="Species" value={animal?.species || alert.species || 'Unknown'} />
          <Row label="Collar" value={animal?.collarId || alert.sensorCode || '—'} />
          <Row label="GPS" value={coordLabel(alert.location)} />
          <Row label="Speed" value={`${alert.movementSpeed || 0} km/h`} />
          <Row label="Distance to village" value={alert.distanceToVillageKm != null ? `${alert.distanceToVillageKm} km straight-line to ${alert.nearestVillage || 'nearest village'}` : 'Village distance unavailable'} />
          <Row label="Battery" value={alert.batteryLevel != null ? `${alert.batteryLevel}%` : 'Not reported'} />
          <Row label="Timestamp" value={when(alert.detectedAt)} />
        </section>
        <section className="bg-white rounded-3xl border border-stone-200 p-5 space-y-2">
          <h2 className="font-bold">Camera trap evidence</h2>
          {evidence.available ? (
            <>
              <img src={evidence.imageUrl} alt="Simulated camera trap frame, not a real capture" className="w-full rounded-xl border border-amber-300" />
              <Row label="Captured" value={when(evidence.capturedAt)} />
              <Row label="Camera" value={evidence.cameraId} />
              <Row label="Location" value={evidence.locationLabel} />
              <Row label="Detection" value={evidence.detectionCategory} />
              <p className="text-xs text-amber-800">This frame is a labeled simulation. It is not a photograph from the field.</p>
            </>
          ) : (
            <p className="text-sm text-stone-600">No camera evidence is attached to this alert. A missing image is not shown as a capture.</p>
          )}
        </section>
        <section className="bg-white rounded-3xl border border-stone-200 p-5 space-y-2">
          <h2 className="font-bold">Risk assessment</h2>
          <Row label="Threat" value={alert.threatClassification || '—'} />
          <Row label="Zone" value={alert.zoneName || 'Not a zone crossing'} />
          <Row label="Severity" value={alert.severity} />
          <Row label="Recommended action" value={alert.recommendedAction || '—'} />
          <Row label="Sensor reliability" value={alert.sensorReliability || 'SIMULATED'} />
        </section>
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || alert.status !== 'NEW'} onClick={acknowledge} className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold disabled:opacity-40">Acknowledge</button>
          <button type="button" disabled={busy || !canDispatch} onClick={() => setDispatchOpen(true)} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40">Dispatch Response</button>
          <button type="button" disabled={busy || !canRetreat} onClick={retreat} className="px-4 py-2 rounded-xl border border-stone-300 text-sm font-semibold disabled:opacity-40">Resolve – Animal Retreated</button>
          <button type="button" onClick={() => setShowMap((value) => !value)} className="px-4 py-2 rounded-xl border border-stone-300 text-sm font-semibold">View movement map</button>
          <button type="button" onClick={() => setShowHistory((value) => !value)} className="px-4 py-2 rounded-xl border border-stone-300 text-sm font-semibold">View history</button>
        </div>
      )}

      {showMap && (
        <WildlifeMap
          animals={animal ? [animal] : []}
          sensors={[]}
          units={[]}
          zones={[]}
          alerts={[alert]}
          telemetry={telemetry}
          selectedAnimalId={animal?.animalId}
        />
      )}
      {showHistory && (
        <section className="bg-white rounded-3xl border border-stone-200 p-5">
          <h2 className="font-bold mb-3">Audit history</h2>
          {audit.length === 0 && <p className="text-sm text-stone-500">No audit rows yet.</p>}
          <ul className="space-y-2 text-sm">
            {audit.map((row) => (
              <li key={row._id} className="border-b border-stone-100 pb-2">
                <span className="font-semibold">{row.action}</span> · {when(row.timestamp)}
                <span className="block text-stone-500">{row.previousState?.status || '—'} → {row.newState?.status || '—'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {dispatchOpen && (
        <DispatchModal
          alert={alert}
          onClose={() => setDispatchOpen(false)}
          onDispatched={() => {
            setDispatchOpen(false);
            setNotice('Dispatch saved. The assigned ranger can accept it on mobile.');
            load();
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <p className="text-sm">
      <span className="text-stone-400">{label}: </span>
      <span className="text-stone-800">{value}</span>
    </p>
  );
}
