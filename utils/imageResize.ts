const MAX_EDGE = 768;
const JPEG_QUALITY = 0.8;

// Downsize an image in the browser before sending it to the AI: color and mood
// survive a small JPEG, and it keeps the request fast and cheap.
export async function imageFileToPromptDataUrl(file: Blob): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image.');
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Could not read that image.');
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not process that image.');
  // JPEG has no alpha; flatten transparent areas onto white instead of black.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
