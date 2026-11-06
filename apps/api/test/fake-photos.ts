//a pretend storage bucket that lives in memory, so tests never need the internet

export const stored = new Map<string, Uint8Array>();

export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

export const fakePhotos = {
  uploadUrl: (key: string) => `https://storage.test/upload/${key}`,
  viewUrl: (key: string) => `https://storage.test/view/${key}`,

  async inspect(key: string) {
    const bytes = stored.get(key);
    if (!bytes) return null;
    return { size: bytes.length, isJpeg: bytes[0] === 0xff && bytes[1] === 0xd8 };
  },

  async readAsDataUrl(key: string) {
    const bytes = stored.get(key);
    if (!bytes) throw new Error("No such photo");
    return `data:image/jpeg;base64,${bytes.toBase64()}`;
  },

  async remove(key: string) {
    stored.delete(key);
  },

  async removeAllFor(noteId: string) {
    for (const key of stored.keys()) {
      if (key.startsWith(`notes/${noteId}/`)) stored.delete(key);
    }
  },
};
