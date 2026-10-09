import { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../screens/wildlife/ui';

function world(lat, lng, zoom) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  return { x, y };
}

export default function OsmMap({ center, markers = [] }) {
  const zoom = 13;
  const origin = world(center.latitude, center.longitude, zoom);
  const tileX = Math.floor(origin.x);
  const tileY = Math.floor(origin.y);
  const [failed, setFailed] = useState(false);
  const tiles = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      tiles.push({
        key: `${dx}:${dy}`,
        left: `${((dx + 1) / 3) * 100}%`,
        top: `${((dy + 1) / 3) * 100}%`,
        uri: `https://tile.openstreetmap.org/${zoom}/${tileX + dx}/${tileY + dy}.png`,
      });
    }
  }

  return (
    <View>
      <Text style={styles.note}>OpenStreetMap tiles. No paid map key. DEMO coordinates stay labeled.</Text>
      <View style={styles.map}>
        {!failed && tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.uri }}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
            onError={() => setFailed(true)}
          />
        ))}
        {failed && <Text style={styles.fallback}>Map tiles did not load. Coordinates are listed below.</Text>}
        {markers.map((marker) => {
          const point = world(marker.latitude, marker.longitude, zoom);
          const left = `${((point.x - (tileX - 1)) / 3) * 100}%`;
          const top = `${((point.y - (tileY - 1)) / 3) * 100}%`;
          return (
            <View key={marker.id} style={[styles.pin, { left, top, backgroundColor: marker.color || colors.emerald }]}>
              <Text style={styles.pinText}>{marker.label}</Text>
            </View>
          );
        })}
      </View>
      {markers.map((marker) => (
        <Text key={`${marker.id}-c`} style={styles.coord}>
          {marker.label}: {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)} {marker.simulated ? '· DEMO/SIMULATED' : ''}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  map: { width: '100%', aspectRatio: 1, backgroundColor: '#1c1917', borderRadius: 16, overflow: 'hidden', position: 'relative' },
  tile: { position: 'absolute', width: '33.34%', height: '33.34%' },
  pin: { position: 'absolute', minWidth: 28, paddingHorizontal: 4, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' },
  pinText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  fallback: { color: '#fde68a', padding: 16 },
  coord: { color: colors.text, fontSize: 12, marginTop: 6 },
});
