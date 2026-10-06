// Manual Expo Push test. No Firebase functions or scheduler are required.
import { parseArgs } from 'node:util';

async function main() {
  const { values } = parseArgs({ options: {
    token: { type: 'string' }, uid: { type: 'string' }, receipt: { type: 'string' },
    title: { type: 'string', default: 'Jack Track test' },
    body: { type: 'string', default: 'Your push notifications are working!' },
    help: { type: 'boolean' }, 'dry-run': { type: 'boolean' },
  } });
  if (values.help) {
    console.log(`Send one test notification:
  npm run notifications:send -- --token 'ExponentPushToken[...]' --uid 'YOUR_USER_ID'

Check its receipt later without sending again:
  npm run notifications:send -- --receipt 'RECEIPT_ID'

Optional: --title 'Title' --body 'Message' --dry-run
EXPO_ACCESS_TOKEN is supported if enhanced Expo push security is enabled.`);
    return;
  }
  if (!values.receipt && (!values.token || !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(values.token) || !values.uid?.trim())) {
    throw new Error('Provide --token and --uid from the app’s development notification settings. Use --help for examples.');
  }
  const payload = values.receipt ? { ids: [values.receipt] } : {
    to: values.token, title: values.title, body: values.body, sound: 'default', channelId: 'quotes',
    ttl: 300, data: { kind: 'quote', uid: values.uid },
  };
  if (values['dry-run']) { console.log(JSON.stringify(payload, null, 2)); return; }
  const response = await fetch(`https://exp.host/--/api/v2/push/${values.receipt ? 'getReceipts' : 'send'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json',
      ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Expo returned HTTP ${response.status}. No automatic retry was sent.`);
  const result = await response.json();
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join('; '));
  const item = values.receipt ? result.data?.[values.receipt] : Array.isArray(result.data) ? result.data[0] : result.data;
  if (values.receipt && !item) { console.log('Receipt is not available yet. Try checking again in about 15 minutes.'); return; }
  if (item?.status !== 'ok') throw new Error(`${item?.details?.error ?? 'PushError'}: ${item?.message ?? 'No valid response from Expo.'}`);
  if (values.receipt) console.log('APNs/FCM accepted the notification. This does not confirm it was displayed or read.');
  else {
    console.log('Expo accepted the test notification. Device delivery is not yet confirmed.');
    console.log(`Receipt ID: ${item.id}`);
    console.log('Check later with: npm run notifications:send -- --receipt <RECEIPT_ID>');
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
