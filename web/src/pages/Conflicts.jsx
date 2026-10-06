import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Conflicts() {
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState([]);
  const [rangers, setRangers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  // Modal states for assigning ranger
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [selectedRangerId, setSelectedRangerId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Modal / status resolution states
  const [resolvingConflict, setResolvingConflict] = useState(null);
  const [resolutionStatus, setResolutionStatus] = useState('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Detail drawer / view
  const [detailConflict, setDetailConflict] = useState(null);

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (filterType !== 'ALL') params.conflictType = filterType;

      const { data } = await api.get('/conflicts', { params });
      setConflicts(data.conflicts || data.data || []);
    } catch (err) {
      console.error('Error fetching conflicts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRangers = async () => {
    try {
      const { data } = await api.get('/auth/users?role=RANGER');
      setRangers(data.users || data.data || []);
    } catch (err) {
      console.error('Error fetching rangers:', err);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, [filterStatus, filterType]);

  useEffect(() => {
    fetchRangers();
  }, []);

  const handleAssignRanger = async (e) => {
    e.preventDefault();
    if (!selectedConflict || !selectedRangerId) return;

    try {
      setAssigning(true);
      await api.put(`/conflicts/${selectedConflict._id}/assign`, {
        rangerId: selectedRangerId,
      });
      setSelectedConflict(null);
      setSelectedRangerId('');
      fetchConflicts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign ranger.');
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!resolvingConflict) return;

    try {
      setUpdatingStatus(true);
      await api.put(`/conflicts/${resolvingConflict._id}/status`, {
        status: resolutionStatus,
        resolutionNotes,
      });
      setResolvingConflict(null);
      setResolutionNotes('');
      fetchConflicts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update conflict status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'REPORTED':
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">REPORTED</span>;
      case 'ASSIGNED':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200">RANGER ASSIGNED</span>;
      case 'IN_PROGRESS':
        return <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-200">IN PROGRESS</span>;
      case 'RESOLVED':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200">RESOLVED</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded-full">{status}</span>;
    }
  };

  const getSeverityBadge = (type) => {
    if (['HUMAN_INJURY', 'LIVESTOCK_ATTACK'].includes(type)) {
      return <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded">CRITICAL</span>;
    }
    if (['CROP_RAIDING', 'CROP_DAMAGE', 'WILD_ANIMAL_NEAR_VILLAGE'].includes(type)) {
      return <span className="bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded">HIGH PRIORITY</span>;
    }
    return <span className="bg-stone-500 text-white text-[11px] font-medium px-2 py-0.5 rounded">STANDARD</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Stat Overview */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Community Liaison Operations</h1>
          <p className="text-sm text-stone-500 mt-1">
            Review community incident alerts, assign response rangers, and track resolution status.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <a
            href="/report"
            target="_blank"
            rel="noreferrer"
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold px-4 py-2 rounded-xl text-sm transition flex items-center space-x-1"
          >
            <span>🌐 Open Public Form</span>
          </a>
          <button
            onClick={() => fetchConflicts()}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-xl text-sm font-medium transition"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
          <p className="text-xs font-semibold uppercase text-stone-400">Total Reports</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{conflicts.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
          <p className="text-xs font-semibold uppercase text-amber-500">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {conflicts.filter((c) => c.status === 'REPORTED').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
          <p className="text-xs font-semibold uppercase text-blue-500">Assigned / Active</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {conflicts.filter((c) => ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
          <p className="text-xs font-semibold uppercase text-emerald-500">Resolved</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {conflicts.filter((c) => c.status === 'RESOLVED').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-stone-200">
        <span className="text-xs font-bold uppercase text-stone-500 mr-2">Filters:</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="REPORTED">Reported (Pending)</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ALL">All Conflict Types</option>
          <option value="CROP_RAIDING">Crop Raiding</option>
          <option value="SIGHTING">Elephant Sighting</option>
          <option value="WILD_ANIMAL_NEAR_VILLAGE">Wild Animal Near Village</option>
          <option value="LIVESTOCK_ATTACK">Livestock Attack</option>
          <option value="PROPERTY_DAMAGE">Property Damage</option>
          <option value="HUMAN_INJURY">Human Injury</option>
        </select>
      </div>

      {/* Conflicts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-12 text-center text-stone-400 rounded-xl border border-stone-200">
            Loading conflicts...
          </div>
        ) : conflicts.length === 0 ? (
          <div className="bg-white p-12 text-center text-stone-500 rounded-xl border border-stone-200">
            No community wildlife conflict reports found for current filters.
          </div>
        ) : (
          conflicts.map((c) => (
            <div
              key={c._id}
              className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 hover:border-emerald-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Column: Details */}
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                    {c.reportId || c._id.slice(-6)}
                  </span>
                  <span className="font-bold text-stone-900 text-base">{c.conflictType}</span>
                  {getSeverityBadge(c.conflictType)}
                  {getStatusBadge(c.status)}
                </div>

                <p className="text-sm text-stone-700 leading-snug">{c.description}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 pt-1">
                  <span>📍 {c.villageArea || 'Area Registered'} {c.nearbyLandmark ? `(${c.nearbyLandmark})` : ''}</span>
                  <span>🗺️ {c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)}</span>
                  <span>👤 {c.reporterName || 'Villager'} · {c.reporterPhone}</span>
                  <span>📅 {new Date(c.createdAt).toLocaleString()}</span>
                </div>

                {/* Assigned Ranger Banner */}
                {c.assignedRanger && (
                  <div className="bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 rounded-lg border border-emerald-200 inline-flex items-center space-x-2 mt-2">
                    <span className="font-bold">Assigned Unit:</span>
                    <span>{c.assignedRanger.name} ({c.assignedRanger.email})</span>
                    {c.assignedAt && (
                      <span className="text-emerald-600">at {new Date(c.assignedAt).toLocaleTimeString()}</span>
                    )}
                  </div>
                )}

                {/* Resolution Notes Banner */}
                {c.resolutionNotes && (
                  <div className="bg-stone-50 text-stone-700 text-xs px-3 py-1.5 rounded-lg border border-stone-200 mt-1">
                    <span className="font-bold text-stone-900">Resolution: </span>
                    {c.resolutionNotes}
                  </div>
                )}
              </div>

              {/* Right Column: Actions */}
              <div className="flex flex-wrap sm:flex-col items-end gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                {c.imageUrl && (
                  <a
                    href={c.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    <span>🖼️ View Evidence</span>
                  </a>
                )}

                {c.status === 'REPORTED' && (
                  <button
                    onClick={() => {
                      setSelectedConflict(c);
                      setSelectedRangerId(rangers[0]?._id || '');
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    Assign Ranger →
                  </button>
                )}

                {c.status === 'ASSIGNED' && (
                  <button
                    onClick={() => {
                      setResolvingConflict(c);
                      setResolutionStatus('IN_PROGRESS');
                    }}
                    className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    Set In-Progress
                  </button>
                )}

                {c.status !== 'RESOLVED' && (
                  <button
                    onClick={() => {
                      setResolvingConflict(c);
                      setResolutionStatus('RESOLVED');
                      setResolutionNotes(c.resolutionNotes || '');
                    }}
                    className="bg-stone-800 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    Resolve Conflict ✓
                  </button>
                )}

                <button
                  onClick={() => setDetailConflict(c)}
                  className="text-stone-500 hover:text-stone-800 text-xs underline py-1"
                >
                  View Full Audit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: Assign Ranger */}
      {selectedConflict && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Assign Ranger to Incident</h3>
                <p className="text-xs text-stone-500">
                  {selectedConflict.reportId} · {selectedConflict.conflictType}
                </p>
              </div>
              <button
                onClick={() => setSelectedConflict(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p><strong>Location:</strong> {selectedConflict.villageArea || 'Area registered'}</p>
              <p><strong>Description:</strong> {selectedConflict.description}</p>
            </div>

            <form onSubmit={handleAssignRanger} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Select Active Wildlife Ranger
                </label>
                <select
                  value={selectedRangerId}
                  onChange={(e) => setSelectedRangerId(e.target.value)}
                  className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose a Ranger --</option>
                  {rangers.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.email}) - {r.phone || 'Field Unit'}
                    </option>
                  ))}
                </select>
                {rangers.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No rangers found in database. Create a ranger with role 'RANGER' to assign.
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedConflict(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedRangerId}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2 rounded-xl text-xs shadow disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Update Status / Resolve */}
      {resolvingConflict && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Update Incident Status</h3>
                <p className="text-xs text-stone-500">
                  {resolvingConflict.reportId} · {resolvingConflict.conflictType}
                </p>
              </div>
              <button
                onClick={() => setResolvingConflict(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Status
                </label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                  className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="REPORTED">REPORTED</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Resolution Notes / Action Taken
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Ranger Ravi dispatched non-lethal acoustic deterrents; wild elephant steered safely back across buffer boundary."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full text-sm border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingConflict(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="bg-stone-900 hover:bg-black text-white font-bold px-5 py-2 rounded-xl text-xs shadow disabled:opacity-50"
                >
                  {updatingStatus ? 'Saving...' : 'Save Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL: Full Conflict Audit */}
      {detailConflict && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Incident Audit Report</h3>
                <p className="text-xs font-mono text-emerald-800">{detailConflict.reportId}</p>
              </div>
              <button
                onClick={() => setDetailConflict(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            {detailConflict.imageUrl && (
              <img
                src={detailConflict.imageUrl}
                alt="Evidence"
                className="w-full h-48 object-cover rounded-xl border border-stone-200"
              />
            )}

            <div className="bg-stone-50 rounded-xl p-4 space-y-2 text-xs text-stone-700">
              <div className="flex justify-between"><span className="text-stone-500">Incident Type:</span> <span className="font-bold">{detailConflict.conflictType}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Species:</span> <span>{detailConflict.animalSpecies || 'Elephant'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Status:</span> {getStatusBadge(detailConflict.status)}</div>
              <div className="flex justify-between"><span className="text-stone-500">Village:</span> <span>{detailConflict.villageArea || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Landmark:</span> <span>{detailConflict.nearbyLandmark || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Coordinates:</span> <span className="font-mono">{detailConflict.latitude}, {detailConflict.longitude}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Reporter:</span> <span>{detailConflict.reporterName} ({detailConflict.reporterPhone})</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Reported At:</span> <span>{new Date(detailConflict.createdAt).toLocaleString()}</span></div>
              {detailConflict.assignedRanger && (
                <div className="flex justify-between"><span className="text-stone-500">Assigned Ranger:</span> <span className="font-semibold text-emerald-700">{detailConflict.assignedRanger.name}</span></div>
              )}
              {detailConflict.reviewedBy && (
                <div className="flex justify-between"><span className="text-stone-500">Reviewed By:</span> <span>{detailConflict.reviewedBy.name}</span></div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-stone-500">Description:</p>
              <p className="text-sm text-stone-800 bg-stone-50 p-3 rounded-lg border border-stone-200 mt-1">
                {detailConflict.description}
              </p>
            </div>

            {detailConflict.resolutionNotes && (
              <div>
                <p className="text-xs font-semibold text-stone-500">Resolution Notes:</p>
                <p className="text-sm text-stone-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200 mt-1">
                  {detailConflict.resolutionNotes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailConflict(null)}
                className="bg-stone-800 text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}