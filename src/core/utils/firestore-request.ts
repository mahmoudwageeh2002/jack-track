import { db } from '@/core/config/firebase';

export function requireDatabase() {
  if (!db) throw new Error('Unable to connect to your account. Please try again.');
  return db;
}

// A timed-out write may still sync later. Callers reuse document IDs on retry.
export async function confirmed<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Could not confirm the request. Check your connection and refresh before retrying.')), 15000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
