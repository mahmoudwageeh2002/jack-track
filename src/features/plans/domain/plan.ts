export type PlanExercise = {
  exerciseId: string;
  order: number;
  sets: number;
  minReps?: number;
  maxReps?: number;
  restSeconds?: number;
  notes?: string;
};

export type PlanDay = {
  id: string;
  name: string;
  order: number;
  exercises: PlanExercise[];
  /** Monday = 0, Sunday = 6. */
  weekday?: number;
};

export type Plan = {
  id: string;
  name: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  goal: 'muscle_gain' | 'strength' | 'fat_loss';
  days: PlanDay[];
  isOfficial: boolean;
  createdAt: Date;
  ownerId?: string;
  restDays?: number[];
};

export type UserPlan = Plan & {
  ownerId: string;
  sourcePlanId: string | null;
  isCustom: boolean;
};
