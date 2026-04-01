import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { voteSessions } from "@/drizzle/schema";
import { DrizzleVoteRepository } from "@/lib/service/drizzle-vote-repository";
import { VoteService } from "@/lib/service/vote-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);

  const db = getDb();

  // Check revealAt
  const session = db
    .select({ revealAt: voteSessions.revealAt })
    .from(voteSessions)
    .where(eq(voteSessions.id, sessionId))
    .get();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.revealAt && new Date() < new Date(session.revealAt)) {
    return NextResponse.json({ error: "Results not yet available" }, { status: 403 });
  }

  const repo = new DrizzleVoteRepository(db);
  const service = new VoteService(repo);

  const results = await service.getResults(sessionId);
  return NextResponse.json(results, { status: 200 });
}
