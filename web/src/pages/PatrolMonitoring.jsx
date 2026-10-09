import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/client';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons in React
const rangerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function PatrolMonitoring() {
  const [patrols, setPatrols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPatrol, setSelectedPatrol] = useState(null);

  const fetchPatrols = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const { data } = await api.get('/patrols', { params });
      setPatrols(data.patrols || []);
      if (data.patrols?.length > 0 && !selectedPatrol) {
        setSelectedPatrol(data.patrols[0]);
      }
    } catch (err) {
      console.error('Error fetching patrols:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatrols();
  }, [statusFilter]);

  // Selected patrol waypoints polyline coords
  const polylinePositions =
    selectedPatrol?.waypoints
      ?.filter((wp) => wp.latitude && wp.longitude)
      .map((wp) => [wp.latitude, wp.longitude]) || [];

  // Default center: First waypoint or Yala / buffer zone coordinates
  const defaultCenter =
    polylinePositions.length > 0
      ? polylinePositions[0]
      : [6.368, 81.52];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥾</span>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">
              Patrol Surveillance & GPS Monitoring
            </h1>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Real-time ranger circuits, GPS track logs, and surveillance coverage metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_PROGRESS">Active Now (IN_PROGRESS)</option>
            <option value="COMPLETED">Completed</option>
            <option value="ASSIGNED">Assigned / Queued</option>
          </select>
          <button
            onClick={fetchPatrols}
            className="px-4 py-2.5 bg-emerald-700 text-white font-semibold rounded-xl text-sm hover:bg-emerald-800 transition flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Map + Detail Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Map Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[520px]">
          <div className="p-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                Live Tactical Route Visualization
              </span>
            </div>
            {selectedPatrol && (
              <span className="text-xs bg-emerald-950 text-emerald-300 px-3 py-1 rounded-full border border-emerald-800 font-mono">
                {selectedPatrol.routeName} ({selectedPatrol.distanceKm} km)
              </span>
            )}
          </div>

          <div className="flex-1 w-full relative z-0">
            {polylinePositions.length > 0 ? (
              <MapContainer
                key={selectedPatrol?._id || 'map'}
                center={defaultCenter}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Draw Route Polyline */}
                <Polyline
                  positions={polylinePositions}
                  color="#059669"
                  weight={5}
                  opacity={0.85}
                  dashArray="2, 6"
                />

                {/* Start Marker */}
                <Marker position={polylinePositions[0]} icon={startIcon}>
                  <Popup>
                    <div className="text-xs">
                      <p className="font-bold text-stone-900">Start Point</p>
                      <p className="text-stone-500">
                        {new Date(selectedPatrol.waypoints[0].timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* Current / Latest Waypoint Marker */}
                <Marker
                  position={polylinePositions[polylinePositions.length - 1]}
                  icon={rangerIcon}
                >
                  <Popup>
                    <div className="text-xs">
                      <p className="font-bold text-emerald-700">Ranger Position</p>
                      <p className="text-stone-700 font-medium">
                        Ranger: {selectedPatrol.rangerId?.name || 'Assigned Ranger'}
                      </p>
                      <p className="text-stone-500">
                        {new Date(
                          selectedPatrol.waypoints[selectedPatrol.waypoints.length - 1].timestamp
                        ).toLocaleTimeString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-stone-50">
                <span className="text-4xl mb-2">🛰️</span>
                <p className="text-stone-700 font-bold">No GPS Coordinates Logged Yet</p>
                <p className="text-stone-500 text-xs max-w-sm mt-1">
                  Select a patrol from the list below with recorded waypoints, or initiate breadcrumbs from the mobile app.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Patrol Detail Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
              Route Telemetry Overview
            </h2>

            {selectedPatrol ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-stone-900">{selectedPatrol.routeName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        selectedPatrol.status === 'IN_PROGRESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedPatrol.status === 'COMPLETED'
                          ? 'bg-stone-100 text-stone-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedPatrol.status}
                    </span>
                    <span className="text-xs text-stone-400 font-mono">
                      ID: {selectedPatrol._id.slice(-6)}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl space-y-2 border border-stone-200/60">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Assigned Officer:</span>
                    <span className="font-bold text-stone-800">
                      {selectedPatrol.rangerId?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Official Email:</span>
                    <span className="font-mono text-stone-700">
                      {selectedPatrol.rangerId?.email || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Contact Phone:</span>
                    <span className="font-mono text-stone-700">
                      {selectedPatrol.rangerId?.phone || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-[11px] font-bold text-emerald-800 block">DISTANCE</span>
                    <span className="text-xl font-black text-emerald-900">
                      {selectedPatrol.distanceKm} <span className="text-xs font-normal">km</span>
                    </span>
                  </div>
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center">
                    <span className="text-[11px] font-bold text-stone-600 block">WAYPOINTS</span>
                    <span className="text-xl font-black text-stone-800">
                      {selectedPatrol.waypoints?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
                  <p>
                    <strong className="text-stone-700">Start Time:</strong>{' '}
                    {selectedPatrol.startTime
                      ? new Date(selectedPatrol.startTime).toLocaleString()
                      : 'Pending'}
                  </p>
                  <p>
                    <strong className="text-stone-700">End Time:</strong>{' '}
                    {selectedPatrol.endTime
                      ? new Date(selectedPatrol.endTime).toLocaleString()
                      : 'In progress / Active'}
                  </p>
                  {selectedPatrol.notes && (
                    <div className="mt-2 p-3 bg-stone-50 rounded-lg border border-stone-200">
                      <p className="text-[11px] font-bold text-stone-500 uppercase">Field Notes:</p>
                      <p className="text-xs text-stone-700 mt-1 italic">
                        "{selectedPatrol.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-stone-400 italic">Select a patrol to view its trajectory telemetry.</p>
            )}
          </div>
        </div>
      </div>

      {/* Patrol History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-200 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-stone-900">Surveillance Patrol Roster</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Comprehensive log of field circuits, logged waypoints, and completed itineraries.
            </p>
          </div>
          <span className="text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-full font-mono font-bold">
            Total: {patrols.length}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-500 text-sm">
            Loading patrol telemetry records...
          </div>
        ) : patrols.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm">
            No patrol records matching current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Route Name</th>
                  <th className="py-3 px-4">Ranger Officer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Start Time</th>
                  <th className="py-3 px-4">End Time</th>
                  <th className="py-3 px-4 text-right">Distance (km)</th>
                  <th className="py-3 px-4 text-center">Waypoints</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {patrols.map((p) => {
                  const isSelected = selectedPatrol?._id === p._id;
                  return (
                    <tr
                      key={p._id}
                      onClick={() => setSelectedPatrol(p)}
                      className={`cursor-pointer transition hover:bg-emerald-50/50 ${
                        isSelected ? 'bg-emerald-50/80 font-medium' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-stone-900 flex items-center gap-2">
                        {p.status === 'IN_PROGRESS' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        )}
                        {p.routeName}
                      </td>
                      <td className="py-3.5 px-4 text-stone-700">
                        {p.rangerId?.name || 'Field Ranger'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                            p.status === 'IN_PROGRESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'COMPLETED'
                              ? 'bg-stone-100 text-stone-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 text-xs">
                        {p.startTime ? new Date(p.startTime).toLocaleTimeString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 text-xs">
                        {p.endTime ? new Date(p.endTime).toLocaleTimeString() : 'Active'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {p.distanceKm}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-stone-600">
                        {p.waypoints?.length || 0}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPatrol(p);
                          }}
                          className="px-3 py-1 bg-stone-100 hover:bg-emerald-700 hover:text-white rounded-lg text-xs font-semibold text-stone-700 transition"
                        >
                          Focus Map
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
