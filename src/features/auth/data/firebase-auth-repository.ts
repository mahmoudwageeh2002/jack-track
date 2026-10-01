import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '@/core/config/firebase';
import type { AuthRepository, RegisterInput } from '../domain/auth-repository';

function requireAuth() {
  if (!auth) {
    throw new Error('Firebase is not configured. Add the EXPO_PUBLIC_FIREBASE_* values.');
  }
  return auth;
}

export class FirebaseAuthRepository implements AuthRepository {
  getCurrentUser() {
    return auth?.currentUser ?? null;
  }

  async logIn(email: string, password: string) {
    const result = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
    return result.user;
  }

  async register(input: RegisterInput) {
    const result = await createUserWithEmailAndPassword(
      requireAuth(),
      input.email.trim(),
      input.password,
    );

    // Auth account creation is the registration success boundary. Firestore
    // writes can stay pending while the client is offline or cannot reach the
    // database, so they must not prevent the app from leaving this screen.
    void updateProfile(result.user, { displayName: input.name.trim() }).catch(
      (error: unknown) => console.warn('Could not update the auth profile.', error),
    );

    if (db) {
      void setDoc(doc(db, 'users', result.user.uid), {
        displayName: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: 'user',
        createdAt: serverTimestamp(),
      }, { merge: true }).catch((error: unknown) => {
        console.warn('Could not sync the user profile to Firestore.', error);
      });
    }

    return result.user;
  }

  logOut() {
    return signOut(requireAuth());
  }

  resetPassword(email: string) {
    return sendPasswordResetEmail(requireAuth(), email.trim());
  }
}
