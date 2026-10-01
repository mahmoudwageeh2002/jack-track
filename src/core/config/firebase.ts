import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

import { env, isFirebaseConfigured } from './env';

let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  const app = getApps().length ? getApp() : initializeApp(env.firebase);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db, isFirebaseConfigured };
