# Jack Track notifications

Implementation status (2026-10-05): the 12 starter quotes were created in `jack-track01`, and Firestore rules/indexes were deployed. Firebase rejected the functions deployment because the project must upgrade to Blaze. No scheduled quote sender is live yet. FCM/APNs credentials still need to be verified, and new native builds must be installed and tested.

Expo Notifications handles iOS and Android permissions, local reminders, and Expo Push tokens. Firebase stores quotes and runs the scheduled quote sender. Open **Profile → Settings → Notifications** to enable each category, change its time, set quiet hours, or send a local test. All categories start off and preferences belong to the current account on this device.

## Behavior

| Category | Delivery | Default time | Rules |
| --- | --- | --- | --- |
| Daily motivation | Firebase → Expo Push → APNs/FCM | 10:00 | One random active Firestore quote per device/local day; avoid the last seven when possible. Internet and push credentials required. |
| Workout | Local device notification | 20:00 | Training days from the cached active plan, up to seven days ahead. Completing a workout cancels today's reminder, including offline completion. |
| Streak | Local device notification | 22:00 | Only the next known deadline for an existing streak. Completion moves that deadline forward; expired streaks do not produce reminders. |

The current app counts streaks by consecutive calendar days, including rest days. Reminders follow this existing rule. When both local reminders have the same time, only the streak reminder is scheduled. Quiet hours default to 23:00–08:00. Enabled notification times must fall outside quiet hours; matching start and end disables quiet hours.

The app refreshes local schedules on launch, foreground, saved plan/history changes, and while active. Opening the app refreshes the seven-day window. Local reminders keep working without internet after scheduling. Time-zone changes are picked up on foreground. OS power saving, Focus, notification settings, and offline push delivery can delay or suppress notifications; these are reminders, not exact alarms. Changes made on another device apply after this device syncs.

On sign-out/account switch, local reminders are cleared. Remote revocation uses a private installation secret so an offline sign-out can be revoked after reconnecting, even without the old Firebase login. Previously enabled quotes can still arrive before the app reconnects and revokes, or if already handed to APNs/FCM. They contain generic motivation. Foreground notifications and notification taps require the matching signed-in account.

## Firebase setup

Project: `jack-track01`. Functions run in `us-central1` on Node.js 22. Use a supported Node.js version for deployment. Scheduled functions require the **Blaze** billing plan and enabled Cloud Functions, Cloud Build, Artifact Registry, Cloud Run, and Cloud Scheduler APIs. Firebase CLI deploy normally enables the required APIs when the account has permission. See [Firebase scheduled functions](https://firebase.google.com/docs/functions/schedule-functions).

```sh
npm ci --prefix firebase/functions
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes,functions:notifications --project jack-track01
```

Wait for the new Firestore indexes to finish building before testing quote delivery. Deployment creates these functions:

- `registerNotificationDevice`: authenticated callable; validates time zone, times, and push token, then associates the device with the account.
- `revokeNotificationDevice`: callable authorized by the installation secret; can only disable that registration.
- `sendDailyQuotes`: runs every five minutes, creates due delivery jobs, sends quotes, checks receipts, and removes delivery jobs older than 30 days.

The schedule checks every five minutes, so quote delivery can start up to five minutes after the selected time. Deadlines older than 30 minutes are skipped. The first quote time is strictly after registration. A skipped daylight-saving clock time moves to the next valid day.

### Quotes collection

`quotes/{id}` contains:

```json
{
  "text": "A little progress today is still progress.",
  "author": "Jack Track",
  "active": true
}
```

`text` must be nonempty and at most 500 characters. `author` is optional. `active: false` excludes a quote. The seed also records `createdAt`. Twelve original starter quotes use stable IDs `jack-track-01` through `jack-track-12`. Seed only missing documents:

```sh
# Use ADC or GOOGLE_APPLICATION_CREDENTIALS for a private admin credential file.
gcloud auth application-default login
npm run seed:quotes
```

Add/edit quotes in the Firebase console or an admin tool. The mobile app cannot edit the quote library unless its user has the existing admin role. `notificationQuoteDevices` and `notificationQuoteDeliveries` are server-only collections; clients cannot read push tokens, installation hashes, or delivery jobs. Never place an admin credential in an `EXPO_PUBLIC_*` variable or commit it.

## Android push credentials

1. Confirm `google-services.json` belongs to `jack-track01` and Android package `com.anonymous.jacktrack`; it is already referenced by `app.json`.
2. In Firebase/Google Cloud, create or select a service account with permission to send Firebase Cloud Messaging messages and download its private JSON key outside this repository.
3. Run `npx eas-cli@latest credentials --platform android`, choose the build profile, and upload that key under **Google Service Account → Push Notifications (FCM V1)**. `google-services.json` alone is not the server credential.
4. Follow the current [Expo FCM V1 credential guide](https://docs.expo.dev/push-notifications/fcm-credentials/) for account/IAM details. Do not bundle the private service-account key in the app.

## iOS push credentials

1. Use a paid Apple Developer account with access to bundle ID `com.anonymous.jacktrack`.
2. Run `npx eas-cli@latest credentials --platform ios` and configure an Apple Push Notifications key. EAS can also prompt to create the key during the first development build.
3. The `expo-notifications` config plugin supplies the push entitlement. Rebuild with updated provisioning; a JavaScript reload or OTA update cannot add the native module/entitlement.

See [Expo push notification setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).

## Build and test

### Send a manual push without Firebase functions or Blaze

In a development build, sign in and open **Profile → Settings → Notifications**, allow notifications, then tap **Show push test details**. This retrieves an Expo token directly without registering with Firebase. Leave daily motivation off while testing if the functions have not been deployed.

Run from the project folder, replacing both values with those shown in the app:

```sh
npm run notifications:send -- --token 'ExponentPushToken[...]' --uid 'YOUR_USER_ID'
```

This sends one notification directly through Expo Push. The matching user ID is required for this app's foreground display and tap handling. The iOS build must include Expo Notifications, have notification permission, and have working APNs credentials configured in EAS. Background the app or lock the phone to test system display. Firebase scheduling and billing are not used for this command. See [Expo's sending guide](https://docs.expo.dev/push-notifications/sending-notifications/).

The command prints a receipt ID after Expo accepts the message. If nothing arrives, check it later (Expo recommends checking after about 15 minutes):

```sh
npm run notifications:send -- --receipt 'RECEIPT_ID'
```

`InvalidCredentials` means the push credentials need fixing; `DeviceNotRegistered` means retrieve a current token. For a local-only test without APNs, use the existing **Send a test on this device** button.

### Install the native builds

```sh
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client
```

Install the resulting builds on devices. Expo Go is not supported by this feature; older builds show an unavailable message until rebuilt. Generated native folders are ignored by Git, so EAS generates them with the new config plugin.

1. Sign in, load a plan/history, then open **Profile → Settings → Notifications**. Allow notifications, enable the categories you want, and save. For testing, choose times a few minutes ahead and outside quiet hours.
2. Tap **Send a test on this device** to verify local display. This does not verify FCM/APNs credentials or the Firebase sender.
3. Enable daily motivation while online. Reopen settings and confirm **Daily quotes are connected**. Wait for the selected time and a scheduler cycle; inspect Cloud Functions logs and the matching delivery document if it does not arrive.
4. Background the app and test a workout reminder. Complete a workout offline before its scheduled time and confirm cancellation. Verify a streak reminder only appears for an active streak's next deadline.
5. Test permission denial, returning from system Settings, rest days, account switching, sign-out while offline and reconnecting, and notification taps on both platforms.

### Delivery diagnostics

Jobs are keyed by device token hash and local date, making repeated scheduler invocations idempotent at the queue stage. The sender checks the current account/installation, quiet hours, and expiry again before handing off a job. It retries explicit rate-limit/server rejections up to three attempts, checks Expo receipts later, and disables invalid tokens. A lost response or a crash after claiming a job is not blindly retried, because Expo could already have accepted it. Such a job can be `uncertain` or remain `sending`; this favors avoiding duplicates over guaranteed delivery. Expo/APNs/FCM delivery itself is not exactly-once.

`accepted` means Expo issued a ticket; `providerAccepted` means a successful Expo receipt, not that the person saw the notification. `failed`, `cancelled`, `uncertain`, and `receiptExpired` explain other outcomes. Receipt errors such as `InvalidCredentials` require fixing the EAS push credentials. The sender currently uses Expo's default token-based endpoint; if enhanced Expo push security is enabled for the project, add a server-only Expo access token authorization header before enabling that option.

The current job processes up to 200 due devices and 100 queued deliveries per invocation, within a bounded runtime. Monitor backlog and adjust batching/concurrency for a larger audience before launch.

## Automated checks

```sh
node --import tsx --test tests/*.test.ts
npm --prefix firebase/functions test
npm --prefix firebase/functions run check
npx expo lint
npx tsc --noEmit
```

Automated tests cover reminder cancellation, account isolation, opt-in defaults, training/rest days, streak deadlines, quiet hours, tap routing, time zones/DST, quote selection, and retry policy. They do not replace device delivery tests or an end-to-end Firebase scheduler test.
