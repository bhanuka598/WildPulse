import { useEffect, useState } from 'react';
import api from '../../api/client';
import { coordLabel } from '../../pages/wildlife/format';

export default function DispatchModal({ alert, onClose, onDispatched }) {
  const [step, setStep] = useState(1);
  const [radiusKm, setRadiusKm] = useState(15);
  const [units, setUnits] = useState([]);
  const [selected, setSelected] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey] = useState(() => (crypto.randomUUID ? crypto.randomUUID() : `dispatch-${Date.now()}`));

  const [lng, lat] = alert?.location?.coordinates || [];

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/wildlife/response-units', {
          params: { longitude: lng, latitude: lat, radiusKm },
        });
        if (!cancelled) setUnits(data.units || []);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load field units. Retry when the server is reachable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (Number.isFinite(lng) && Number.isFinite(lat)) load();
    return () => {
      cancelled = true;
    };
  }, [lng, lat, radiusKm]);

  async function confirm() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(
        '/wildlife/dispatches',
        { alertId: alert.alertId, unitId: selected, officerNotes: notes, idempotencyKey },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      if (!data?.success || !data.dispatch) {
        throw new Error('The server did not confirm the dispatch.');
      }
      onDispatched(data.dispatch);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Dispatch was not saved.');
    } finally {
      setLoading(false);
    }
  }

  const chosen = units.find((row) => row.unit.unitId === selected);

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/50 flex items-center justify-center p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispatch-title"
        className="bg-white w-full max-w-2xl rounded-3xl shadow-xl border border-stone-200 max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Step {step} of 3</p>
            <h2 id="dispatch-title" className="text-xl font-bold text-stone-900">Dispatch Field Response Patrol</h2>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-stone-500 hover:text-stone-800">Close</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          {step === 1 && (
            <>
              <p className="text-sm text-stone-600">
                Available units within {radiusKm} km. Distances are straight-line. Road travel time is not estimated.
              </p>
              {loading && <p className="text-sm text-stone-500">Loading units…</p>}
              {!loading && units.length === 0 && (
                <div className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-600">
                  No available unit inside this radius.
                  <button
                    type="button"
                    className="ml-3 text-emerald-800 font-semibold underline"
                    onClick={() => setRadiusKm((value) => (value < 40 ? 40 : 80))}
                  >
                    Expand search radius
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {units.map((row) => (
                  <label key={row.unit.unitId} className="flex gap-3 items-start border border-stone-200 rounded-2xl p-3 cursor-pointer hover:border-emerald-400">
                    <input
                      type="radio"
                      name="unit"
                      value={row.unit.unitId}
                      checked={selected === row.unit.unitId}
                      onChange={() => setSelected(row.unit.unitId)}
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-stone-900">{row.unit.name}</span>
                      <span className="block text-stone-500">
                        {row.unit.unitId} · {row.unit.unitType} · {row.unit.availability}
                      </span>
                      <span className="block text-stone-500">
                        Ranger {row.unit.assignedRanger?.name || 'Unassigned'} · {coordLabel(row.unit.currentLocation)}
                      </span>
                      <span className="block text-stone-700">{row.distanceKm} km straight-line · updated {new Date(row.unit.lastUpdatedAt).toLocaleString()}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <button type="button" disabled={!selected} onClick={() => setStep(2)} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40">
                  Continue
                </button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <Directive label="Target location" value={coordLabel(alert.location)} />
              <Directive label="Response priority" value={alert.severity} />
              <Directive label="Animal / species warning" value={`${alert.species || 'Unknown species'} ${alert.animalCode || alert.sensorCode || ''}`} />
              <Directive label="Safety instructions" value="Approach from the protected-area side. Do not crowd the animal. Confirm radio contact before closing distance." />
              <Directive label="Communication" value="Report acknowledgement, arrival, and completion on this dispatch." />
              <label className="block text-sm">
                <span className="font-semibold text-stone-800">Officer notes</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2" />
              </label>
              <div className="flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="text-sm text-stone-600">Back</button>
                <button type="button" onClick={() => setStep(3)} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold">Review</button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <Directive label="Alert ID" value={alert.alertId} />
              <Directive label="Selected unit" value={chosen ? `${chosen.unit.name} (${chosen.unit.unitId})` : selected} />
              <Directive label="Priority" value={alert.severity} />
              <Directive label="Destination" value={coordLabel(alert.location)} />
              <Directive label="Dispatch timestamp" value="Set by the server when the order is saved" />
              <div className="flex justify-between">
                <button type="button" onClick={() => setStep(2)} className="text-sm text-stone-600">Back</button>
                <button type="button" disabled={loading} onClick={confirm} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
                  {loading ? 'Transmitting…' : 'Confirm & Transmit Dispatch Order'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Directive({ label, value }) {
  return (
    <div className="text-sm">
      <p className="text-[11px] uppercase tracking-wide text-stone-400">{label}</p>
      <p className="text-stone-800">{value}</p>
    </div>
  );
}
