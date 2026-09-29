"use client";

import { upload } from "@vercel/blob/client";

export type UploadedFile = { url: string; name: string; size: number; mimeType: string };

let blobEnabled: Promise<boolean> | null = null;
function isBlobEnabled() {
  blobEnabled ??= fetch("/api/upload/blob")
    .then((r) => (r.ok ? (r.json() as Promise<{ enabled?: boolean }>) : { enabled: false }))
    .then((d: { enabled?: boolean }) => !!d.enabled)
    .catch(() => false);
  return blobEnabled;
}

/** Sube un archivo: directo a Vercel Blob si está configurado; si no, por el servidor. */
export async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<UploadedFile> {
  if (await isBlobEnabled()) {
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const blob = await upload(`evidencias/${safe}`, file, {
      access: "public",
      handleUploadUrl: "/api/upload/blob",
      onUploadProgress: onProgress ? (e) => onProgress(Math.round(e.percentage)) : undefined,
    });
    return { url: blob.url, name: file.name, size: file.size, mimeType: file.type };
  }
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = (await res.json()) as UploadedFile & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "No se pudo subir el archivo");
  onProgress?.(100);
  return data;
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function isImage(mime: string | null | undefined, name?: string) {
  return (mime ?? "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name ?? "");
}
