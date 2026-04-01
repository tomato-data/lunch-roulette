import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { restaurants } from "@/drizzle/schema";
import { deletePhoto } from "@/lib/photo";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();
  const db = getDb();

  const existing = db.select().from(restaurants).where(eq(restaurants.id, Number(id))).get();
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updated = db
    .update(restaurants)
    .set({
      name: body.name ?? existing.name,
      category: body.category ?? existing.category,
      description: body.description ?? existing.description,
      photoPath: body.photoPath ?? existing.photoPath,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(restaurants.id, Number(id)))
    .returning()
    .get();

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();

  const existing = db.select().from(restaurants).where(eq(restaurants.id, Number(id))).get();
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (existing.photoPath) {
    await deletePhoto(existing.photoPath);
  }

  db.delete(restaurants).where(eq(restaurants.id, Number(id))).run();

  return NextResponse.json({ deleted: true });
}
