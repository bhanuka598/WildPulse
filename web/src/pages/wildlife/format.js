export function coordLabel(location) {
  const pair = location?.coordinates;
  if (!pair || pair.length < 2) return 'Unknown';
  const [lng, lat] = pair;
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

export function when(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export const SEVERITY_CLASS = {
  LOW: 'bg-stone-100 text-stone-700 border-stone-200',
  MEDIUM: 'bg-amber-100 text-amber-900 border-amber-200',
  HIGH: 'bg-orange-100 text-orange-900 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
};

export const STATUS_CLASS = {
  NEW: 'bg-red-50 text-red-700 border-red-200',
  ACKNOWLEDGED: 'bg-amber-50 text-amber-800 border-amber-200',
  RESPONSE_DISPATCHED: 'bg-sky-50 text-sky-800 border-sky-200',
  ASSIGNED: 'bg-sky-50 text-sky-800 border-sky-200',
  ACCEPTED: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  IN_PROGRESS: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  RESOLVED: 'bg-stone-100 text-stone-600 border-stone-200',
  COMPLETED: 'bg-stone-100 text-stone-600 border-stone-200',
  CANCELLED: 'bg-stone-100 text-stone-500 border-stone-200',
  ONLINE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  OFFLINE: 'bg-red-50 text-red-700 border-red-200',
  AVAILABLE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};
