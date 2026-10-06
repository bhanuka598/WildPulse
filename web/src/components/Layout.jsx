import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/patrols', label: '🥾 Patrols' },
  { to: '/incidents', label: '🚨 Incidents' },
  { to: '/map', label: '🗺️ Wildlife Map' },
  { to: '/conflicts', label: '👥 Community Reports' },
  { to: '/alerts', label: '🔔 Alerts' },
  { to: '/analytics', label: '📈 Analytics' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-900 text-white p-4 space-y-2">
        <h2 className="text-xl font-bold mb-6">🛡️ WildPulse</h2>
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="block px-3 py-2 rounded hover:bg-gray-700">
            {l.label}
          </Link>
        ))}
        <div className="absolute bottom-4">
          <p className="text-sm mb-2">{user?.name} ({user?.role})</p>
          <button onClick={logout} className="text-red-400 underline text-sm">Logout</button>
        </div>
      </aside>
      <main className="flex-1 p-6 bg-gray-100">
        <Outlet />
      </main>
    </div>
  );
}