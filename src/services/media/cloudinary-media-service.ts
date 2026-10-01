import { env } from '@/core/config/env';
import type { MediaService, UploadedMedia } from './media-service';

export class CloudinaryMediaService implements MediaService {
  async uploadImage(fileUri: string): Promise<UploadedMedia> {
    if (!env.cloudinary.uploadPreset) {
      throw new Error('Set EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET for unsigned mobile uploads.');
    }
    const body = new FormData();
    body.append('file', { uri: fileUri, type: 'image/gif', name: 'exercise.gif' } as never);
    body.append('upload_preset', env.cloudinary.uploadPreset);
    body.append('folder', 'jack-track/exercise-requests');
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
      { method: 'POST', body },
    );
    if (!response.ok) throw new Error('Cloudinary upload failed.');
    const result = (await response.json()) as { secure_url: string; public_id: string };
    return { url: result.secure_url, publicId: result.public_id };
  }

  async deleteImage() {
    throw new Error('Signed deletes must run in a trusted Firebase Function.');
  }
}
