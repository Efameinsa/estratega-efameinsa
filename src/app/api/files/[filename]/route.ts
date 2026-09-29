import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const r2 = (process.env as any).R2 as R2Bucket | undefined;

  if (!r2) {
    return NextResponse.json({ error: "R2 not available" }, { status: 501 });
  }

  const object = await r2.get(filename);
  if (!object) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const headers = new Headers();
  if (object.httpMetadata?.contentType) {
    headers.set("Content-Type", object.httpMetadata.contentType);
  }
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new NextResponse(object.body as ReadableStream, { headers });
}
