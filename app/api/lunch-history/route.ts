import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { lunchHistory, restaurants } from "@/drizzle/schema";

export async function GET() {
  const db = getDb();
  const rows = db
    .select({
      id: lunchHistory.id,
      sessionId: lunchHistory.sessionId,
      restaurantId: lunchHistory.restaurantId,
      restaurantName: restaurants.name,
      category: restaurants.category,
      visitedAt: lunchHistory.visitedAt,
    })
    .from(lunchHistory)
    .innerJoin(restaurants, eq(lunchHistory.restaurantId, restaurants.id))
    .orderBy(desc(lunchHistory.visitedAt))
    .all();

  return NextResponse.json(rows);
}
