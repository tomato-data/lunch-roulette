import { NextResponse } from "next/server";
import { like } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { restaurants } from "@/drizzle/schema";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";

  if (!q) {
    return NextResponse.json([]);
  }

  const db = getDb();
  const rows = db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      category: restaurants.category,
    })
    .from(restaurants)
    .where(like(restaurants.name, `%${q}%`))
    .all();

  return NextResponse.json(rows);
}
