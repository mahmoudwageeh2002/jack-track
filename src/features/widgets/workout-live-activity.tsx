import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint, font, foregroundStyle, frame, lineLimit,
  minimumScaleFactor, monospacedDigit, padding, tint,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
import type { WorkoutActivityProps } from './domain/workout-activity';

const WorkoutLiveActivity = (props: WorkoutActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const accent = environment.isLuminanceReduced ? '#B6E4D3' : '#47D7A6';
  const text = '#ECFFF6';
  const muted = '#A8C4B9';
  const stale = environment.isStale;
  const progress = `${props.completedSets}/${props.totalSets}`;
  const current = stale ? 'Open Jack Track to resume' : props.currentExercise;
  const next = stale ? 'Refresh your workout progress' : props.nextExercise;
  const details = props.allSetsComplete ? 'Ready to save' : `Set ${props.currentSet} of ${props.exerciseSets}`;
  const timer = <Text date={new Date(props.startedAt)} dateStyle="timer" modifiers={[
    font({ size: 14, weight: 'semibold', design: 'rounded' }), monospacedDigit(), foregroundStyle(accent),
  ]} />;
  const exercises = <VStack alignment="leading" spacing={4} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
    <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(accent)]}>{props.allSetsComplete ? 'WORKOUT' : 'CURRENT'}</Text>
    <Text modifiers={[font({ size: 18, weight: 'bold' }), foregroundStyle(text), lineLimit(1), minimumScaleFactor(0.7)]}>{current}</Text>
    <Text modifiers={[font({ size: 12 }), foregroundStyle(muted), lineLimit(1)]}>{`Up next · ${next}`}</Text>
  </VStack>;

  return {
    banner: <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 }), activityBackgroundTint('#0F3A32')]}>
      <HStack spacing={8}>
        <Image systemName="dumbbell.fill" size={18} color={accent} />
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(muted), lineLimit(1)]}>{props.workoutName}</Text>
        <Spacer />
        {timer}
      </HStack>
      {exercises}
      <HStack>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{details}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(accent)]}>{`${progress} sets`}</Text>
      </HStack>
      <ProgressView value={props.completedSets / Math.max(1, props.totalSets)} modifiers={[tint(accent)]} />
    </VStack>,
    compactLeading: <HStack spacing={4}>
      <Image systemName="dumbbell.fill" size={14} color={accent} />
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(text), lineLimit(1), frame({ maxWidth: 70 })]}>{stale ? 'Resume' : props.currentExercise}</Text>
    </HStack>,
    compactTrailing: <Text modifiers={[font({ size: 12, weight: 'semibold' }), monospacedDigit(), foregroundStyle(accent)]}>{progress}</Text>,
    minimal: <Image systemName={props.allSetsComplete ? 'checkmark.circle.fill' : 'dumbbell.fill'} size={16} color={accent} />,
    expandedLeading: <HStack spacing={6}>
      <Image systemName="dumbbell.fill" size={16} color={accent} />
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(muted), lineLimit(1)]}>JACK TRACK</Text>
    </HStack>,
    expandedTrailing: timer,
    expandedBottom: <VStack alignment="leading" spacing={8} modifiers={[padding({ top: 8, bottom: 8 })]}>
      {exercises}
      <HStack>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{details}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(accent)]}>{`${progress} sets`}</Text>
      </HStack>
      <ProgressView value={props.completedSets / Math.max(1, props.totalSets)} modifiers={[tint(accent)]} />
    </VStack>,
  };
};

export default createLiveActivity('JackTrackWorkout', WorkoutLiveActivity);
