import { SEVERITY_CLASS, STATUS_CLASS } from './format';

export function Badge({ value }) {
  const cls = SEVERITY_CLASS[value] || STATUS_CLASS[value] || 'bg-stone-100 text-stone-700 border-stone-200';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${cls}`}>{value || '—'}</span>;
}

export function DemoBanner() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
      DEMO / SIMULATED telemetry. These positions, camera frames, and heartbeats are repeatable sample data for Yala and Wilpattu. They are not live wildlife feeds.
    </div>
  );
}

export function EmptyState({ title, body }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center">
      <p className="font-semibold text-stone-800">{title}</p>
      <p className="text-sm text-stone-500 mt-1">{body}</p>
    </div>
  );
}
