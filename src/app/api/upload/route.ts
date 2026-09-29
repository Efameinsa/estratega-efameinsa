import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { auth } from "@/server/auth";

// Subida por el servidor (archivos pequeños). Los archivos grandes van directo
// del navegador a Vercel Blob mediante /api/upload/blob.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera 4 MB" }, { status: 413 });
  }

  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const filename = `${randomUUID()}${ext}`;

  // Vercel Blob (producción en Vercel)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`evidencias/${filename}`, file, { access: "public", contentType: file.type || undefined });
    return NextResponse.json({ url: blob.url, name: file.name, size: file.size, mimeType: file.type });
  }

  // Check if R2 binding is available (Cloudflare production)
  const r2 = (process.env as any).R2 as R2Bucket | undefined;

  if (r2) {
    // Production: upload to Cloudflare R2
    const bytes = await file.arrayBuffer();
    await r2.put(filename, bytes, {
      httpMetadata: { contentType: file.type },
    });

    return NextResponse.json({
      url: `/api/files/${filename}`,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    });
  }

  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "Falta configurar Vercel Blob (BLOB_READ_WRITE_TOKEN) para guardar archivos" },
      { status: 501 },
    );
  }

  // Local development: save to filesystem
  const { writeFile, mkdir } = await import("fs/promises");
  const path = await import("path");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  return NextResponse.json({
    url: `/uploads/${filename}`,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  });
}
