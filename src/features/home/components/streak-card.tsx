import { addDays, format, startOfWeek } from 'date-fns';
import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { workoutStats } from '@/features/workout/domain/workout-stats';

export function StreakCard({ stats }: { stats: ReturnType<typeof workoutStats> }) {
  const { colors } = useAppTheme();
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return <SurfaceCard tone="dark" style={styles.card}>
    <AppText variant="subtitle" color="inverse" weight="bold">{stats.total ? stats.current + ' day streak' : 'Your streak will appear here'}</AppText>
    <AppText variant="small" color="inverse">{stats.total ? 'One day at a time. Keep showing up.' : 'Complete your first workout to start your streak.'}</AppText>
    <View style={styles.week}>
      {Array.from({ length: 7 }, (_, index) => {
        const date = addDays(start, index);
        const complete = stats.days.includes(format(date, 'yyyy-MM-dd'));
        return <View key={index} style={styles.day} accessibilityLabel={format(date, 'EEEE') + (complete ? ', workout completed' : ', no workout')}>
          <View style={[styles.circle, { backgroundColor: complete ? colors.primary : 'rgba(255,255,255,0.12)' }]}>{complete && <Check size={16} color="white" />}</View>
          <AppText variant="caption" color="inverse">{format(date, 'EEEEE')}</AppText>
        </View>;
      })}
    </View>
  </SurfaceCard>;
}
const styles = StyleSheet.create({
  card: { gap: 12 }, week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  day: { alignItems: 'center', gap: 6 }, circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
