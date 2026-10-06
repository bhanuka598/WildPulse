import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState({ incidents: 0, patrols: 0, alerts: 0, conflicts: 0 });

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
        fetchCount('/alerts?unread=true'),
        fetchCount('/conflicts'),
      ]);

      setStats({ incidents, patrols, alerts, conflicts });
    })();
  }, []);

  const card = (label, value, color) => (
    <div className={`p-6 rounded shadow bg-${color}-100`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Operations Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        {card('Incidents', stats.incidents, 'red')}
        {card('Patrols', stats.patrols, 'green')}
        {card('Unread Alerts', stats.alerts, 'yellow')}
        {card('Community Reports', stats.conflicts, 'blue')}
      </div>
    </div>
  );
}