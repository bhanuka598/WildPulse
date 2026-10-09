import { useEffect, useState } from 'react';
import api from '../../api/client';
import { coordLabel, when } from './format';
import { Badge, DemoBanner, EmptyState } from './Status';

export default function DispatchHistory() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get('/wildlife/dispatches', { params: { status: status || undefined, limit: 50 } })
      .then(({ data }) => setRows(data.dispatches || []))
      .catch((err) => setError(err.response?.data?.message || 'Dispatch history could not be loaded.'));
  }, [status]);

  async function openRow(id) {
    try {
      const { data } = await api.get(`/wildlife/dispatches/${id}`);
      setSelected(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Dispatch detail could not be opened.');
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-stone-900">Dispatch history</h1>
      <DemoBanner />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-2 text-sm">
        <option value="">All statuses</option>
        {['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((item) => <option key={item}>{item}</option>)}
      </select>
      {rows.length === 0 && <EmptyState title="No dispatch orders" body="Dispatch a unit from an open alert to create the first record." />}
      <div className="overflow-x-auto bg-white border border-stone-200 rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr>
              {['Dispatch', 'Alert', 'Ranger', 'Dispatched', 'Accepted', 'Status', 'Completed', ''].map((heading) => (
                <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.dispatchId} className="border-t border-stone-100">
                <td className="px-3 py-2 font-semibold">{row.dispatchId}</td>
                <td className="px-3 py-2">{row.alert?.alertId || '—'}</td>
                <td className="px-3 py-2">{row.assignedRanger?.name || '—'}</td>
                <td className="px-3 py-2">{when(row.dispatchedAt)}</td>
                <td className="px-3 py-2">{when(row.acceptedAt)}</td>
                <td className="px-3 py-2"><Badge value={row.status} /></td>
                <td className="px-3 py-2">{when(row.completedAt)}</td>
                <td className="px-3 py-2"><button type="button" className="text-emerald-700 font-semibold" onClick={() => openRow(row.dispatchId)}>Open</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <section className="bg-white rounded-3xl border border-stone-200 p-5 space-y-2">
          <h2 className="font-bold">{selected.dispatch.dispatchId}</h2>
          <p className="text-sm">Notes: {selected.dispatch.responseNotes || 'None yet'}</p>
          <p className="text-sm">Outcome: {selected.dispatch.outcome || 'Pending'}</p>
          <p className="text-sm">Target {coordLabel(selected.dispatch.targetLocation)} · {selected.dispatch.distanceKm} km straight-line</p>
          <h3 className="font-semibold pt-2">Response history</h3>
          <ul className="text-sm space-y-1">
            {(selected.dispatch.history || []).map((item, index) => (
              <li key={`${item.status}-${index}`}>{when(item.at)} · {item.status} · {item.note || '—'}</li>
            ))}
          </ul>
          <h3 className="font-semibold pt-2">Audit</h3>
          <ul className="text-sm space-y-1">
            {(selected.audit || []).map((row) => (
              <li key={row._id}>{when(row.timestamp)} · {row.action}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
