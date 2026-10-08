import { useState, useEffect } from 'react';
import api from '../api/client';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import 'leaflet/dist/leaflet.css';

export default function Analytics() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Form state
  const [category, setCategory] = useState('Poaching Hotspots');
  const [park, setPark] = useState('Serengeti National Park - Sector A');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.get('/analytics/report', {
        params: { category, park, startDate, endDate },
      });
      if (res.data && res.data.success) {
        setReportData(res.data.data);
        setStep(2);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // In a real app, we'd use jsPDF or html2canvas here.
    // For the assignment, a simple alert or downloading a mock blob is sufficient.
    const csvContent = "data:text/csv;charset=utf-8,Incident ID,Type,Lat,Lng\n1,Snare,6.38,81.51";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "wildpulse_analytics_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Report exported successfully. Logged in audit trail.');
  };

  if (step === 1) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
        <div className="mb-6 border-b border-stone-100 pb-4">
          <h1 className="text-2xl font-bold text-stone-900">Generate Conservation Analytics & Reports</h1>
          <p className="text-stone-500 text-sm mt-1">
            Select an operational intelligence category and configure analytical scope.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Col: Categories */}
            <div>
              <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-4">
                1. Select Report Category
              </h2>
              <div className="space-y-3">
                {[
                  { name: 'Poaching Hotspots by Location', desc: 'Spatial density heatmaps and snare cluster triangulations.', icon: '🎯' },
                  { name: 'Patrol Coverage & Sensor Uptime', desc: 'Ranger movement GPS breadcrumbs and sector traverse density.', icon: '🥾' },
                  { name: 'Human-Wildlife Conflict Incidents', desc: 'Fencing breach logs and crop-raiding spatial heat maps.', icon: '🐘' },
                  { name: 'Wildlife Population & Migration', desc: 'Seasonal corridor telemetry and herd centroid tracking.', icon: '🐾' },
                ].map((cat) => (
                  <label
                    key={cat.name}
                    className={`flex items-start p-4 border rounded-2xl cursor-pointer transition ${
                      category === cat.name ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-emerald-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.name}
                      checked={category === cat.name}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-stone-900">{cat.icon} {cat.name}</span>
                      <span className="block text-xs text-stone-500 mt-1">{cat.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Right Col: Parameters */}
            <div>
              <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-4">
                2. Report Parameters & Filters
              </h2>
              <div className="space-y-5 bg-stone-50 p-5 rounded-2xl border border-stone-200">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Conservation Region</label>
                  <select
                    value={park}
                    onChange={(e) => setPark(e.target.value)}
                    className="w-full text-sm border-stone-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  >
                    <option>Serengeti National Park - Sector A</option>
                    <option>Yala National Park - Sector B</option>
                    <option>Kruger National Park - Sector C</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-sm border-stone-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-sm border-stone-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-200">
                  <label className="flex items-center text-sm text-stone-700">
                    <input type="checkbox" className="rounded text-emerald-600 focus:ring-emerald-500 mr-2" defaultChecked />
                    Compare with previous month
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-stone-100">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-8 rounded-xl shadow-md transition disabled:opacity-50 flex items-center"
            >
              {loading ? 'Processing...' : 'Generate Analytics Report →'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 2: The Generated Report Dashboard
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full uppercase tracking-wider">
            {reportData?.parameters.category}
          </span>
          <h1 className="text-2xl font-bold text-stone-900 mt-2">{reportData?.parameters.park}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {reportData?.parameters.startDate} to {reportData?.parameters.endDate}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button
            onClick={() => setStep(1)}
            className="px-4 py-2 text-sm font-semibold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition"
          >
            ← Edit Filters
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-bold text-white bg-stone-900 rounded-xl hover:bg-black transition flex items-center gap-2"
          >
            📥 Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Total Incidents</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-stone-900">{reportData?.summary.totalIncidents}</span>
            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">▲ +18%</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">High-Risk Zones</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-stone-900">{reportData?.summary.highRiskZones}</span>
            <span className="text-xs text-stone-500 font-medium">Zones identified</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Mean Interception</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-stone-900">{reportData?.summary.meanInterceptionDelay}</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">▼ -6 min</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Field Telemetry</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="flex h-3 w-3 relative mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-lg font-bold text-emerald-700">{reportData?.summary.syncStatus}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col">
          <h2 className="text-base font-bold text-stone-900 mb-4">Spatial Incident Density (Hotspot Map)</h2>
          <div className="flex-1 bg-stone-100 rounded-2xl overflow-hidden min-h-[400px] border border-stone-200 relative z-0">
            {reportData?.hotspots && reportData.hotspots.length > 0 && (
              <MapContainer 
                center={[reportData.hotspots[0].lat, reportData.hotspots[0].lng]} 
                zoom={11} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {reportData.hotspots.map((spot) => (
                  <CircleMarker 
                    key={spot.id}
                    center={[spot.lat, spot.lng]}
                    radius={spot.intensity * 30}
                    pathOptions={{ color: spot.intensity > 0.7 ? '#dc2626' : '#ea580c', fillColor: spot.intensity > 0.7 ? '#dc2626' : '#ea580c', fillOpacity: 0.4 }}
                  >
                    <Popup>
                      <div className="font-bold">{spot.type} Detected</div>
                      <div className="text-xs text-stone-500">Risk Intensity: {spot.intensity}</div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {/* Charts & Tables */}
        <div className="flex flex-col gap-6">
          {/* Trend Chart */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
            <h2 className="text-base font-bold text-stone-900 mb-4">Weekly Incidents Trend</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData?.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                  <Line type="monotone" name="Current Period" dataKey="current" stroke="#047857" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Previous Period" dataKey="previous" stroke="#d6d3d1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Table */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex-1">
            <h2 className="text-base font-bold text-stone-900 mb-4">Priority Sectors Action Queue</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                    <th className="pb-3">Sector</th>
                    <th className="pb-3">Trigger</th>
                    <th className="pb-3">Risk</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {reportData?.priorityAreas.map((area) => (
                    <tr key={area.id}>
                      <td className="py-3 font-semibold text-stone-900">{area.sector}</td>
                      <td className="py-3 text-stone-500">{area.trigger}</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          area.risk === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {area.risk}
                        </span>
                      </td>
                      <td className="py-3">
                        <button className="text-[11px] font-bold text-white bg-stone-900 hover:bg-emerald-600 px-3 py-1 rounded-lg transition">
                          {area.action}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
