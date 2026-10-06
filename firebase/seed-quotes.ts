import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Original Jack Track copy. Stable IDs make this safe to rerun without overwrites.
export const starterQuotes = [
  'A little progress today is still progress.',
  'Show up for the person you are becoming.',
  'Build a routine you can return to, one day at a time.',
  'Focus on your next good set, not someone else’s best.',
  'Your effort counts even when progress feels quiet.',
  'Small, steady actions make room for bigger changes.',
  'Train with patience. Give yourself time to grow.',
  'A fresh start can begin with one simple choice.',
  'Consistency includes knowing when to recover.',
  'Celebrate the work you did, then take the next step.',
  'Listen to your body and keep learning what works for you.',
  'Make today’s goal something you can be proud to finish.',
];
async function seed() {
  await applicationDefault().getAccessToken();
  const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? 'jack-track01';
  const app = getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId });
  const db = getFirestore(app);
  const refs = starterQuotes.map((_, index) => db.collection('quotes').doc(`jack-track-${String(index + 1).padStart(2, '0')}`));
  const existing = await db.getAll(...refs);
  const batch = db.batch();
  let added = 0;
  starterQuotes.forEach((text, index) => {
    if (!existing[index].exists) { batch.create(refs[index], { text, author: 'Jack Track', active: true, createdAt: Timestamp.now() }); added++; }
  });
  if (added) await batch.commit();
  console.log(`Added ${added} quotes; existing documents preserved in ${projectId}.`);
}
seed().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
