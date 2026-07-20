// Compresses/re-encodes an image file in the browser before upload.
//
// This exists because mobile camera photos caused two problems on the live
// site: (1) they're often 4-12MB, well over the backend's upload limit, and
// slow to send on mobile data; (2) iPhones save camera photos as HEIC by
// default, a format the backend didn't accept. Running every image through
// a canvas here fixes both at once — output is always a reasonably-sized
// JPEG, regardless of what format or resolution the source was.
//
// createImageBitmap with imageOrientation: 'from-image' also takes care of
// EXIF rotation, so photos taken in portrait don't come out sideways.
export async function compressImage(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  if (!file || !file.type?.startsWith('image/')) return file;

  // Small files (already-optimized images, screenshots, etc.) don't need
  // re-encoding — skip the work and avoid a needless quality hit.
  if (file.size <= 800 * 1024) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Browser couldn't decode this file client-side (rare — some older
    // Android WebViews don't support HEIC decode). Fall back to sending
    // the original; the backend's fileFilter now accepts HEIC too, so this
    // still has a reasonable chance of succeeding.
    return file;
  }

  let { width, height } = bitmap;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;

  const newName = file.name.replace(/\.[^./]+$/, '') + '.jpg';
  return new File([blob], newName, { type: 'image/jpeg' });
}
