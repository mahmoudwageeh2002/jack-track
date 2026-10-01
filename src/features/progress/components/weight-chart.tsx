import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useAppTheme } from '@/hooks/use-app-theme';
import { spacing } from '@/theme';

export function WeightChart() {
  const { colors } = useAppTheme();
  const points = [[4, 38], [48, 44], [92, 58], [136, 54], [180, 74], [224, 84], [268, 98], [310, 104]];
  const path = points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.copy}><AppText variant="subtitle" weight="bold">Weight progress</AppText><AppText variant="small" color="muted">Last 8 weeks</AppText></View>
        <AppText variant="label" color="primary" weight="semibold">−4.2 kg</AppText>
      </View>
      <Svg width="100%" height={130} viewBox="0 0 314 120">
        <Defs><LinearGradient id="weight" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={colors.active} /><Stop offset="1" stopColor={colors.primary} /></LinearGradient></Defs>
        <Path d={path} fill="none" stroke="url(#weight)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([x, y]) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={4} fill={colors.primary} />)}
      </Svg>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm },
  heading: { minHeight: 70, flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, gap: 2 },
});
