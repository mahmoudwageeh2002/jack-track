# Live training data

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

Creating a custom plan atomically saves the top-level plan, its selected copy, and the active pointer. Changing a selected plan's sets updates only the user's selected copy. Custom plans have one to seven training days with Monday=0 through Sunday=6; restDays fills the remaining weekdays. Legacy templates without weekdays rotate by completed session count.

Streaks count consecutive calendar days with at least one completed workout, using the completion-day string captured in the user's local timezone. Multiple workouts in a day count as one streak day. Only completed sets contribute to training volume.

## Checks

```sh
node --import tsx --test tests/training-flow.test.ts
npx expo lint
npx tsc --noEmit
```

Device acceptance: new account empty states → create plan → add exercises to every day → set rest days → save → check selected plan and profile → change sets → reopen → log and finish a workout → verify streak and totals → sign out and verify another account does not see private data. Test long-press previews and closing animations on iOS and Android. Android 12+ uses native blur; older Android versions use a dimmed backdrop.
