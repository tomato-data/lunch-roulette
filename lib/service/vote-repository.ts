export interface VoteResult {
  menuItemId: number;
  menuName: string;
  count: number;
}

export interface VoteRepository {
  getSessionStatus(sessionId: number): Promise<"open" | "closed" | null>;
  menuItemExists(sessionId: number, menuItemId: number): Promise<boolean>;
  hasVoted(sessionId: number, userId: string): Promise<boolean>;
  saveVote(sessionId: number, menuItemId: number, userId: string): Promise<void>;
  getResults(sessionId: number): Promise<VoteResult[]>;
}
