import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { coordLabel, when } from '../../pages/wildlife/format';

const CENTER = [6.4, 81.48];

function toLatLngs(geometry) {
  const ring = geometry?.coordinates?.[0] || [];
  return ring.map(([lng, lat]) => [lat, lng]);
}

function icon(color, text) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:#fff;width:30px;height:30px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${text}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 12));
  }, [position, map]);
  return null;
}

export default function WildlifeMap({
  animals = [],
  sensors = [],
  units = [],
  zones = [],
  alerts = [],
  telemetry = [],
  selectedAnimalId,
  onSelectAnimal,
}) {
  const selected = animals.find((animal) => animal.animalId === selectedAnimalId);
  const pair = selected?.lastLocation?.coordinates;
  const focus = pair ? [pair[1], pair[0]] : null;

  const route = useMemo(
    () =>
      telemetry
        .slice()
        .reverse()
        .map((row) => {
          const [lng, lat] = row.coordinates?.coordinates || [];
          return lat != null ? [lat, lng] : null;
        })
        .filter(Boolean),
    [telemetry]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-stone-600">
        <Legend color="#059669" label="Collar" />
        <Legend color="#d97706" label="Camera trap" />
        <Legend color="#0284c7" label="Field unit" />
        <Legend color="#dc2626" label="Active alert" />
        <Legend color="#78716c" label="Village" />
        <span className="ml-auto font-semibold text-amber-800">DEMO / SIMULATED</span>
      </div>
      <div className="h-[520px] rounded-2xl overflow-hidden border border-stone-200">
        <MapContainer center={CENTER} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter position={focus} />
          {zones.map((zone) => (
            <Polygon
              key={zone._id}
              positions={toLatLngs(zone.geometry)}
              pathOptions={{
                color: zone.zoneType === 'HIGH_RISK' ? '#dc2626' : zone.zoneType === 'VILLAGE' ? '#d97706' : '#059669',
                weight: 2,
                fillOpacity: zone.zoneType === 'PROTECTED' ? 0.08 : 0.18,
              }}
            >
              <Popup>
                <strong>{zone.name}</strong>
                <div>{zone.zoneType} · {zone.riskLevel}</div>
                <div>{zone.park}</div>
              </Popup>
            </Polygon>
          ))}
          {route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#047857', weight: 4 }} />}
          {animals.map((animal) => {
            const pair = animal.lastLocation?.coordinates;
            if (!pair) return null;
            return (
              <Marker
                key={animal.animalId}
                position={[pair[1], pair[0]]}
                icon={icon('#059669', 'AN')}
                eventHandlers={{ click: () => onSelectAnimal?.(animal) }}
              >
                <Popup>
                  <AnimalPopup animal={animal} />
                </Popup>
              </Marker>
            );
          })}
          {sensors
            .filter((sensor) => sensor.sensorType === 'CAMERA_TRAP')
            .map((sensor) => {
              const pair = sensor.location?.coordinates;
              if (!pair) return null;
              return (
                <Marker key={sensor.sensorId} position={[pair[1], pair[0]]} icon={icon('#d97706', 'CAM')}>
                  <Popup>
                    <strong>{sensor.sensorId}</strong>
                    <div>Camera trap · {sensor.status}</div>
                    <div>Battery {sensor.batteryLevel ?? '—'}% · signal {sensor.signalStrength ?? '—'}%</div>
                    <div className="text-amber-700">DEMO / SIMULATED</div>
                  </Popup>
                </Marker>
              );
            })}
          {units.map((unit) => {
            const pair = unit.currentLocation?.coordinates;
            if (!pair) return null;
            return (
              <Marker key={unit.unitId} position={[pair[1], pair[0]]} icon={icon('#0284c7', 'RU')}>
                <Popup>
                  <strong>{unit.name}</strong>
                  <div>{unit.unitId} · {unit.unitType}</div>
                  <div>{unit.availability}</div>
                  <div>{coordLabel(unit.currentLocation)}</div>
                </Popup>
              </Marker>
            );
          })}
          {alerts
            .filter((alert) => !['RESOLVED', 'CANCELLED'].includes(alert.status))
            .map((alert) => {
              const pair = alert.location?.coordinates;
              if (!pair) return null;
              return (
                <Marker key={alert.alertId} position={[pair[1], pair[0]]} icon={icon('#dc2626', '!')}>
                  <Popup>
                    <strong>{alert.alertId}</strong>
                    <div>{alert.category} · {alert.severity}</div>
                    <div>{alert.status}</div>
                    <div>{coordLabel(alert.location)}</div>
                  </Popup>
                </Marker>
              );
            })}
          {zones
            .filter((zone) => zone.zoneType === 'VILLAGE' && zone.villageLocation?.coordinates)
            .map((zone) => {
              const [lng, lat] = zone.villageLocation.coordinates;
              return (
                <Marker key={`${zone._id}-village`} position={[lat, lng]} icon={icon('#78716c', 'V')}>
                  <Popup>
                    <strong>{zone.villageName || zone.name}</strong>
                    <div>Nearby village reference point</div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>
      </div>
      {selected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white border border-stone-200 rounded-2xl p-4 text-sm">
          <Info label="Animal ID" value={selected.animalId} />
          <Info label="Name" value={selected.name || 'Not recorded'} />
          <Info label="Species" value={selected.species} />
          <Info label="Collar" value={selected.collarId || '—'} />
          <Info label="Last coordinates" value={coordLabel(selected.lastLocation)} />
          <Info label="Timestamp" value={when(selected.lastSeenAt)} />
          <Info label="Movement" value={selected.movementStatus} />
          <Info label="Battery" value={selected.batteryLevel != null ? `${selected.batteryLevel}%` : '—'} />
          <Info label="Speed" value={`${selected.speedKmh || 0} km/h`} />
          <Info label="Data" value="DEMO / SIMULATED" />
        </div>
      )}
    </div>
  );
}

function AnimalPopup({ animal }) {
  return (
    <div>
      <strong>{animal.animalId} {animal.name ? `· ${animal.name}` : ''}</strong>
      <div>{animal.species}</div>
      <div>Collar {animal.collarId || '—'}</div>
      <div>{coordLabel(animal.lastLocation)}</div>
      <div>{when(animal.lastSeenAt)}</div>
      <div>{animal.movementStatus} · battery {animal.batteryLevel ?? '—'}%</div>
      <div>DEMO / SIMULATED</div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-stone-400">{label}</p>
      <p className="font-medium text-stone-800">{value}</p>
    </div>
  );
}
