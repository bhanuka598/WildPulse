import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Operations Dashboard', icon: '📊' },
  { to: '/conflicts', label: 'Community Liaison Reports', icon: '👥' },
  { to: '/patrols', label: 'Patrol Monitoring', icon: '🥾' },
  { to: '/incidents', label: 'Field Incidents', icon: '🚨' },
  { to: '/map', label: 'Wildlife & Sensor Map', icon: '🛰️' },
  { to: '/alerts', label: 'Perimeter Alerts', icon: '🔔' },
  { to: '/sensors', label: 'Sensor Monitoring', icon: '📡' },
  { to: '/dispatches', label: 'Dispatch History', icon: '🚁' },
  { to: '/analytics', label: 'Conservation Analytics', icon: '📈' },
];

function isActive(pathname, to) {
  if (to === '/') return pathname === '/';
  if (to === '/map') return pathname === '/map' || pathname === '/wildlife-monitoring';
  if (to === '/alerts') return pathname === '/alerts' || pathname.startsWith('/alerts/') || pathname.startsWith('/wildlife-monitoring/alerts');
  if (to === '/sensors') return pathname === '/sensors' || pathname.startsWith('/wildlife-monitoring/sensors');
  if (to === '/dispatches') return pathname === '/dispatches' || pathname.startsWith('/wildlife-monitoring/dispatches');
  return pathname === to;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-stone-100 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-stone-900 via-emerald-950 to-stone-950 text-white flex flex-col justify-between border-r border-emerald-900/40 shadow-xl">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-emerald-900/50 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-xl shadow-lg shadow-emerald-900/50">
              🌿
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                WildPulse <span className="text-[10px] bg-emerald-700/80 text-emerald-200 px-1.5 py-0.5 rounded font-mono font-normal">v1.2</span>
              </h2>
              <p className="text-[11px] text-emerald-400 font-medium">Smart Wildlife Conservation</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Field Operations
            </p>
            {links.map((l) => {
              const active = isActive(location.pathname, l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 font-semibold'
                      : 'text-stone-300 hover:bg-emerald-900/40 hover:text-white'
                  }`}
                >
                  <span className="text-base">{l.icon}</span>
                  <span>{l.label}</span>
                </Link>
              );
            })}

            <div className="pt-4">
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Public Gateway
              </p>
              <a
                href="/report"
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-amber-300 bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/50 transition-all"
              >
                <span className="text-base">📢</span>
                <span className="flex-1">Community Report Form</span>
                <span className="text-xs">↗</span>
              </a>
            </div>
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-4 m-3 rounded-2xl bg-stone-900/80 border border-emerald-900/40 flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Authorized Officer'}</p>
              <p className="text-[10px] text-emerald-400 truncate">{user?.role || 'PARK_MANAGER'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-[11px] text-red-400 hover:text-red-300 px-2 py-1 hover:bg-red-950/40 rounded transition"
            title="Log Out"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-stone-200 px-8 flex items-center justify-between shadow-sm sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-stone-700 tracking-wide uppercase">
              Field Station Telemetry: Online & Synced
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-full border border-stone-200 font-mono">
              Protected Area: Yala & Wilpattu Buffer
            </span>
          </div>
        </header>

        {/* Dynamic page content */}
        <div className="p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}