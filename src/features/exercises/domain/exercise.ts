export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable';

export type Exercise = {
  id: string;
  name: string;
  description?: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  imageUrl?: string;
  imagePublicId?: string;
  instructions: string[];
  createdAt: Date;
  createdBy: string;
  status: 'active' | 'inactive';
};
