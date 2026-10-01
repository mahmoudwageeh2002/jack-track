import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

import { confirmed, requireDatabase } from '@/core/utils/firestore-request';
import type { Exercise } from '../domain/exercise';
import type { ExerciseRepository } from '../domain/exercise-repository';

function mapExercise(id: string, value: Record<string, unknown>): Exercise {
  const createdAt = value.createdAt as { toDate?: () => Date } | undefined;
  return { ...(value as Omit<Exercise, 'id' | 'createdAt'>), id, createdAt: createdAt?.toDate?.() ?? new Date(0) };
}

export class FirebaseExerciseRepository implements ExerciseRepository {
  async getAll() {
    const snapshot = await confirmed(getDocs(query(collection(requireDatabase(), 'exercises'), where('status', '==', 'active'))));
    return snapshot.docs.map((item) => mapExercise(item.id, item.data())).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(id: string) {
    const snapshot = await confirmed(getDoc(doc(requireDatabase(), 'exercises', id)));
    return snapshot.exists() ? mapExercise(snapshot.id, snapshot.data()) : null;
  }
}
