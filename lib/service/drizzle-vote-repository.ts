import { eq, and, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { voteSessions, menuItems, votes } from "@/drizzle/schema";
import type { VoteRepository, VoteResult } from "./vote-repository";
import * as schema from "@/drizzle/schema";

export class DrizzleVoteRepository implements VoteRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  async getSessionStatus(sessionId: number): Promise<"open" | "closed" | null> {
    const result = this.db
      .select({ status: voteSessions.status })
      .from(voteSessions)
      .where(eq(voteSessions.id, sessionId))
      .get();
    return (result?.status as "open" | "closed") ?? null;
  }

  async menuItemExists(sessionId: number, menuItemId: number): Promise<boolean> {
    const result = this.db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(and(eq(menuItems.id, menuItemId), eq(menuItems.sessionId, sessionId)))
      .get();
    return !!result;
  }

  async hasVoted(sessionId: number, voterName: string): Promise<boolean> {
    const result = this.db
      .select({ id: votes.id })
      .from(votes)
      .where(and(eq(votes.sessionId, sessionId), eq(votes.voterName, voterName)))
      .get();
    return !!result;
  }

  async saveVote(sessionId: number, menuItemId: number, voterName: string): Promise<void> {
    this.db.insert(votes).values({ sessionId, menuItemId, voterName }).run();
  }

  async getResults(sessionId: number): Promise<VoteResult[]> {
    const results = this.db
      .select({
        menuItemId: votes.menuItemId,
        menuName: menuItems.name,
        count: sql<number>`count(*)`,
      })
      .from(votes)
      .innerJoin(menuItems, eq(votes.menuItemId, menuItems.id))
      .where(eq(votes.sessionId, sessionId))
      .groupBy(votes.menuItemId)
      .all();
    return results;
  }
}
