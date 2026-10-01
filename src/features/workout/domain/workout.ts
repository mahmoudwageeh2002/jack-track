export type WorkoutSet = {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
  estimatedOneRepMax?: number;
};

export type WorkoutExercise = {
  exerciseId: string;
  sets: WorkoutSet[];
};

export type WorkoutSession = {
  id: string;
  userId: string;
  planId: string;
  planDayId: string;
  startedAt: Date;
  completedAt?: Date;
  completedDay?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  exercises: WorkoutExercise[];
};
