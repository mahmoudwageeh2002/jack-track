import { FirebaseAuthRepository } from '@/features/auth/data/firebase-auth-repository';
import { FirebaseExerciseRepository } from '@/features/exercises/data/firebase-exercise-repository';
import { FirebasePlanRepository } from '@/features/plans/data/firebase-plan-repository';
import { CloudinaryMediaService } from '@/services/media/cloudinary-media-service';

export const container = {
  authRepository: new FirebaseAuthRepository(),
  exerciseRepository: new FirebaseExerciseRepository(),
  planRepository: new FirebasePlanRepository(),
  mediaService: new CloudinaryMediaService(),
};
