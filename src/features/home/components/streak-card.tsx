import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { AppText } from '@/components/ui/app-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { workoutStats } from '@/features/workout/domain/workout-stats';

type Period = 'week' | 'month';

export function StreakCard({ stats }: { stats: ReturnType<typeof workoutStats> }) {
  const { colors } = useAppTheme();
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const reducedMotion = useReducedMotion();
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const start = startOfWeek(period === 'month' ? startOfMonth(anchor) : anchor, { weekStartsOn: 1 });
  const end = endOfWeek(period === 'month' ? endOfMonth(anchor) : anchor, { weekStartsOn: 1 });
  const dates: Date[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) dates.push(date);
  const completedDays = new Set(stats.days);
  const nextAnchor = period === 'month' ? addMonths(anchor, 1) : addWeeks(anchor, 1);
  const canGoNext = (period === 'month' ? startOfMonth(nextAnchor) : startOfWeek(nextAnchor, { weekStartsOn: 1 })) <= today;
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: withTiming(period === 'month' ? 76 : 0, { duration: reducedMotion ? 0 : 220 }) }] }));
  const layout = LinearTransition.duration(reducedMotion ? 0 : 240);
  return <Animated.View layout={layout}><SurfaceCard tone="dark" style={styles.card}>
    <View style={styles.heading}>
      <View style={styles.title}><Flame size={22} color={colors.active} /><AppText variant="subtitle" color="inverse" weight="bold">{stats.current} day{stats.current === 1 ? '' : 's'} streak</AppText></View>
      <AppText variant="small" color="inverse">Best: {stats.best}</AppText>
    </View>
    <AppText variant="small" color="inverse">{stats.total ? 'Every workout is a step forward.' : 'Complete your first workout to start your streak.'}</AppText>
    <View style={styles.toggle} accessibilityRole="tablist">
      <Animated.View style={[styles.indicator, { backgroundColor: colors.primary }, indicator]} />
      {(['week', 'month'] as const).map((value) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: period === value }} accessibilityLabel={'Show ' + value + ' streak'} style={styles.option} onPress={() => setPeriod(value)}>
        <AppText variant="small" weight="semibold" color="inverse">{value === 'week' ? 'Week' : 'Month'}</AppText>
      </Pressable>)}
    </View>
    <View style={styles.navigation}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Previous ' + period} style={styles.arrow} onPress={() => setAnchor(period === 'month' ? addMonths(anchor, -1) : addWeeks(anchor, -1))}><ChevronLeft size={20} color="white" /></Pressable>
      <AppText color="inverse" variant="small" weight="semibold">{period === 'month' ? format(anchor, 'MMMM yyyy') : `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`}</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel={'Next ' + period} accessibilityState={{ disabled: !canGoNext }} disabled={!canGoNext} style={[styles.arrow, { opacity: canGoNext ? 1 : 0.25 }]} onPress={() => setAnchor(nextAnchor)}><ChevronRight size={20} color="white" /></Pressable>
    </View>
    <Animated.View key={period + format(start, 'yyyy-MM-dd')} entering={reducedMotion ? undefined : FadeIn.duration(240)} layout={layout}>
      <View style={styles.grid}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <View key={i} style={styles.weekday}><AppText color="inverse" variant="caption">{day}</AppText></View>)}</View>
      <View style={styles.grid}>
        {dates.map((date) => {
          const key = format(date, 'yyyy-MM-dd');
          const inPeriod = period === 'week' || isSameMonth(date, anchor);
          const complete = completedDays.has(key);
          const isToday = key === todayKey;
          return <View key={key} style={[styles.day, { opacity: inPeriod ? (key > todayKey ? 0.4 : 1) : 0 }]} accessible={inPeriod} accessibilityElementsHidden={!inPeriod}
            accessibilityLabel={`${format(date, 'EEEE, MMMM d')}${isToday ? ', today' : ''}, ${complete ? 'workout completed' : key > todayKey ? 'upcoming' : 'no workout'}`}>
            <View style={[styles.circle, { backgroundColor: complete ? colors.primary : 'rgba(255,255,255,0.08)', borderColor: isToday ? colors.active : 'transparent' }]}>
              <AppText color="inverse" variant="small" weight={complete || isToday ? 'bold' : 'regular'}>{format(date, 'd')}</AppText>
            </View>
            <View style={[styles.dot, { backgroundColor: complete ? colors.active : 'transparent' }]} />
          </View>;
        })}
      </View>
    </Animated.View>
    <View style={styles.legend}><View style={[styles.dot, { backgroundColor: colors.active }]} /><AppText color="inverse" variant="caption">Workout completed</AppText></View>
  </SurfaceCard></Animated.View>;
}
const styles = StyleSheet.create({
  card: { gap: 12 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggle: { flexDirection: 'row', alignSelf: 'flex-start', padding: 4, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' },
  indicator: { position: 'absolute', left: 4, top: 4, width: 76, height: 40, borderRadius: 12 },
  option: { width: 76, height: 40, alignItems: 'center', justifyContent: 'center' },
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.285714%', alignItems: 'center', paddingBottom: 8 },
  day: { width: '14.285714%', alignItems: 'center', gap: 4, paddingVertical: 4 },
  circle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 }, legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
