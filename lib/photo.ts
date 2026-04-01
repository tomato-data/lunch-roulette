import path from "path";
import { writeFile, unlink, mkdir } from "fs/promises";

export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "restaurants");

export function generatePhotoFilename(originalFilename: string): string {
  const ext = originalFilename.substring(originalFilename.lastIndexOf("."));
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${unique}${ext}`;
}

export function getPhotoUrl(filename: string): string {
  return `/uploads/restaurants/${filename}`;
}

export async function savePhoto(file: File): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = generatePhotoFilename(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return filename;
}

export async function deletePhoto(filename: string): Promise<void> {
  try {
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // file may not exist, ignore
  }
}
