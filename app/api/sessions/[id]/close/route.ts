import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { voteSessions } from "@/drizzle/schema";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);

  getDb()
    .update(voteSessions)
    .set({ status: "closed" })
    .where(eq(voteSessions.id, sessionId))
    .run();

  const session = getDb()
    .select()
    .from(voteSessions)
    .where(eq(voteSessions.id, sessionId))
    .get();

  return NextResponse.json(session, { status: 200 });
}
