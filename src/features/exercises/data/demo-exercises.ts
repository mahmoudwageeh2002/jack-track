import type { Exercise, MuscleGroup } from '../domain/exercise';

const cloud = 'https://res.cloudinary.com/dnjdiiktw/image/upload/f_auto,q_auto';
const createdAt = new Date('2026-01-01T00:00:00.000Z');

function exercise(
  id: string,
  name: string,
  primaryMuscle: MuscleGroup,
  equipment: Exercise['equipment'],
  instructions: string[],
  secondaryMuscles: MuscleGroup[] = [],
): Exercise {
  return {
    id,
    name,
    primaryMuscle,
    secondaryMuscles,
    equipment,
    instructions,
    imageUrl: `${cloud}/jack-track/exercises/${id}.gif`,
    imagePublicId: `jack-track/exercises/${id}`,
    createdAt,
    createdBy: 'system',
    status: 'active',
  };
}

export const demoExercises: Exercise[] = [
  exercise('barbell-bench-press', 'Barbell Bench Press', 'chest', 'barbell', [
    'Plant your feet and keep your upper back tight.',
    'Lower the bar to the lower chest with control.',
    'Press up while keeping your wrists stacked.',
  ], ['triceps', 'shoulders']),
  exercise('incline-dumbbell-press', 'Incline Dumbbell Press', 'chest', 'dumbbell', [
    'Set the bench to a low incline.',
    'Lower the dumbbells beside your upper chest.',
    'Press up and slightly inward.',
  ], ['triceps', 'shoulders']),
  exercise('overhead-press', 'Overhead Press', 'shoulders', 'barbell', [
    'Brace your core and squeeze your glutes.',
    'Press the bar overhead in a straight path.',
    'Finish with the bar stacked over shoulders.',
  ], ['triceps']),
  exercise('lateral-raise', 'Lateral Raise', 'shoulders', 'dumbbell', [
    'Keep a soft bend in your elbows.',
    'Raise the weights to shoulder height.',
    'Lower slowly without swinging.',
  ]),
  exercise('triceps-pushdown', 'Triceps Pushdown', 'triceps', 'cable', [
    'Pin your elbows beside your torso.',
    'Extend fully without leaning forward.',
    'Return under control.',
  ]),
  exercise('pull-up', 'Pull-up', 'back', 'bodyweight', [
    'Begin from a controlled dead hang.',
    'Drive elbows down and lift your chest.',
    'Lower to full extension.',
  ], ['biceps']),
  exercise('barbell-row', 'Barbell Row', 'back', 'barbell', [
    'Hinge at the hips with a neutral spine.',
    'Pull the bar toward your lower ribs.',
    'Lower without losing position.',
  ], ['biceps']),
  exercise('lat-pulldown', 'Lat Pulldown', 'back', 'cable', [
    'Set your shoulders down and back.',
    'Pull the bar to the upper chest.',
    'Return until the lats are stretched.',
  ], ['biceps']),
  exercise('barbell-squat', 'Barbell Squat', 'legs', 'barbell', [
    'Brace before unlocking hips and knees.',
    'Descend while keeping the whole foot planted.',
    'Drive the floor away to stand.',
  ], ['core']),
  exercise('romanian-deadlift', 'Romanian Deadlift', 'legs', 'barbell', [
    'Push your hips back with soft knees.',
    'Keep the bar close to your legs.',
    'Stand by driving the hips forward.',
  ], ['back']),
  exercise('leg-press', 'Leg Press', 'legs', 'machine', [
    'Keep your lower back against the pad.',
    'Lower until you reach a comfortable depth.',
    'Press without locking your knees.',
  ]),
  exercise('plank', 'Plank', 'core', 'bodyweight', [
    'Stack elbows below shoulders.',
    'Brace your abs and squeeze your glutes.',
    'Keep a straight line from head to heels.',
  ]),
];

export const exercisesById = Object.fromEntries(
  demoExercises.map((item) => [item.id, item]),
) as Record<string, Exercise>;
