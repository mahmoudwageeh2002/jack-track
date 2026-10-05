# Offline workouts

Sign in and create or select a plan while connected. Jack Track automatically saves
the selected plan, exercise instructions, and workout history on this device.
The home screen shows **Your plan is saved for offline workouts** when ready.
Firebase restores the existing signed-in account when the app starts offline.

While offline you can open your saved plan, edit sets, resume an unfinished workout,
and finish workouts. Completed workouts are saved on the device before the success
message appears. The streak, widget, and progress totals include these local saves.
The status banner shows how many workouts are waiting to sync.

Inside an active workout, tap **Edit workout** to change this session's exercises.
On iOS and Android, hold the grip beside an exercise and drag it to a new position;
the list scrolls automatically near its edges. Move-up/down buttons are also
available, including on web. You can add downloaded exercises, remove exercises,
and change set counts, then tap **Save workout changes**. These edits only affect
the current workout, not the saved plan. Reordering keeps recorded sets intact;
reducing the set count cannot delete a recorded set. Removing an exercise with
recorded data asks for confirmation. Saved edits survive restarting offline and
update the Live Activity's current/next exercise order.

The app uploads queued workouts when it is open and connectivity returns, when it
returns to the foreground, and retries every 30 seconds while active. Tap the status
banner to retry. Failed uploads stay saved locally. Original session IDs and completion
dates are retained, including if a workout syncs several days later. Server transactions
check the existing session to prevent duplicate records and totals after a lost response.

Connectivity is verified with a lightweight, uncached request to NetInfo’s usual
`https://clients3.google.com/generate_204` endpoint. Network changes and returning to
the foreground trigger a check immediately. While active, checks repeat 3 seconds
after an offline result and 30 seconds after an online result; requests time out after
5 seconds. This also detects reconnection when the native network event is missed.
Checks pause in the background. Restored internet dismisses offline sheets, refreshes
cached queries, and triggers queued uploads. Manual retries wait for the check to finish.

No signed-in account, no downloaded plan, or an incomplete download produces a bottom
sheet explaining how to connect, create an account/sign in, and create or select a plan.
Account registration, plan changes, and profile/measurement edits require connectivity.
Creating a plan, editing the profile (including its photo), and adding body measurements
open the shared **Not available offline** sheet instead of their forms. If connectivity
is lost while one of these forms is open, it closes and the same sheet appears.

Data and pending uploads are stored separately for each account. Signing out clears the
visible state but keeps unsynced workouts on this device for the same account’s next login.
They cannot be uploaded under a different account. Uninstalling the app or clearing its
storage removes local-only workouts; sync them first if you want to keep them.

## Verify on a device

Use an installed preview/production build with an embedded JavaScript bundle for a true
offline cold launch. A development client loading JavaScript from Metro still needs access
to Metro at startup; the offline data layer cannot provide that development bundle.
Web data is cached for an already loaded app; this change does not install a web service worker.

1. Sign in, select a plan, and wait for the offline-ready message.
2. Disable internet. Open the plan and a workout, edit sets, then restart the app and resume.
3. Finish the workout. Check the streak and pending-sync banner, then restart again.
4. Reconnect with the app open. Confirm the queue empties and history contains one record.
5. Repeat with two workouts, a midnight boundary, and a connection lost during upload.
6. Sign out offline, or use an account with no plan: verify the setup bottom sheet.
7. Switch accounts with a queued workout: verify it only syncs after the original account signs in.
8. Disconnect/reconnect while the app stays open, then repeat while it is backgrounded.
   Confirm the offline banner and sheet disappear without restarting or tapping retry.

Automated checks: `node --import tsx --test tests/offline-workouts.test.ts tests/connectivity-monitor.test.ts`.
