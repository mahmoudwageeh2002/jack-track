import type { Plan, PlanDay, PlanExercise } from '../domain/plan';

const createdAt = new Date('2026-01-01T00:00:00.000Z');

function move(
  exerciseId: string,
  order: number,
  sets: number,
  minReps: number,
  maxReps = minReps,
  restSeconds = 90,
): PlanExercise {
  return { exerciseId, order, sets, minReps, maxReps, restSeconds };
}

function day(id: string, name: string, order: number, exercises: PlanExercise[]): PlanDay {
  return { id, name, order, exercises };
}

export const demoPlans: Plan[] = [
  {
    id: 'push-pull-legs',
    name: 'Push Pull Legs',
    description: 'A balanced three-day split for steady muscle and strength progress.',
    level: 'intermediate',
    goal: 'muscle_gain',
    isOfficial: true,
    createdAt,
    days: [
      day('ppl-push', 'Push Day', 1, [
        move('barbell-bench-press', 1, 4, 6, 8, 150),
        move('incline-dumbbell-press', 2, 3, 8, 10, 120),
        move('overhead-press', 3, 3, 6, 8, 120),
        move('lateral-raise', 4, 3, 12, 15, 60),
        move('triceps-pushdown', 5, 3, 10, 12, 60),
      ]),
      day('ppl-pull', 'Pull Day', 2, [
        move('pull-up', 1, 4, 6, 10, 120),
        move('barbell-row', 2, 4, 6, 8, 150),
        move('lat-pulldown', 3, 3, 10, 12, 90),
      ]),
      day('ppl-legs', 'Leg Day', 3, [
        move('barbell-squat', 1, 4, 5, 8, 180),
        move('romanian-deadlift', 2, 3, 8, 10, 150),
        move('leg-press', 3, 3, 10, 12, 120),
      ]),
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    description: 'Four focused sessions with simple recovery-friendly progression.',
    level: 'beginner',
    goal: 'strength',
    isOfficial: true,
    createdAt,
    days: [
      day('ul-upper-a', 'Upper A', 1, [
        move('barbell-bench-press', 1, 4, 5, 6, 180),
        move('barbell-row', 2, 4, 6, 8, 150),
        move('overhead-press', 3, 3, 6, 8, 120),
      ]),
      day('ul-lower-a', 'Lower A', 2, [
        move('barbell-squat', 1, 4, 5, 6, 180),
        move('romanian-deadlift', 2, 3, 6, 8, 150),
        move('plank', 3, 3, 30, 45, 60),
      ]),
    ],
  },
  {
    id: 'full-body-foundation',
    name: 'Full Body Foundation',
    description: 'Three efficient weekly sessions for new lifters.',
    level: 'beginner',
    goal: 'muscle_gain',
    isOfficial: true,
    createdAt,
    days: [
      day('fb-a', 'Full Body A', 1, [
        move('barbell-squat', 1, 3, 8, 10, 120),
        move('barbell-bench-press', 2, 3, 8, 10, 120),
        move('lat-pulldown', 3, 3, 10, 12, 90),
        move('plank', 4, 3, 30, 45, 60),
      ]),
    ],
  },
  {
    id: 'lean-and-strong',
    name: 'Lean & Strong',
    description: 'Moderate rests and full-body training for body composition goals.',
    level: 'intermediate',
    goal: 'fat_loss',
    isOfficial: true,
    createdAt,
    days: [
      day('ls-circuit', 'Strength Circuit', 1, [
        move('leg-press', 1, 3, 12, 15, 75),
        move('incline-dumbbell-press', 2, 3, 10, 12, 75),
        move('barbell-row', 3, 3, 10, 12, 75),
        move('lateral-raise', 4, 3, 15, 20, 45),
        move('plank', 5, 3, 30, 60, 45),
      ]),
    ],
  },
];
