import type { VoteRepository, VoteResult } from "./vote-repository";

interface CastVoteInput {
  sessionId: number;
  menuItemId: number;
  voterName: string;
}

export class VoteService {
  constructor(private repo: VoteRepository) {}

  async castVote(input: CastVoteInput): Promise<void> {
    const status = await this.repo.getSessionStatus(input.sessionId);
    if (status === "closed") {
      throw new Error("종료된 세션에는 투표할 수 없습니다");
    }

    const alreadyVoted = await this.repo.hasVoted(input.sessionId, input.voterName);
    if (alreadyVoted) {
      throw new Error("이미 투표하셨습니다");
    }

    await this.repo.saveVote(input.sessionId, input.menuItemId, input.voterName);
  }

  async getResults(sessionId: number): Promise<VoteResult[]> {
    return this.repo.getResults(sessionId);
  }
}
