export const newShareToken = () =>
  crypto.getRandomValues(new Uint8Array(16)).toBase64({ alphabet: "base64url", omitPadding: true });
