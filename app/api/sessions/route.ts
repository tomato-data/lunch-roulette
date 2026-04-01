import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { voteSessions } from "@/drizzle/schema";

export async function GET() {
  const sessions = getDb().select().from(voteSessions).orderBy(desc(voteSessions.id)).all();
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const { title } = await req.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "제목은 비어있을 수 없습니다" }, { status: 400 });
  }

  const session = getDb().insert(voteSessions).values({ title }).returning().get();
  return NextResponse.json(session, { status: 201 });
}
