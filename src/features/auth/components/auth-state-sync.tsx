import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

import { auth } from '@/core/config/firebase';
import { queryClient } from '@/app/query-client';
import { useWorkoutStore } from '@/features/workout/store/workout-store';
import { useAppDispatch } from '@/core/store';
import { authStateChanged, toAuthUser } from '../store/auth-slice';

export function AuthStateSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!auth) {
      dispatch(authStateChanged(null));
      return;
    }

    let previousUid: string | undefined;
    return onAuthStateChanged(auth, (user) => {
      if (previousUid !== user?.uid) {
        queryClient.clear();
        useWorkoutStore.getState().reset();
        previousUid = user?.uid;
      }
      dispatch(authStateChanged(user ? toAuthUser(user) : null));
    });
  }, [dispatch]);

  return null;
}
