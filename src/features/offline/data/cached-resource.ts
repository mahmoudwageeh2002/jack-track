import { offlineStorage } from './offline-storage';
import { useOfflineState } from './connectivity';

export async function cachedResource<T>(uid: string, key: string, fetch: () => Promise<T>, fallback: T): Promise<T> {
  const account = await offlineStorage.read(uid);
  const cached = Object.hasOwn(account.resources, key) ? account.resources[key] as T : fallback;
  if (!useOfflineState.getState().online) return cached;
  let value: T;
  try {
    value = await fetch();
  } catch (error) {
    // Access failures still need attention; a network failure may use the last download.
    const code = (error as { code?: string }).code;
    if (code === 'permission-denied' || code === 'unauthenticated') throw error;
    if (Object.hasOwn(account.resources, key)) return cached;
    throw error;
  }
  try {
    await offlineStorage.cache(uid, key, value);
  } catch {
    useOfflineState.setState({ storageError: 'Could not save your plan or history on this device. Free up storage and refresh before going offline.' });
    throw new Error('Could not save data for offline use. Free up device storage and try again.');
  }
  return value;
}
