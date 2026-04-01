import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { voteSessions, votes, menuItems, restaurants, lunchHistory } from "@/drizzle/schema";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);
  const db = getDb();

  const session = db
    .select()
    .from(voteSessions)
    .where(eq(voteSessions.id, sessionId))
    .get();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Check revealAt
  if (session.revealAt && new Date() < new Date(session.revealAt)) {
    return NextResponse.json({ error: "Cannot confirm before reveal time" }, { status: 400 });
  }

  // Check already confirmed
  if (session.confirmedAt) {
    return NextResponse.json({ error: "Already confirmed" }, { status: 409 });
  }

  // Find winning restaurant (most votes)
  const topResult = db
    .select({
      restaurantId: menuItems.restaurantId,
      count: sql<number>`count(*)`,
    })
    .from(votes)
    .innerJoin(menuItems, eq(votes.menuItemId, menuItems.id))
    .where(eq(votes.sessionId, sessionId))
    .groupBy(menuItems.restaurantId)
    .orderBy(sql`count(*) DESC`)
    .limit(1)
    .get();

  if (!topResult) {
    return NextResponse.json({ error: "No votes found" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Increment winCount
  db.update(restaurants)
    .set({ winCount: sql`${restaurants.winCount} + 1` })
    .where(eq(restaurants.id, topResult.restaurantId))
    .run();

  // Save lunch history
  db.insert(lunchHistory)
    .values({
      sessionId,
      restaurantId: topResult.restaurantId,
      visitedAt: now.split("T")[0],
    })
    .run();

  // Mark session as confirmed
  const updated = db
    .update(voteSessions)
    .set({ confirmedAt: now })
    .where(eq(voteSessions.id, sessionId))
    .returning()
    .get();

  return NextResponse.json(updated, { status: 200 });
}
