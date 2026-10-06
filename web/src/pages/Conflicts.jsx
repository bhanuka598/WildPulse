import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Conflicts() {
  const [conflicts, setConflicts] = useState([]);
  const [rangers, setRangers] = useState([]);

  useEffect(() => {
    api.get('/conflicts').then(({ data }) => setConflicts(data.conflicts));
    // Assume backend has /auth/users?role=RANGER
    api.get('/auth/me').catch(() => {});
  }, []);

  const assign = async (id, rangerId) => {
    await api.put(`/conflicts/${id}/assign`, { rangerId });
    const { data } = await api.get('/conflicts');
    setConflicts(data.conflicts);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Community Reports</h1>
      <div className="space-y-3">
        {conflicts.map((c) => (
          <div key={c._id} className="bg-white p-4 rounded shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{c.conflictType}</p>
                <p className="text-sm">{c.description}</p>
                <p className="text-xs text-gray-500">
                  Reporter: {c.reporterName || 'Anonymous'} · {c.reporterPhone}
                </p>
                <p className="text-xs text-gray-400">
                  {c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)}
                </p>
                <span className="text-xs bg-blue-100 px-2 py-1 rounded mt-2 inline-block">
                  {c.status}
                </span>
              </div>
              {c.status === 'REPORTED' && (
                <button className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                  Assign Ranger
                </button>
              )}
            </div>
          </div>
        ))}
        {!conflicts.length && <p className="text-gray-500">No community reports yet</p>}
      </div>
    </div>
  );
}