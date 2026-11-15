const toText = (bytes: Uint8Array) => bytes.toBase64({ alphabet: "base64url", omitPadding: true });
const toBytes = (text: string) => Uint8Array.fromBase64(text, { alphabet: "base64url" });

//generate a key of 32 random bytes = 43 characters of base64Url
export const newLetterKey = () => toText(crypto.getRandomValues(new Uint8Array(32)));

//let the browser's crypto use it
function asCryptoKey(key: string) {
  return crypto.subtle.importKey("raw", toBytes(key), "AES-GCM", false, ["encrypt", "decrypt"]);
}

//now the resolving from "Hello Somebody..." to "<v1>.<iv>.<sealed words>"
export async function lockWords(words: string, key: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await asCryptoKey(key),
    new TextEncoder().encode(words),
  );
  return `v1.${toText(iv)}.${toText(new Uint8Array(sealed))}`;
}

//the vice-versa of above function + if key is wrong, or any character was altered, then throw an error
export async function unlockWords(box: string, key: string): Promise<string> {
  const [version, iv, sealed] = box.split(".");
  if (version !== "v1" || !iv || !sealed) throw new Error("This is not a locked letter");
  const words = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBytes(iv) },
    await asCryptoKey(key),
    toBytes(sealed),
  );
  return new TextDecoder().decode(words);
}
