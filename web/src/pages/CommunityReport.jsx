import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

// Public report submission - uses raw axios directly to avoid auth header requirement
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CONFLICT_TYPES = [
  { id: 'CROP_RAIDING', label: 'Crop Raiding', icon: '🌾', desc: 'Wildlife actively damaging agricultural crops' },
  { id: 'SIGHTING', label: 'Elephant Sighting', icon: '🐘', desc: 'Elephant spotted near boundary or crossing routes' },
  { id: 'WILD_ANIMAL_NEAR_VILLAGE', label: 'Wildlife Near Village', icon: '🐾', desc: 'Animal wandering in close proximity to residential areas' },
  { id: 'LIVESTOCK_ATTACK', label: 'Livestock Attack', icon: '🐆', desc: 'Carnivore or predator attacking livestock' },
  { id: 'PROPERTY_DAMAGE', label: 'Property Damage', icon: '🛖', desc: 'Fences, water tanks, or houses damaged' },
  { id: 'HUMAN_INJURY', label: 'Human Injury (Critical)', icon: '🚨', desc: 'Urgent medical & ranger intervention needed' },
  { id: 'OTHER', label: 'Other Wildlife Incident', icon: '⚠️', desc: 'Unusual sighting or threat not listed above' },
];

export default function CommunityReport() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Form states
  const [conflictType, setConflictType] = useState('CROP_RAIDING');
  const [latitude, setLatitude] = useState(6.3721);
  const [longitude, setLongitude] = useState(81.5142);
  const [villageArea, setVillageArea] = useState('');
  const [nearbyLandmark, setNearbyLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [animalSpecies, setAnimalSpecies] = useState('Elephant');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Location detection
  const [locating, setLocating] = useState(false);
  const [locSuccess, setLocSuccess] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(5)));
        setLongitude(Number(pos.coords.longitude.toFixed(5)));
        setLocating(false);
        setLocSuccess(true);
      },
      (err) => {
        setLocating(false);
        alert('Could not acquire GPS position. You can manually enter village or landmark details.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please enter a short description of the incident.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('conflictType', conflictType);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('villageArea', villageArea);
      formData.append('nearbyLandmark', nearbyLandmark);
      formData.append('description', description);
      formData.append('animalSpecies', animalSpecies);
      formData.append('reporterName', reporterName || 'Community Villager');
      formData.append('reporterPhone', reporterPhone || '0770000000');
      formData.append('reporterType', 'COMMUNITY_MEMBER');

      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await axios.post(`${API_BASE}/conflicts`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const reportData = res.data.conflict || res.data.data;
      setSubmittedReport(reportData);
      setStep(4); // Success step
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to submit report. Please check details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50/40 text-stone-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-emerald-900 text-white px-6 py-4 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xl">
            🐘
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">WildGuard Community Portal</h1>
            <p className="text-xs text-emerald-200">Wildlife Conflict & Sighting Fast-Response Service</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <Link to="/login" className="bg-emerald-800 hover:bg-emerald-700 px-3 py-1.5 rounded text-xs font-semibold text-emerald-100 transition">
            Staff Login →
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 md:py-8">
        {step < 4 && (
          <div className="mb-6">
            {/* Progress Bar */}
            <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
              <span>Step {step} of 3</span>
              <span>
                {step === 1 && 'Incident Category'}
                {step === 2 && 'Incident Location'}
                {step === 3 && 'Details & Verification'}
              </span>
            </div>
            <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="font-bold ml-2">×</button>
          </div>
        )}

        {/* STEP 1: What did you observe? */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-stone-900">What did you observe?</h2>
              <p className="text-sm text-stone-600 mt-1">
                Select the incident type to help dispatch the right wildlife response team quickly.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {CONFLICT_TYPES.map((t) => (
                <label
                  key={t.id}
                  onClick={() => setConflictType(t.id)}
                  className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    conflictType === t.id
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <span className="text-3xl mr-4">{t.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-stone-900 text-base">{t.label}</h3>
                      <input
                        type="radio"
                        name="conflictType"
                        checked={conflictType === t.id}
                        onChange={() => setConflictType(t.id)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-3 rounded-xl shadow transition flex items-center space-x-2"
              >
                <span>Continue</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Location Information */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-stone-900">Where did the incident happen?</h2>
              <p className="text-sm text-stone-600 mt-1">
                Pinpoint the location to help rangers respond with minimum delay.
              </p>
            </div>

            {/* GPS Detection Box */}
            <div className="border border-stone-200 bg-stone-50 rounded-xl p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">
                    {locSuccess ? '📍 GPS Position Acquired' : '📍 Device GPS'}
                  </p>
                  <p className="text-xs text-stone-500">
                    Latitude: <span className="font-mono">{latitude}</span> | Longitude: <span className="font-mono">{longitude}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  <span>{locating ? 'Detecting...' : '📡 Use My Current Location'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Village or Community Area <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maduruwa Village, North Boundary"
                  value={villageArea}
                  onChange={(e) => setVillageArea(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Nearby Landmark or Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near old banyan tree by the irrigation canal"
                  value={nearbyLandmark}
                  onChange={(e) => setNearbyLandmark(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Manual Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Manual Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-stone-600 hover:text-stone-900 font-medium text-sm px-4 py-2"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!villageArea.trim()) {
                    setErrorMsg('Please enter your village or community area name.');
                    return;
                  }
                  setErrorMsg('');
                  setStep(3);
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-3 rounded-xl shadow transition"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Details & Contact */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-stone-900">Incident Details & Photo</h2>
              <p className="text-sm text-stone-600 mt-1">
                Provide specifics so the liaison team can prepare the appropriate deterrence equipment.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Target Animal Species
                </label>
                <select
                  value={animalSpecies}
                  onChange={(e) => setAnimalSpecies(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
                >
                  <option value="Elephant">Wild Elephant (Bull / Herd)</option>
                  <option value="Leopard">Leopard / Wild Cat</option>
                  <option value="Wild Boar">Wild Boar</option>
                  <option value="Bear">Sloth Bear</option>
                  <option value="Crocodile">Crocodile</option>
                  <option value="Other">Other Species</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Describe what happened <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="4"
                  placeholder="e.g. 2 wild elephants broke through the paddy fence around 6:30 PM. Crops damaged, villagers making noise to keep them away."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  required
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Evidence Photo (Optional)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-stone-300 border-dashed rounded-xl hover:border-emerald-500 transition">
                  {imagePreview ? (
                    <div className="relative text-center">
                      <img src={imagePreview} alt="Preview" className="h-44 object-contain rounded-lg mx-auto" />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="mt-2 text-xs text-red-600 hover:underline block mx-auto"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center">
                      <span className="text-3xl block">📷</span>
                      <div className="flex text-sm text-stone-600 justify-center">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500">
                          <span>Upload a photo or capture evidence</span>
                          <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                        </label>
                      </div>
                      <p className="text-xs text-stone-400">PNG, JPG, WEBP up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reporter Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Your Name (Optional / Anonymous)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sunimal Perera"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Contact Phone (For SMS & updates)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 0771234567"
                    value={reporterPhone}
                    onChange={(e) => setReporterPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-stone-600 hover:text-stone-900 font-medium text-sm px-4 py-2"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition flex items-center space-x-2 disabled:opacity-50"
                >
                  <span>{submitting ? 'Submitting Report...' : 'Submit Conflict Report 🚀'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: Confirmation Screen */}
        {step === 4 && submittedReport && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-stone-900">Report Submitted Successfully!</h2>
            <p className="text-sm text-stone-600 mt-2 max-w-md mx-auto">
              Your wildlife conflict incident has been registered into the WildPulse conservation network.
              The Community Liaison Officer and duty rangers have been alerted.
            </p>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 my-6 text-left max-w-md mx-auto space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-stone-500">Report Reference ID:</span>
                <span className="font-mono font-bold text-emerald-800">{submittedReport.reportId || submittedReport._id}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-stone-500">Incident Type:</span>
                <span className="font-medium text-stone-800">{submittedReport.conflictType}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-stone-500">Location:</span>
                <span className="font-medium text-stone-800">{submittedReport.villageArea || 'Area Registered'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-stone-500">Status:</span>
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {submittedReport.status}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-xs text-stone-400">
                <span>Submitted at:</span>
                <span>{new Date(submittedReport.createdAt || Date.now()).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
              <button
                onClick={() => {
                  setStep(1);
                  setDescription('');
                  setImageFile(null);
                  setImagePreview(null);
                  setSubmittedReport(null);
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-2.5 rounded-xl shadow transition"
              >
                Submit Another Report
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-stone-100 border-t border-stone-200 py-4 text-center text-xs text-stone-500">
        WildPulse Conservation Platform · Member 3 Community Reporting Service
      </footer>
    </div>
  );
}
