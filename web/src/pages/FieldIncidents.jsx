import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import api from '../api/client';
import 'leaflet/dist/leaflet.css';

// Severity color markers
const severityColors = {
  LOW: 'green',
  MEDIUM: 'orange',
  HIGH: 'red',
  CRITICAL: 'black',
};

const createCustomIcon = (severity) => {
  const color = severityColors[severity] || 'red';
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

const INCIDENT_LABELS = {
  SNARE_TRAP: '🪤 Wire / Snare Trap',
  POACHING_SIGN: '🎯 Poaching Activity',
  INJURED_ANIMAL: '🩹 Injured Wildlife',
  TRESPASSING: '🚶 Illegal Trespassing',
  ILLEGAL_LOGGING: '🪓 Illegal Logging',
  OTHER: '⚠️ Other Threat',
};

export default function FieldIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [inspectModal, setInspectModal] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const { data } = await api.get('/field-incidents', { params });
      setIncidents(data.incidents || []);
    } catch (err) {
      console.error('Error fetching field incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [severityFilter, statusFilter]);

  // Connect to Socket.io for live alerts
  useEffect(() => {
    const socket = io('http://localhost:5000', { transports: ['websocket'] });

    socket.on('connect', () => {
      console.log('Connected to WildPulse real-time incident broadcast');
    });

    socket.on('new_field_incident', (newIncident) => {
      setIncidents((prev) => [newIncident, ...prev]);
    });

    socket.on('field_incident_updated', (updatedIncident) => {
      setIncidents((prev) =>
        prev.map((item) => (item._id === updatedIncident._id ? updatedIncident : item))
      );
      if (inspectModal?._id === updatedIncident._id) {
        setInspectModal(updatedIncident);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [inspectModal]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setUpdatingId(id);
      const { data } = await api.patch(`/field-incidents/${id}/status`, {
        status: newStatus,
      });
      setIncidents((prev) =>
        prev.map((item) => (item._id === id ? data.incident : item))
      );
      if (inspectModal?._id === id) {
        setInspectModal(data.incident);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Center on selected incident or default to Sri Lanka wildlife zone
  const mapCenter = selectedIncident?.location?.latitude
    ? [selectedIncident.location.latitude, selectedIncident.location.longitude]
    : incidents[0]?.location?.latitude
    ? [incidents[0].location.latitude, incidents[0].location.longitude]
    : [6.368, 81.52];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚨</span>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">
              Field Incidents & Tactical Threats
            </h1>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Real-time feed of snare traps, poaching alerts, injured animals, and offline ranger syncs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Threats</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
            <option value="LOW">Low Severity</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="REPORTED">Reported / Pending</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <button
            onClick={fetchIncidents}
            className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-xl text-xs hover:bg-emerald-800 transition flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Map & Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[520px]">
          <div className="p-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                Geospatial Threat Heatmap
              </span>
            </div>
            <span className="text-xs bg-stone-800 text-stone-300 px-3 py-1 rounded-full font-mono">
              {incidents.length} Threat Markers
            </span>
          </div>

          <div className="flex-1 w-full relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {incidents
                .filter((inc) => inc.location?.latitude && inc.location?.longitude)
                .map((inc) => (
                  <Marker
                    key={inc._id}
                    position={[inc.location.latitude, inc.location.longitude]}
                    icon={createCustomIcon(inc.severity)}
                    eventHandlers={{
                      click: () => setSelectedIncident(inc),
                    }}
                  >
                    <Popup>
                      <div className="text-xs p-1 space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-stone-900">
                            {INCIDENT_LABELS[inc.incidentType] || inc.incidentType}
                          </span>
                        </div>
                        <p className="text-stone-600 font-medium">{inc.description}</p>
                        <div className="flex justify-between items-center text-[10px] text-stone-500 pt-1 border-t border-stone-200">
                          <span>Severity: <strong>{inc.severity}</strong></span>
                          <span>{inc.status}</span>
                        </div>
                        <button
                          onClick={() => setInspectModal(inc)}
                          className="w-full mt-2 py-1 bg-emerald-700 text-white rounded font-bold hover:bg-emerald-800"
                        >
                          Inspect Evidence & Details
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        </div>

        {/* Real-time Incidents Feed */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Live Incident Feed
            </h2>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Socket Broadcast Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mt-3 pr-1">
            {loading ? (
              <p className="text-stone-400 text-xs text-center py-8">Loading incidents...</p>
            ) : incidents.length === 0 ? (
              <p className="text-stone-400 text-xs text-center py-8">No incident reports.</p>
            ) : (
              incidents.map((inc) => {
                const isSelected = selectedIncident?._id === inc._id;
                return (
                  <div
                    key={inc._id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-sm'
                        : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-stone-900">
                        {INCIDENT_LABELS[inc.incidentType] || inc.incidentType}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          inc.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-800'
                            : inc.severity === 'HIGH'
                            ? 'bg-orange-100 text-orange-800'
                            : inc.severity === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 mt-1.5 line-clamp-2">
                      {inc.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2.5 pt-2 border-t border-stone-200/60">
                      <div className="flex items-center gap-1.5">
                        {inc.isSyncedOffline ? (
                          <span
                            className="bg-amber-100 text-amber-800 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold"
                            title="Logged without cellular signal; synced to server upon reconnect"
                          >
                            💾 OFFLINE SYNC
                          </span>
                        ) : (
                          <span
                            className="bg-emerald-100 text-emerald-800 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold"
                            title="Submitted live over cellular network"
                          >
                            ⚡ LIVE REPORT
                          </span>
                        )}
                        <span className="truncate max-w-[90px]">
                          {inc.rangerId?.name || 'Ranger'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectModal(inc);
                        }}
                        className="text-emerald-700 font-bold hover:underline"
                      >
                        Details →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Incident Investigation & Evidence Modal */}
      {inspectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-stone-200 space-y-5">
            <div className="flex items-start justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs font-mono text-stone-400">
                  INCIDENT #{inspectModal._id.slice(-6)}
                </span>
                <h3 className="text-xl font-black text-stone-900 mt-0.5">
                  {INCIDENT_LABELS[inspectModal.incidentType] || inspectModal.incidentType}
                </h3>
              </div>
              <button
                onClick={() => setInspectModal(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold ${
                  inspectModal.severity === 'CRITICAL'
                    ? 'bg-red-100 text-red-800'
                    : inspectModal.severity === 'HIGH'
                    ? 'bg-orange-100 text-orange-800'
                    : inspectModal.severity === 'MEDIUM'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Severity: {inspectModal.severity}
              </span>

              <span className="text-xs px-3 py-1 rounded-full font-bold bg-stone-100 text-stone-700">
                Status: {inspectModal.status}
              </span>

              {inspectModal.isSyncedOffline ? (
                <span className="text-xs px-3 py-1 rounded-full font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
                  <span>💾</span> Synced from Offline Cache
                </span>
              ) : (
                <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span>⚡</span> Live Field Dispatch
                </span>
              )}
            </div>

            {/* Description */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                Ranger Field Observation
              </h4>
              <p className="text-sm text-stone-800 leading-relaxed">
                {inspectModal.description}
              </p>
            </div>

            {/* Reporter & Location Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Reporting Ranger
                </h4>
                <p>
                  <strong className="text-stone-700">Name:</strong>{' '}
                  {inspectModal.rangerId?.name || 'Authorized Ranger'}
                </p>
                <p>
                  <strong className="text-stone-700">Email:</strong>{' '}
                  {inspectModal.rangerId?.email || 'N/A'}
                </p>
                <p>
                  <strong className="text-stone-700">Phone:</strong>{' '}
                  {inspectModal.rangerId?.phone || 'N/A'}
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-stone-500 mb-2">
                  GPS Coordinates
                </h4>
                <p>
                  <strong className="text-stone-700">Latitude:</strong>{' '}
                  {inspectModal.location?.latitude?.toFixed(6) || 'N/A'}
                </p>
                <p>
                  <strong className="text-stone-700">Longitude:</strong>{' '}
                  {inspectModal.location?.longitude?.toFixed(6) || 'N/A'}
                </p>
                <p>
                  <strong className="text-stone-700">Logged At:</strong>{' '}
                  {new Date(inspectModal.reportedAt || inspectModal.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Evidence Photos */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Photographic Evidence ({inspectModal.images?.length || 0})
              </h4>
              {inspectModal.images && inspectModal.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {inspectModal.images.map((img, idx) => (
                    <a
                      key={idx}
                      href={img}
                      target="_blank"
                      rel="noreferrer"
                      className="block group rounded-xl overflow-hidden border border-stone-200 aspect-video relative bg-stone-100"
                    >
                      <img
                        src={img}
                        alt={`Evidence ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                        View Full ↗
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">No images attached with this submission.</p>
              )}
            </div>

            {/* Status Change Buttons */}
            <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-stone-600">Update Tactical Status:</span>
              <div className="flex gap-2">
                {inspectModal.status !== 'REPORTED' && (
                  <button
                    disabled={updatingId === inspectModal._id}
                    onClick={() => handleUpdateStatus(inspectModal._id, 'REPORTED')}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100"
                  >
                    Mark Reported
                  </button>
                )}
                {inspectModal.status !== 'UNDER_INVESTIGATION' && (
                  <button
                    disabled={updatingId === inspectModal._id}
                    onClick={() => handleUpdateStatus(inspectModal._id, 'UNDER_INVESTIGATION')}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700"
                  >
                    Investigate
                  </button>
                )}
                {inspectModal.status !== 'RESOLVED' && (
                  <button
                    disabled={updatingId === inspectModal._id}
                    onClick={() => handleUpdateStatus(inspectModal._id, 'RESOLVED')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
                  >
                    Mark Resolved ✓
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
