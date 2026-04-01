import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DrizzleVoteRepository } from "@/lib/service/drizzle-vote-repository";
import { VoteService } from "@/lib/service/vote-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);
  const { menuItemId, voterName } = await req.json();

  const repo = new DrizzleVoteRepository(getDb());
  const service = new VoteService(repo);

  try {
    await service.castVote({ sessionId, menuItemId, voterName });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 409 });
  }
}
