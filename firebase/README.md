# Live training data

For quote push notifications, local reminders, Firebase deployment, and device credentials, see [Notifications setup](./NOTIFICATIONS.md).

Home, Plans and Profile read authenticated Firestore data. Missing documents produce empty states; there are no bundled demo fallbacks.

## Populate the exercise library

The catalog contains 35 common exercises, each with a primary muscle, equipment, a brief and instructions. The app draws a bundled muscle illustration from the primary muscle so it does not depend on placeholder image URLs.

Authenticate Application Default Credentials with an account allowed to write Firestore, or set GOOGLE_APPLICATION_CREDENTIALS to a service-account file kept outside the repository. Never place admin credentials in an EXPO_PUBLIC variable.

Run:

```sh
npm run seed:firebase
```

This creates only missing exercises. Existing exercise documents, user data and plans are preserved. The project defaults to jack-track01; the package script sets that project explicitly.

## Deploy permissions

Using an authenticated Firebase CLI:

```sh
npx firebase-tools deploy --only firestore:rules --project jack-track01
```

The updated rules are required before custom-plan creation works. They allow users to create private, non-official plans under their own ownerId, protect shared official plans, and prevent users assigning themselves an admin role.

## Data layout

- exercises/{exerciseId}: shared exercise catalog, readable by signed-in users; admin writes.
- plans/{planId}: official templates or owner-scoped custom plans.
- users/{uid}.activePlanId: points to the user's selected copy.
- users/{uid}/plans/{planId}: selected plan, including personal set counts.
- users/{uid}/workoutSessions/{sessionId}: actual completed workouts and set results.
- users/{uid}: displayName, photoURL (Cloudinary HTTPS URL), weightKg, heightCm, and updatedAt.
- users/{uid}/progress/{entryId}: weightKg, heightCm, local day, recordedAt, kind="body", and updatedAt. Every new check-in gets a unique ID, including multiple entries on the same day. Retrying a failed save within the sheet reuses its ID. Legacy body-{YYYY-MM-DD} documents remain readable.
- users/{uid}.streak: unique completion days, current and best streaks, total completed workouts, lastCompletedDay, and asOfDay. The current count is a snapshot for asOfDay; screens recalculate from dated workouts so a stale count never extends a streak.

Creating a custom plan atomically saves the top-level plan, its selected copy, and the active pointer. Changing a selected plan's sets updates only the user's selected copy. Custom plans have one to seven training days with Monday=0 through Sunday=6; restDays fills the remaining weekdays. Legacy templates without weekdays rotate by completed session count.

Streaks count consecutive calendar days with at least one completed workout, using the completion-day string captured in the user's local timezone. Multiple workouts in a day count as one streak day. Only completed sets contribute to training volume.

Workout completion and its summary are saved in one transaction. The session ID is reused on retries so a timeout cannot double-count the workout. Reading existing workout history backfills summaries for older accounts. Measurements and their current user fields are saved atomically. Existing owner-only user/progress/workout rules cover these paths.

New workouts prefill weights and reps from the current user's saved `users/{uid}/workoutSessions` history, matching the plan, workout day, exercise ID, and set number. The latest valid completed value for each set wins; skipped sets do not erase earlier values. Added exercises/sets also reuse matching history when available, while new sets without history start empty. Suggestions start incomplete and can be edited or removed. Existing drafts are preserved. Completing a workout saves its new values locally immediately and syncs to Firestore through the existing queue, so the next workout can use them offline; other devices use them after downloading the synced history. No new Firestore collection or migration is needed.

Profile shows a paginated measurement history (newest first) and a graph with Weight/Height toggles based on all saved check-ins. Points are evenly spaced by check-in order so same-day entries stay distinct. Confirmed saves update both views immediately and refresh their Firestore queries. Previously overwritten daily measurements cannot be reconstructed; all new check-ins are preserved separately.

## Profile photos

Set EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local to an unsigned image upload preset for the configured Cloudinary cloud. Restart Expo after changing it. The app uploads selected photos to jack-track/avatars and stores the returned HTTPS URL in Firestore; local device URIs are never persisted. Restrict the preset to image formats and a 10 MB limit in Cloudinary. No Cloudinary API secret belongs in the app.

The Expo ImagePicker config plugin supplies the photo-library permission message and disables unused camera/microphone permissions. Rebuild the native development app for native permission configuration changes. Test full, limited, and denied photo access on a physical device.

## Checks

```sh
node --import tsx --test tests/*.test.ts
npx expo lint
npx tsc --noEmit
```

Device acceptance: new account empty states → create plan → add exercises to every day → set rest days → save → check selected plan and profile → change sets → reopen → log and finish a workout → verify streak and totals → sign out and verify another account does not see private data. Test long-press previews and closing animations on iOS and Android. Android 12+ uses native blur; older Android versions use a dimmed backdrop.
