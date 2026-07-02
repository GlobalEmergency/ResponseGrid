const MAX_SIDE_PX = 1280;
const JPEG_QUALITY = 0.7;

/**
 * Downscale (longest side ≤ 1280px) and re-encode an image as JPEG in the
 * browser, so a phone photo comfortably fits the backend's 5 MB /files limit.
 * Rejects if the canvas isn't available; callers fall back to the original file.
 */
export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_SIDE_PX || height > MAX_SIDE_PX) {
        if (width >= height) {
          height = Math.round((height * MAX_SIDE_PX) / width);
          width = MAX_SIDE_PX;
        } else {
          width = Math.round((width * MAX_SIDE_PX) / height);
          height = MAX_SIDE_PX;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx == null) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob == null) {
            reject(new Error('Canvas toBlob failed'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image load failed'));
    };

    img.src = objectUrl;
  });
}
