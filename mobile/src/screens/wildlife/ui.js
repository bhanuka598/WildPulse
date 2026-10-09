import { StyleSheet } from 'react-native';

export const colors = {
  forest: '#064e3b',
  ink: '#0c120f',
  card: '#14211b',
  text: '#f5f5f4',
  muted: '#a8a29e',
  emerald: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  white: '#ffffff',
};

export const severityColor = {
  LOW: '#a8a29e',
  MEDIUM: '#fbbf24',
  HIGH: '#fb923c',
  CRITICAL: '#f87171',
};

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { backgroundColor: colors.forest, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
  title: { color: colors.white, fontSize: 22, fontWeight: '800' },
  sub: { color: '#a7f3d0', fontSize: 12, marginTop: 4 },
  body: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#1f3d32' },
  label: { color: colors.muted, fontSize: 12 },
  value: { color: colors.text, fontSize: 15, marginTop: 2 },
  button: { backgroundColor: colors.forest, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginTop: 8 },
  buttonText: { color: colors.white, fontWeight: '700', textAlign: 'center' },
  secondary: { backgroundColor: '#1c1917', borderWidth: 1, borderColor: '#44403c' },
  danger: { backgroundColor: '#7f1d1d' },
  banner: { backgroundColor: '#451a03', borderRadius: 12, padding: 10, marginHorizontal: 16, marginTop: 12 },
  bannerText: { color: '#fde68a', fontSize: 12 },
  error: { color: colors.red, fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  input: { backgroundColor: '#1c1917', color: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#44403c', minHeight: 80 },
});
