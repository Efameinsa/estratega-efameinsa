import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/server/auth";

// Subida directa navegador → Vercel Blob (evita el límite de 4.5 MB del cuerpo
// de las funciones). El servidor solo emite el token tras validar la sesión.
const MAX_BYTES = 50 * 1024 * 1024;

export async function GET() {
  return NextResponse.json({ enabled: !!process.env.BLOB_READ_WRITE_TOKEN, maxBytes: MAX_BYTES });
}

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Vercel Blob no configurado" }, { status: 501 });
  }
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        if (!session?.user) throw new Error("No autenticado");
        return { addRandomSuffix: true, maximumSizeInBytes: MAX_BYTES };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
