# iOS streak widget

Jack Track includes small and medium **Workout Streak** home screen widgets using
the [Expo SDK 57 widget API](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/).
Both show the current and best streak; medium also shows a Monday–Sunday workout
row, highlights today, dims upcoming days, and shows the completed workout total.
Tapping the widget opens Jack Track.

## Build and add

The widget needs a new native development or production build. Expo Go and an
over-the-air JavaScript update cannot add the extension to an existing app binary.

The `expo-widgets` config plugin generates the extension and shared App Group
(`group.com.anonymous.jacktrack`) during prebuild. Do not edit generated Swift files.
When rebuilding an existing local iOS project, first apply the plugin:

```sh
npx expo prebuild --platform ios
npx expo run:ios --device
```

For cloud builds, configure EAS with `npx eas-cli@latest build:configure`, then use
`npx eas-cli@latest build --platform ios --profile development`. Ensure the Apple
signing team provisions the app and widget extension with the shared App Group.
See [Expo's app extension guide](https://docs.expo.dev/build-reference/app-extensions/).

1. Install the new build and open Jack Track once. Sign in and let workout history load.
2. Long-press an empty area of the iPhone home screen, then choose **Edit → Add Widget**.
3. Search for **Jack Track**, select **Workout Streak**, choose small or medium, and tap **Add Widget**.

## Updates

- A confirmed workout save updates the widget using the same summary saved to Firestore.
- Opening or foregrounding the app refreshes history, including workouts saved on another device.
- Native timeline entries refresh the week at local midnight for seven days even with the app closed.
  A streak stays active if the latest workout was today or yesterday, matching the app.
  After eight days without syncing, the calendar asks you to open the app rather than showing a stale week.
- Signing out or switching accounts replaces the timeline with an empty state.
- iOS controls when widget refreshes appear. Remote workouts and time-zone changes
  require reopening the app; the extension does not connect to Firebase itself.
- Android and web use a no-op implementation. Older development builds remain usable,
  but need rebuilding before widget updates are available.

## Development cache after installation

After adding `expo-widgets`, stop any running Metro server and run `npm run start:clean`.
Fully reload the app after Metro restarts. The widget's `'widget'` directive must be
compiled into a string by Expo's Babel preset. If `createWidget` reports that its
second argument cannot be cast to `String`, an old development transform may still
be loaded. Restarting with a cleared cache rebuilds that transform; Fast Refresh
alone may retain the failed module.

## Device checks

Verify both sizes on a signed iOS build: initial sync, a completed workout, two workouts
on the same day, tap-to-open, sign-out, account switching, and midnight expiry.
Check a large streak count and iOS tinted appearance for readability.

Automated timeline checks: `node --import tsx --test tests/streak-widget.test.ts`.
