import sharp from "sharp";
import { createHash } from "node:crypto";
export interface ProofPhoto { dataUrl: string; hash: string }
/** Reject active formats, excessive pixel counts and animations. Re-encoding strips metadata. */
export async function prepareProofPhoto(file: File): Promise<ProofPhoto> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1 || file.size > 1500000) throw new Error("Use a JPG, PNG or WebP photo under 1.5 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  const options = { limitInputPixels: 24000000, failOn: "warning" as const };
  const metadata = await sharp(input, options).metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1 || (metadata.width ?? 0) < 120 || (metadata.height ?? 0) < 120) throw new Error("Use a clear, still photo at least 120 pixels wide and high.");
  const output = await sharp(input, options).rotate().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).timeout({ seconds: 5 }).toBuffer();
  if (output.byteLength > 1500000) throw new Error("Choose a smaller photo.");
  return { dataUrl: `data:image/jpeg;base64,${output.toString("base64")}`, hash: createHash("sha256").update(output).digest("hex") };
}
export async function boundedForm(request: Request, limit = 3100000): Promise<FormData> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing photos");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new RangeError("Photos too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
}
