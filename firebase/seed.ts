import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { exerciseCatalog } from "./exercise-catalog";

const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? "jack-track01";
const app =
  getApps()[0] ??
  initializeApp({ credential: applicationDefault(), projectId });
const database = getFirestore(app);

async function seed() {
  // Fail clearly before opening Firestore if this machine has no admin login.
  await applicationDefault().getAccessToken();
  // Create only missing reference exercises. Never overwrite user data or plans.
  const refs = exerciseCatalog.map((exercise) =>
    database.collection("exercises").doc(exercise.id),
  );
  const existing = await database.getAll(...refs);
  const batch = database.batch();
  let added = 0;
  exerciseCatalog.forEach((exercise, index) => {
    if (existing[index].exists) return;
    batch.create(refs[index], { ...exercise, createdAt: Timestamp.now() });
    added++;
  });
  if (added) await batch.commit();
  console.log(
    "Added " +
      added +
      " exercises; preserved " +
      (exerciseCatalog.length - added) +
      " existing entries in " +
      projectId +
      ".",
  );
}
seed().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
