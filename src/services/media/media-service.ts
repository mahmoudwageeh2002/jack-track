export type UploadedMedia = { url: string; publicId: string };

export interface MediaService {
  uploadImage(fileUri: string): Promise<UploadedMedia>;
  deleteImage(publicId: string): Promise<void>;
}
