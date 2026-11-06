const LONGEST_SIDE = 1600;
const JPEG_QUALITY = 0.85;

export async function shrinkPhoto(file: File): Promise<Blob> {
  const image = await createImageBitmap(file).catch(() => {
    throw new Error("That file couldn't be read as a photo. Try a JPEG or PNG.");
  });

  const scale = Math.min(1, LONGEST_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser couldn't prepare the photo");

  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("This browser couldn't prepare the photo")),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
