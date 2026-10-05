import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { useAppSelector } from '@/core/store';
import { confirmed, requireDatabase } from '@/core/utils/firestore-request';
import { parseMeasurements, readMeasurement, sortMeasurements, type BodyMeasurement, type UserProfile } from '../domain/profile';
import { cachedResource } from '@/features/offline/data/cached-resource';
import { requireOnline, useOfflineState } from '@/features/offline/data/connectivity';

export function useProfile() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  const ready = useOfflineState((state) => state.ready);
  return useQuery({
    queryKey: ['profile', uid], enabled: !!uid && ready, networkMode: 'always',
    queryFn: () => cachedResource(uid!, 'profile', async (): Promise<UserProfile> => {
      const data = (await confirmed(getDoc(doc(requireDatabase(), 'users', uid!)))).data();
      return {
        displayName: typeof data?.displayName === 'string' ? data.displayName : null,
        photoURL: typeof data?.photoURL === 'string' ? data.photoURL : null,
        weightKg: typeof data?.weightKg === 'number' ? data.weightKg : null,
        heightCm: typeof data?.heightCm === 'number' ? data.heightCm : null,
      };
    }, { displayName: null, photoURL: null, weightKg: null, heightCm: null }),
  });
}

export function useMeasurements() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  const ready = useOfflineState((state) => state.ready);
  return useQuery({
    queryKey: ['measurements', uid], enabled: !!uid && ready, networkMode: 'always',
    queryFn: () => cachedResource(uid!, 'measurements', async (): Promise<BodyMeasurement[]> => {
      const snapshot = await confirmed(getDocs(query(collection(requireDatabase(), 'users', uid!, 'progress'), where('kind', '==', 'body'))));
      return sortMeasurements(snapshot.docs.map((item) => readMeasurement(item.id, item.data()))
        .filter((item): item is BodyMeasurement => item !== null));
    }, []),
  });
}

export async function saveProfile(uid: string, displayName: string, photoURL?: string) {
  requireOnline();
  const name = displayName.trim();
  if (!name || name.length > 80) throw new Error('Enter a name between 1 and 80 characters.');
  await confirmed(setDoc(doc(requireDatabase(), 'users', uid), {
    displayName: name, ...(photoURL ? { photoURL } : {}), updatedAt: serverTimestamp(),
  }, { merge: true }));
}

export function createMeasurement(uid: string, weight: string, height: string): BodyMeasurement {
  const values = parseMeasurements(weight, height);
  const recordedAt = new Date();
  return {
    ...values, recordedAt, day: format(recordedAt, 'yyyy-MM-dd'),
    id: doc(collection(requireDatabase(), 'users', uid, 'progress')).id,
  };
}

export async function saveMeasurements(uid: string, entry: BodyMeasurement) {
  requireOnline();
  const values = parseMeasurements(String(entry.weightKg), String(entry.heightCm));
  const db = requireDatabase();
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid), { ...values, updatedAt: serverTimestamp() }, { merge: true });
  // A fresh ID per check-in preserves same-day entries; retries reuse this ID.
  batch.set(doc(db, 'users', uid, 'progress', entry.id), {
    ...values, day: entry.day, recordedAt: entry.recordedAt, kind: 'body', updatedAt: serverTimestamp(),
  });
  await confirmed(batch.commit());
}
