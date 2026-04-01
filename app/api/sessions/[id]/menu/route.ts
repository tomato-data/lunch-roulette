import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { menuItems, restaurants } from "@/drizzle/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);
  const db = getDb();
  const items = db
    .select({
      id: menuItems.id,
      sessionId: menuItems.sessionId,
      restaurantId: menuItems.restaurantId,
      name: menuItems.name,
      category: restaurants.category,
    })
    .from(menuItems)
    .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
    .where(eq(menuItems.sessionId, sessionId))
    .all();
  return NextResponse.json(items);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);
  const { restaurantId } = await req.json();

  const db = getDb();

  // Check restaurant exists
  const restaurant = db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .get();
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // Check duplicate
  const existing = db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.sessionId, sessionId), eq(menuItems.restaurantId, restaurantId)))
    .get();
  if (existing) {
    return NextResponse.json({ error: "Restaurant already added to session" }, { status: 409 });
  }

  const item = db
    .insert(menuItems)
    .values({ sessionId, restaurantId, name: restaurant.name })
    .returning()
    .get();

  return NextResponse.json({ ...item, category: restaurant.category }, { status: 201 });
}
