'use client';

import { useState, useCallback, useRef } from 'react';

const MAX_SIDE_PX = 1280;
const JPEG_QUALITY = 0.7;

async function compressImage(file: File): Promise<Blob> {
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

type PhotoEntry = {
  id: string;
  name: string;
  previewUrl: string;
  uploadedUrl: string | null;
  error: string | null;
  uploading: boolean;
};

interface PhotoUploaderProps {
  onUrlsChange: (urls: string[]) => void;
}

export function PhotoUploader({ onUrlsChange }: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const updatePhotos = useCallback(
    (updater: (prev: PhotoEntry[]) => PhotoEntry[]) => {
      setPhotos((prev) => {
        const next = updater(prev);
        const uploadedUrls = next
          .filter((p) => p.uploadedUrl != null)
          .map((p) => p.uploadedUrl as string);
        onUrlsChange(uploadedUrls);
        return next;
      });
    },
    [onUrlsChange],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (files == null || files.length === 0) return;

      const newEntries: PhotoEntry[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file == null) continue;
        if (!file.type.startsWith('image/')) continue;

        const id = `${Date.now()}-${i}`;
        const previewUrl = URL.createObjectURL(file);
        newEntries.push({
          id,
          name: file.name,
          previewUrl,
          uploadedUrl: null,
          error: null,
          uploading: true,
        });
      }

      if (newEntries.length === 0) return;

      updatePhotos((prev) => [...prev, ...newEntries]);

      // Upload each file via the Next.js proxy route (preserves httpOnly auth cookie)
      let entryIdx = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file == null) continue;
        if (!file.type.startsWith('image/')) continue;

        const id = newEntries[entryIdx]?.id;
        entryIdx++;
        if (id == null) continue;

        try {
          let blob: Blob = file;
          try {
            blob = await compressImage(file);
          } catch {
            // compression failed — upload original
          }

          const formData = new FormData();
          formData.append('file', blob, file.name);

          // POST to the Next.js proxy which reads the httpOnly cookie server-side
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            updatePhotos((prev) =>
              prev.map((p) =>
                p.id === id
                  ? { ...p, uploading: false, error: 'Error al subir la foto.' }
                  : p,
              ),
            );
            continue;
          }

          const data: unknown = await res.json();
          const url =
            typeof data === 'object' &&
            data != null &&
            typeof (data as Record<string, unknown>).url === 'string'
              ? (data as Record<string, unknown>).url as string
              : null;

          if (url == null) {
            updatePhotos((prev) =>
              prev.map((p) =>
                p.id === id
                  ? { ...p, uploading: false, error: 'No se recibió URL de la foto.' }
                  : p,
              ),
            );
            continue;
          }

          updatePhotos((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, uploading: false, uploadedUrl: url, error: null }
                : p,
            ),
          );
        } catch {
          updatePhotos((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, uploading: false, error: 'Error de red al subir la foto.' }
                : p,
            ),
          );
        }
      }

      // Reset input so the same file can be selected again
      if (inputRef.current != null) {
        inputRef.current.value = '';
      }
    },
    [updatePhotos],
  );

  const removePhoto = useCallback(
    (id: string) => {
      updatePhotos((prev) => {
        const entry = prev.find((p) => p.id === id);
        if (entry != null) {
          URL.revokeObjectURL(entry.previewUrl);
        }
        return prev.filter((p) => p.id !== id);
      });
    },
    [updatePhotos],
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink uppercase tracking-wide">
        Fotos (opcional)
      </p>

      <label
        htmlFor="photo-input"
        className="flex items-center justify-center w-full rounded-lg border-2 border-dashed border-line bg-surface px-4 py-6 text-sm text-muted cursor-pointer hover:border-navy hover:bg-surface-alt transition-colors focus-within:ring-2 focus-within:ring-navy focus-within:ring-offset-2"
      >
        <span>Seleccionar imágenes</span>
        <input
          ref={inputRef}
          id="photo-input"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void handleFiles(e.target.files);
          }}
        />
      </label>

      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-3" aria-label="Fotos adjuntas">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="relative flex flex-col items-center gap-1"
            >
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-line bg-surface-alt">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                />
                {photo.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <span className="text-xs text-muted font-medium">Subiendo…</span>
                  </div>
                )}
                {photo.uploadedUrl != null && !photo.uploading && (
                  <div className="absolute bottom-0 left-0 right-0 bg-green-600/90 px-1 py-0.5">
                    <span className="text-xs text-white font-medium">OK</span>
                  </div>
                )}
                {photo.error != null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-100/90 p-1">
                    <span className="text-xs text-red-700 font-medium text-center leading-tight">Error</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="text-xs text-red-600 underline hover:text-red-800 focus:outline-none focus:ring-1 focus:ring-red-600 rounded"
                aria-label={`Eliminar foto ${photo.name}`}
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
