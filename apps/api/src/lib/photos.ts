import { S3Client } from "bun";
import { env } from "../env";

const storage = new S3Client({
  accessKeyId: env.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
  bucket: env.STORAGE_BUCKET,
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
});

const UPLOAD_SECONDS = 5 * 60;
const VIEW_SECONDS = 15 * 60;

const isJpeg = (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

export const photos = {
  uploadUrl: (key: string) => storage.presign(key, { method: "PUT", expiresIn: UPLOAD_SECONDS }),
  viewUrl: (key: string) => storage.presign(key, { expiresIn: VIEW_SECONDS, type: "image/jpeg" }),

  async inspect(key: string) {
    const file = storage.file(key);
    if (!(await file.exists())) return null;
    const { size } = await file.stat();
    return {
      size,
      isJpeg: isJpeg(await file.slice(0, 3).bytes()),
    };
  },

  async readAsDataUrl(key: string) {
    const bytes = await storage.file(key).bytes();
    return `data:image/jpeg;base64,${bytes.toBase64()}`;
  },

  remove: (key: string) => storage.delete(key),

  async removeAllFor(noteId: string) {
    const { contents = [] } = await storage.list({ prefix: `notes/${noteId}/` });
    await Promise.all(contents.map(({ key }) => storage.delete(key)));
  },
};
