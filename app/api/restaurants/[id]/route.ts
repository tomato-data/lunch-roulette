import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { restaurants, reviews } from "@/drizzle/schema";
import { deletePhoto } from "@/lib/photo";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();

  const restaurant = db.select().from(restaurants).where(eq(restaurants.id, Number(id))).get();
  if (!restaurant) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const avgResult = db
    .select({ avg: sql<number | null>`avg(${reviews.rating})` })
    .from(reviews)
    .where(and(eq(reviews.restaurantId, restaurant.id), sql`${reviews.rating} IS NOT NULL`))
    .get();
  const avgRating = avgResult?.avg ? Math.round(avgResult.avg * 10) / 10 : null;

  return NextResponse.json({ ...restaurant, avgRating });
}

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
