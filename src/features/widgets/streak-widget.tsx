import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel, containerBackground, font, foregroundStyle, frame,
  lineLimit, minimumScaleFactor, opacity, widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { StreakWidgetProps } from './domain/streak-widget';

const StreakWidget = (props: StreakWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  // This function runs in the widget extension: keep all runtime values inside it.
  const ready = props.status === 'ready';
  const current = props.current ?? 0;
  const medium = environment.widgetFamily === 'systemMedium';
  const accent = '#47D7A6';
  const text = '#ECFFF6';
  const muted = '#A8C4B9';
  const message = props.status === 'signedOut' ? 'Sign in to see your streak'
    : !ready ? 'Open Jack Track to sync'
    : props.completedToday ? 'Workout complete today'
    : current > 0 ? 'Keep it going today'
    : 'Your next streak starts here';

  if (medium) {
    const week = ready ? props.week ?? [] : [];
    const completed = week.filter((day) => day.completed).length;
    return (
      <VStack alignment="leading" spacing={4} modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        containerBackground('#0F3A32', 'widget'), widgetURL('jacktrack:///'),
      ]}>
        <HStack spacing={6}>
          <Image systemName="flame.fill" size={14} color={accent} />
          <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(muted)]}>JACK TRACK</Text>
          <Spacer minLength={0} />
          {ready && <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(accent)]}>{`Best: ${props.best} days`}</Text>}
        </HStack>
        <HStack alignment="firstTextBaseline" spacing={5}>
          <Text modifiers={[font({ size: 30, weight: 'bold', design: 'rounded' }), foregroundStyle(text), lineLimit(1), minimumScaleFactor(0.5)]}>{ready ? String(current) : '–'}</Text>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(text)]}>day streak</Text>
          <Spacer minLength={0} />
          <Text modifiers={[font({ size: 10 }), foregroundStyle(muted)]}>{week.length ? `${completed}/7 days this week` : ''}</Text>
        </HStack>
        <Spacer minLength={0} />
        {week.length > 0 ? <HStack spacing={0} modifiers={[frame({ maxWidth: Infinity })]}>
          {week.map((day) => <VStack key={day.date} spacing={4} modifiers={[
            frame({ maxWidth: Infinity }), opacity(day.isFuture ? 0.4 : 1),
            accessibilityLabel(`${day.date}${day.isToday ? ', today' : ''}, ${day.completed ? 'workout completed' : day.isFuture ? 'upcoming' : 'no workout'}`),
          ]}>
            <Text modifiers={[font({ size: 10, weight: day.isToday ? 'bold' : 'medium' }), foregroundStyle(day.isToday ? accent : muted)]}>{day.label}</Text>
            <Image systemName={day.completed ? 'checkmark.circle.fill' : day.isToday ? 'circle.inset.filled' : 'circle'} size={22} color={day.completed || day.isToday ? accent : muted} />
          </VStack>)}
        </HStack> : <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{ready ? 'Open Jack Track to refresh your week' : message}</Text>}
        <Spacer minLength={0} />
        <HStack spacing={6}>
          <Text modifiers={[font({ size: 10 }), foregroundStyle(muted), lineLimit(1), minimumScaleFactor(0.7)]}>{week.length ? props.weekLabel : ''}</Text>
          <Spacer minLength={0} />
          <Text modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle(accent)]}>{ready ? `${props.total} workout${props.total === 1 ? '' : 's'}` : ''}</Text>
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={4} modifiers={[
      frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
      containerBackground('#0F3A32', 'widget'),
      widgetURL('jacktrack:///'),
    ]}>
      <HStack spacing={6}>
        <Image systemName="flame.fill" size={16} color={accent} />
        <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(muted)]}>JACK TRACK</Text>
        <Spacer />
        {ready && props.completedToday && <Image systemName="checkmark.circle.fill" size={16} color={accent} />}
      </HStack>
      <Spacer minLength={0} />
      <HStack alignment="center" spacing={18}>
        <VStack alignment="leading" spacing={0} modifiers={[accessibilityLabel(ready ? `${current} day streak` : 'Streak unavailable')]}>
          <Text modifiers={[font({ size: 40, weight: 'bold', design: 'rounded' }), foregroundStyle(text), lineLimit(1), minimumScaleFactor(0.5)]}>
            {ready ? String(current) : '–'}
          </Text>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(text)]}>day streak</Text>
        </VStack>
      </HStack>
      <Spacer minLength={0} />
      <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(muted), lineLimit(1), minimumScaleFactor(0.65)]}>
        {message}
      </Text>
      {ready && <Text modifiers={[font({ size: 10 }), foregroundStyle(accent)]}>{`Best: ${props.best} days`}</Text>}
    </VStack>
  );
};

export default createWidget('JackTrackStreak', StreakWidget);
