import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { menuItems } from "@/drizzle/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);
  const items = getDb().select().from(menuItems).where(eq(menuItems.sessionId, sessionId)).all();
  return NextResponse.json(items);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);
  const { name } = await req.json();

  const item = getDb().insert(menuItems).values({ sessionId, name }).returning().get();
  return NextResponse.json(item, { status: 201 });
}
