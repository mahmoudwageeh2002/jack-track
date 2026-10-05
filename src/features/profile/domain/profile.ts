import { isValid, parseISO } from 'date-fns';

export type UserProfile = {
  displayName: string | null;
  photoURL: string | null;
  weightKg: number | null;
  heightCm: number | null;
};

export type BodyMeasurement = {
  id: string;
  recordedAt: Date;
  day: string;
  weightKg: number;
  heightCm: number;
};

export function readMeasurement(id: string, data: Record<string, unknown>): BodyMeasurement | null {
  if (typeof data.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.day) || !isValid(parseISO(data.day))) return null;
  if (typeof data.weightKg !== 'number' || !Number.isFinite(data.weightKg) || data.weightKg <= 0
    || typeof data.heightCm !== 'number' || !Number.isFinite(data.heightCm) || data.heightCm <= 0) return null;
  const timestamp = data.recordedAt ?? data.updatedAt;
  const date = timestamp instanceof Date ? timestamp
    : timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function' ? timestamp.toDate() : null;
  // Older daily entries keep their original document IDs and saved dates.
  const recordedAt = date instanceof Date && isValid(date) ? date : parseISO(data.day);
  return { id, recordedAt, day: data.day, weightKg: data.weightKg, heightCm: data.heightCm };
}

export function sortMeasurements(entries: BodyMeasurement[]) {
  return [...entries].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime() || a.id.localeCompare(b.id));
}

export function mergeMeasurement(entries: BodyMeasurement[], entry: BodyMeasurement) {
  return sortMeasurements([...entries.filter((item) => item.id !== entry.id), entry]);
}

export function parseMeasurements(weight: string, height: string) {
  const decimal = /^\d+(?:[.,]\d{1,2})?$/;
  const weightKg = Number(weight.trim().replace(',', '.'));
  const heightCm = Number(height.trim().replace(',', '.'));
  if (!decimal.test(weight.trim()) || !Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500) {
    throw new Error('Enter a weight between 20 and 500 kg (up to 2 decimal places).');
  }
  if (!decimal.test(height.trim()) || !Number.isFinite(heightCm) || heightCm < 50 || heightCm > 300) {
    throw new Error('Enter a height between 50 and 300 cm (up to 2 decimal places).');
  }
  return { weightKg, heightCm };
}
