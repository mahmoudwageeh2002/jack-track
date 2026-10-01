const read = (value: string | undefined) => value?.trim() ?? '';

export const env = {
  firebase: {
    apiKey: read(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
    authDomain: read(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: read(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: read(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: read(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: read(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  },
  cloudinary: {
    cloudName: read(process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME) || 'dnjdiiktw',
    uploadPreset: read(process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET),
  },
} as const;

export const isFirebaseConfigured = Boolean(
  env.firebase.apiKey && env.firebase.projectId && env.firebase.appId,
);
