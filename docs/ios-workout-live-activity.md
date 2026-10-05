# Workout Live Activity and Dynamic Island

Starting or resuming a workout automatically starts a native iOS Live Activity.
The expanded Dynamic Island and Lock Screen show the current exercise, next exercise,
current set, total completed sets, and an elapsed timer. The compact island shows a
shortened current exercise name and completed/total sets. Touch and hold the island
to see both exercise names; tap it to open `/workout` in Jack Track.

“Current” means the first exercise with an unfinished set in the workout's displayed
order. “Up next” means the next exercise that still has unfinished sets. Completing
or unchecking a set updates these values. When all sets are complete, the activity
asks you to save the workout; it closes after a successful save or signing out.
Going back to another screen keeps it visible. Dismissing it manually prevents it
from being recreated for that same session.

## Native setup already included

This uses the installed `expo-widgets ~57.0.22` and its native Swift ActivityKit
implementation. No new library or hand-edited generated iOS file is necessary.

- `app.json` explicitly enables `ios.infoPlist.NSSupportsLiveActivities`.
- The existing `expo-widgets` config plugin generates `ExpoWidgetsTarget`, including
  `WidgetLiveActivity()` alongside the streak widget in `ios/ExpoWidgetsTarget/index.swift`.
- The app and extension share `group.com.anonymous.jacktrack`.
- EAS already has the extension declaration under `extra.eas.build.experimental.ios.appExtensions`.
- `src/features/widgets/workout-live-activity.tsx` defines the native SwiftUI layout.
- The root `WorkoutLiveActivitySync` observes workout progress and account changes,
  even when the workout screen is not open. It restores the existing ActivityKit ID
  after relaunch and removes activities belonging to an old account or session.

Do **not** add `JackTrackWorkout` to the plugin's `widgets` array. Live Activities
register at runtime through the built-in target; that array is only for widgets.
See the [Expo SDK 57 widget and Live Activity documentation](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/).

## Install on your iPhone

1. Use an iPhone with Dynamic Island to test the island presentations. This app's
   current native deployment target is iOS 16.4. Other compatible iPhones can show
   the Lock Screen activity. Use a development/preview build, not Expo Go.
2. If you already have a development build with the streak widget extension, reload
   it with the new JavaScript first: the native Live Activity target was already
   generated with that extension. Otherwise, build and install a new binary below.
3. Sign in to Expo and register the device if it is not registered yet:

   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest device:create
   ```

4. Build using the existing `development` profile:

   ```bash
   npx eas-cli@latest build --platform ios --profile development
   ```

   Use your Apple Developer team when prompted and let EAS manage signing for both
   the app and `ExpoWidgetsTarget`. Both targets need the same App Group. Ensure the
   Firebase configuration file referenced by `app.json` and the app's environment
   variables are available to the EAS build. See
   [Expo app extension signing](https://docs.expo.dev/build-reference/app-extensions/)
   and [internal device distribution](https://docs.expo.dev/build/internal-distribution/).

5. Install the build using its EAS install link, then start Metro:

   ```bash
   npm run start:clean
   ```

   Open the installed **Jack Track** development client and connect it to Metro.
   Enable iPhone Developer Mode if iOS requests it. Fully reload after clearing Metro
   so the `'widget'` layout compiles to a string for the native extension.
6. In iPhone **Settings → Apps → Jack Track → Live Activities**, enable
   **Allow Live Activities**. On older iOS versions, Jack Track is directly under
   Settings. If iOS asks to allow the activity when it first appears, allow it.
7. Sign in, select a plan, and start a workout. Go to the Home Screen and touch and
   hold the Dynamic Island; also lock the phone to check the banner. Mark sets done
   in the app and verify the current/next exercise changes.

Apple documents [Dynamic Island interaction](https://support.apple.com/guide/iphone/view-live-activities-in-the-dynamic-island-iph28f50d10d/ios)
and [per-app Live Activity settings](https://support.apple.com/guide/iphone/view-live-activities-iph3d92302ee/ios).

## Offline and background behavior

The activity uses the locally saved workout and exercise catalog, so it can start
and update offline after the plan has downloaded. The elapsed timer uses native
SwiftUI date rendering and continues without a JavaScript interval. Set progress
changes when you edit or complete sets in the app; this implementation does not
receive remote progress updates while the app is suspended or terminated.

Local starts happen only while the app is active. If the workout is restored in
the background, creation waits until the app becomes active. After two hours
without new activity data, the UI asks you to reopen Jack Track to resume. iOS still
controls activity lifetime and visibility. Activity failures never block saving a
workout. Android and web use a no-op component.

For a true offline cold-launch test, use an embedded preview build:

```bash
npx eas-cli@latest build --platform ios --profile preview
```

## Verification

Automated lifecycle and exercise-selection tests:

```bash
node --import tsx --test tests/workout-live-activity.test.ts
```

On a signed device, also check long exercise names, compact/expanded/Lock Screen
layouts, finishing early, finishing all sets, unchecking sets, going offline,
backgrounding, relaunching, signing out, switching accounts, disabled Live Activities,
and manually dismissing the activity. Native rendering and signing still require
device verification; a successful JavaScript export is not a signed iOS build.
