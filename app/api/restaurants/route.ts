import { NextResponse } from "next/server";
import { eq, sql, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { restaurants, reviews } from "@/drizzle/schema";

export async function GET() {
  const db = getDb();
  const rows = db.select().from(restaurants).all();

  const result = rows.map((r) => {
    const avgResult = db
      .select({ avg: sql<number | null>`avg(${reviews.rating})` })
      .from(reviews)
      .where(and(eq(reviews.restaurantId, r.id), sql`${reviews.rating} IS NOT NULL`))
      .get();
    const avgRating = avgResult?.avg ? Math.round(avgResult.avg * 10) / 10 : null;
    return { ...r, avgRating };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.name || body.name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .insert(restaurants)
    .values({
      name: body.name,
      category: body.category ?? null,
      description: body.description ?? null,
    })
    .returning()
    .get();

  return NextResponse.json(row, { status: 201 });
}
