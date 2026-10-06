import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState({ incidents: 0, patrols: 0, alerts: 0, conflicts: 0 });

  useEffect(() => {
    (async () => {
      const [i, p, a, c] = await Promise.all([
        api.get('/incidents'),
        api.get('/patrols'),
        api.get('/alerts?unread=true'),
        api.get('/conflicts'),
      ]);
      setStats({
        incidents: i.data.count,
        patrols: p.data.count,
        alerts: a.data.count,
        conflicts: c.data.count,
      });
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