import { format } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import type { BodyMeasurement } from '@/features/profile/domain/profile';
import { useAppTheme } from '@/hooks/use-app-theme';

type Metric = 'weightKg' | 'heightCm';

export function WeightChart({ measurements }: { measurements: BodyMeasurement[] }) {
  const { colors } = useAppTheme();
  const [metric, setMetric] = useState<Metric>('weightKg');
  const unit = metric === 'weightKg' ? 'kg' : 'cm';
  const label = metric === 'weightKg' ? 'Weight' : 'Height';
  const first = measurements[0];
  const last = measurements.at(-1);
  const values = measurements.map((entry) => entry[metric]);
  const change = first && last ? Math.round((last[metric] - first[metric]) * 100) / 100 : 0;
  const min = values.length ? Math.min(...values) - 1 : 0;
  const max = values.length ? Math.max(...values) + 1 : 1;
  // Space check-ins evenly so entries on the same day remain distinct.
  const points = measurements.map((entry, index) => ({
    x: measurements.length > 1 ? 44 + index / (measurements.length - 1) * 256 : 172,
    y: 16 + (max - entry[metric]) / (max - min) * 112,
  }));
  const path = points.map(({ x, y }, index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ');
  const sameDay = first?.day === last?.day;
  const dateFormat = sameDay ? 'MMM d, h:mm a' : 'MMM d, yyyy';

  return <SurfaceCard style={styles.card}>
    <View style={styles.heading}>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="subtitle" weight="bold">Measurement progress</AppText>
        <AppText variant="small" color="muted">{measurements.length ? `All ${measurements.length} check-in${measurements.length === 1 ? '' : 's'} · ${unit}` : 'Your progress starts here'}</AppText>
      </View>
      {last && <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <AppText color="primary" weight="semibold">{last[metric]} {unit}</AppText>
        {measurements.length > 1 && <AppText variant="caption" color="muted">{change > 0 ? '+' : ''}{change} {unit} overall</AppText>}
      </View>}
    </View>
    <View style={[styles.toggle, { backgroundColor: colors.surfaceMuted }]} accessibilityRole="tablist">
      {(['weightKg', 'heightCm'] as const).map((value) => <Pressable key={value} accessibilityRole="tab"
        accessibilityState={{ selected: metric === value }} accessibilityLabel={`Show ${value === 'weightKg' ? 'weight' : 'height'} graph`}
        onPress={() => setMetric(value)} style={[styles.option, metric === value && { backgroundColor: colors.primary }]}>
        <AppText variant="small" weight="semibold" color={metric === value ? 'inverse' : 'muted'}>{value === 'weightKg' ? 'Weight' : 'Height'}</AppText>
      </Pressable>)}
    </View>
    {!first || !last ? <AppText color="muted">Add a check-in to start tracking your weight and height.</AppText> : <>
      <View accessible accessibilityLabel={`${label} graph: ${measurements.length} check-ins, starting at ${first[metric]} ${unit}, latest ${last[metric]} ${unit}. Values for each check-in are in measurement history below.`}>
        <Svg width="100%" height={170} viewBox="0 0 320 156">
          {[min, (min + max) / 2, max].map((value) => {
            const y = 16 + (max - value) / (max - min) * 112;
            return <ChartGridLine key={value} value={value} y={y} border={colors.border} text={colors.textMuted} />;
          })}
          <Path d={path} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {points.map(({ x, y }, index) => (points.length <= 60 || index === 0 || index === points.length - 1) &&
            <Circle key={measurements[index].id} cx={x} cy={y} r={4} fill={colors.primary} stroke={colors.surface} strokeWidth={2} />)}
        </Svg>
      </View>
      <View style={styles.heading}>
        <AppText variant="caption" color="muted">{format(first.recordedAt, dateFormat)}</AppText>
        {measurements.length > 1 && <AppText variant="caption" color="muted">{format(last.recordedAt, dateFormat)}</AppText>}
      </View>
      <AppText variant="small" color="muted">{measurements.length === 1 ? 'First check-in saved. Add another entry to see your trend.' : 'Each point is a check-in, from oldest to newest.'}</AppText>
    </>}
  </SurfaceCard>;
}

function ChartGridLine({ value, y, border, text }: { value: number; y: number; border: string; text: string }) {
  return <><Line x1={44} x2={308} y1={y} y2={y} stroke={border} strokeDasharray="4 4" /><SvgText x={0} y={y + 4} fontSize={10} fill={text}>{value.toFixed(1)}</SvgText></>;
}
const styles = StyleSheet.create({
  card: { gap: 16 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  toggle: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  option: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
