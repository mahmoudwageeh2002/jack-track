import { format } from 'date-fns';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GlassButton } from '@/components/ui/glass-button';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { BodyMeasurement } from '../domain/profile';

const PAGE_SIZE = 5;

export function MeasurementHistory({ measurements, onAdd }: { measurements: BodyMeasurement[]; onAdd: () => void }) {
  const { colors } = useAppTheme();
  const [page, setPage] = useState(0);
  const newestFirst = [...measurements].reverse();
  const pages = Math.max(1, Math.ceil(newestFirst.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = newestFirst.slice(start, start + PAGE_SIZE);

  return <SurfaceCard style={styles.card}>
    <AppText variant="subtitle" weight="bold">Measurement history</AppText>
    <View style={styles.heading}><AppText variant="small" color="muted" style={{ flex: 1 }}>{measurements.length} check-in{measurements.length === 1 ? '' : 's'} · Newest first</AppText>
      <GlassButton compact variant="secondary" label="Add entry" onPress={onAdd} />
    </View>
    {!visible.length ? <AppText color="muted">Your previous weights and heights will appear here after your first check-in.</AppText> : <>
      <View style={styles.row}>
        <AppText variant="caption" color="muted" style={styles.date}>Date & time</AppText>
        <AppText variant="caption" color="muted" style={styles.value}>Weight (kg)</AppText>
        <AppText variant="caption" color="muted" style={styles.value}>Height (cm)</AppText>
      </View>
      {visible.map((entry) => <View key={entry.id} style={[styles.row, styles.entry, { borderColor: colors.border }]}
        accessible accessibilityLabel={`${format(entry.recordedAt, 'MMMM d, yyyy, h:mm a')}, weight ${entry.weightKg} kilograms, height ${entry.heightCm} centimeters`}>
        <View style={[styles.date, { gap: 4 }]}>
          <AppText variant="small" weight="semibold">{format(entry.recordedAt, 'MMM d, yyyy')}</AppText>
          <AppText variant="caption" color="muted">{format(entry.recordedAt, 'h:mm a')}{entry.id === newestFirst[0].id ? ' · Latest' : ''}</AppText>
        </View>
        <AppText weight="semibold" style={styles.value}>{entry.weightKg}</AppText>
        <AppText weight="semibold" style={styles.value}>{entry.heightCm}</AppText>
      </View>)}
      {pages > 1 && <>
        <AppText variant="caption" color="muted">Showing {start + 1}–{Math.min(start + PAGE_SIZE, measurements.length)} of {measurements.length}</AppText>
        <View style={styles.heading}>
          <GlassButton compact label="Newer" variant="ghost" disabled={currentPage === 0} onPress={() => setPage(currentPage - 1)} />
          <GlassButton compact label="Older" variant="ghost" disabled={currentPage === pages - 1} onPress={() => setPage(currentPage + 1)} />
        </View>
      </>}
    </>}
  </SurfaceCard>;
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entry: { borderTopWidth: 1, paddingTop: 14 },
  date: { flex: 1.5 },
  value: { flex: 1, textAlign: 'right' },
});
