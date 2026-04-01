import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { restaurants } from "@/drizzle/schema";
import { savePhoto, deletePhoto } from "@/lib/photo";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();

  const existing = db.select().from(restaurants).where(eq(restaurants.id, Number(id))).get();
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("photo") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "no photo provided" }, { status: 400 });
  }

  // Delete old photo if exists
  if (existing.photoPath) {
    await deletePhoto(existing.photoPath);
  }

  const filename = await savePhoto(file);

  const updated = db
    .update(restaurants)
    .set({ photoPath: filename, updatedAt: new Date().toISOString() })
    .where(eq(restaurants.id, Number(id)))
    .returning()
    .get();

  return NextResponse.json(updated);
}
