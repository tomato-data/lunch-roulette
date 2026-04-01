import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DrizzleVoteRepository } from "@/lib/service/drizzle-vote-repository";
import { VoteService } from "@/lib/service/vote-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);

  const repo = new DrizzleVoteRepository(getDb());
  const service = new VoteService(repo);

  const results = await service.getResults(sessionId);
  return NextResponse.json(results, { status: 200 });
}
