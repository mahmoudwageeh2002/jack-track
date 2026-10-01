import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useAppTheme } from '@/hooks/use-app-theme';
import { radius, spacing } from '@/theme';
import type { Plan } from '../domain/plan';

export function PlanCard({ plan, active = false }: { plan: Plan; active?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/plan/[id]', params: { id: plan.id, active: String(active) } })}>
      {({ pressed }) => (
        <SurfaceCard tone={active ? 'mint' : 'default'} style={[styles.card, pressed && styles.pressed]}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.softMint }]}>
              <AppText variant="button" color="primary" weight="bold">{plan.days.length}</AppText>
            </View>
            <View style={styles.copy}>
              <AppText variant="subtitle" weight="bold">{plan.name}</AppText>
              <AppText variant="small" color="muted" numberOfLines={2}>{plan.description}</AppText>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
          <View style={styles.tags}>
            {active && <Tag label="Selected" />}
            <Tag label={plan.level} />
            <Tag label={plan.goal.replace('_', ' ')} />
            <Tag label={`${plan.days.length} days`} />
          </View>
        </SurfaceCard>
      )}
    </Pressable>
  );
}

function Tag({ label }: { label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.tag, { backgroundColor: colors.surfaceMuted }]}>
      <AppText variant="caption" color="muted" weight="semibold" style={styles.capitalize}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  pressed: { transform: [{ scale: 0.99 }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.round },
  capitalize: { textTransform: 'capitalize' },
});
