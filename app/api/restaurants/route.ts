import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { restaurants } from "@/drizzle/schema";

export async function GET() {
  const db = getDb();
  const rows = db.select().from(restaurants).all();
  return NextResponse.json(rows);
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
