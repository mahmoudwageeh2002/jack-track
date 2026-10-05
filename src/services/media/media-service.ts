export type UploadedMedia = { url: string; publicId: string };
export type ImageUploadOptions = { mimeType?: string; fileName?: string; file?: File; folder?: string };

export interface MediaService {
  uploadImage(fileUri: string, options?: ImageUploadOptions): Promise<UploadedMedia>;
  deleteImage(publicId: string): Promise<void>;
}
