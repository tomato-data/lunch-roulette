import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { voteSessions } from "@/drizzle/schema";
import { VoteSession } from "@/lib/domain/vote-session";

const PAGE_SIZE = 5;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const offset = (page - 1) * PAGE_SIZE;

  const db = getDb();

  const countResult = db
    .select({ count: sql<number>`count(*)` })
    .from(voteSessions)
    .get();
  const totalCount = countResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const sessions = db
    .select()
    .from(voteSessions)
    .orderBy(desc(voteSessions.id))
    .limit(PAGE_SIZE)
    .offset(offset)
    .all();

  return NextResponse.json({
    sessions,
    totalCount,
    totalPages,
    currentPage: page,
  });
}

export async function POST(req: Request) {
  const { title, revealAt } = await req.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "제목은 비어있을 수 없습니다" }, { status: 400 });
  }

  const domainSession = VoteSession.create(title, revealAt);

  const session = getDb()
    .insert(voteSessions)
    .values({ title, revealAt: domainSession.revealAt })
    .returning()
    .get();
  return NextResponse.json(session, { status: 201 });
}
