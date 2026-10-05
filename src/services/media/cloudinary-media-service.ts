import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';
import { env } from '@/core/config/env';
import type { ImageUploadOptions, MediaService, UploadedMedia } from './media-service';

export class CloudinaryMediaService implements MediaService {
  async uploadImage(fileUri: string, options: ImageUploadOptions = {}): Promise<UploadedMedia> {
    if (!env.cloudinary.uploadPreset) {
      throw new Error('Photo uploads are not configured yet. Please try again later.');
    }
    const body = new FormData();
    if (Platform.OS === 'web') {
      const file = options.file ?? await (await fetch(fileUri)).blob();
      body.append('file', file, options.fileName ?? 'image.jpg');
    } else {
      // Expo fetch reads File bytes; legacy React Native URI objects are unsupported.
      body.append('file', new File(fileUri));
    }
    body.append('upload_preset', env.cloudinary.uploadPreset);
    body.append('folder', options.folder ?? 'jack-track/exercise-requests');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
        { method: 'POST', body, signal: controller.signal },
      );
      if (!response.ok) throw new Error('Cloudinary upload failed.');
      const result = (await response.json()) as { secure_url: string; public_id: string };
      if (!result.secure_url?.startsWith('https://') || !result.public_id) throw new Error('The photo upload could not be confirmed. Please try again.');
      return { url: result.secure_url, publicId: result.public_id };
    } finally {
      clearTimeout(timeout);
    }
  }

  async deleteImage() {
    throw new Error('Signed deletes must run in a trusted Firebase Function.');
  }
}
