import { StyleSheet } from 'react-native';
// Brand originals sampled from scoutsdesapotres.org on 2026-11-03.
// Tints and darker green text preserve the palette while keeping text readable.
export const colors = { ink: '#323232', muted: '#6D6D6D', primary: '#CA3737', primaryTint: '#FFF1F1',
  brandGreen: '#0D9523', green: '#08751C', greenTint: '#EDF7EE', yellow: '#FFEE14', yellowTint: '#FFFCE0',
  paper: '#F4F4F4', white: '#FFFFFF', line: '#E8E8E8', danger: '#A12D2D', softDanger: '#FFF0ED' };
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  content: { padding: 20, gap: 20, paddingBottom: 36 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 34, fontWeight: '700', letterSpacing: -0.8 },
  heading: { color: colors.ink, fontSize: 19, lineHeight: 27, fontWeight: '600', letterSpacing: -0.3 },
  body: { color: colors.ink, fontSize: 16, lineHeight: 25 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  separator: { height: 1, backgroundColor: colors.line },
  field: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 14, minHeight: 50, color: colors.ink, backgroundColor: colors.paper, fontSize: 16 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.paper, padding: 20, borderRadius: 16, gap: 12 },
});
