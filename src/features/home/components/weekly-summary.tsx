import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { SurfaceCard } from '@/components/ui/surface-card';

export function WeeklySummary({ workouts, volume }: { workouts: number; volume: number }) {
  return <View style={{ flexDirection: 'row', gap: 12 }}>
    {[{ value: workouts, label: 'Workouts this week' }, { value: volume.toLocaleString(), label: 'Volume this week · kg' }].map((item) =>
      <SurfaceCard key={item.label} tone="muted" style={{ flex: 1, gap: 10 }}><AppText variant="subtitle" weight="bold">{item.value}</AppText><AppText variant="small" color="muted">{item.label}</AppText></SurfaceCard>)}
  </View>;
}
