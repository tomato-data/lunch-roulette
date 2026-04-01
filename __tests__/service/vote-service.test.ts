import { describe, it, expect, vi } from "vitest";
import { VoteService } from "@/lib/service/vote-service";
import type { VoteRepository } from "@/lib/service/vote-repository";

function createFakeRepository(overrides: Partial<VoteRepository> = {}): VoteRepository {
  return {
    getSessionStatus: async () => "open" as const,
    menuItemExists: async () => true,
    hasVoted: async () => false,
    saveVote: vi.fn(async () => {}),
    getResults: async () => [],
    ...overrides,
  };
}

describe("VoteService", () => {
  it("should cast vote and call saveVote", async () => {
    const repo = createFakeRepository();
    const service = new VoteService(repo);

    await service.castVote({ sessionId: 1, menuItemId: 2, voterName: "Alice" });

    expect(repo.saveVote).toHaveBeenCalledWith(1, 2, "Alice");
  });

  it("should reject vote on closed session", async () => {
    const repo = createFakeRepository({
      getSessionStatus: async () => "closed" as const,
    });
    const service = new VoteService(repo);

    await expect(
      service.castVote({ sessionId: 1, menuItemId: 1, voterName: "Alice" })
    ).rejects.toThrowError("종료된 세션에는 투표할 수 없습니다");
  });

  it("should reject duplicate vote from same voter", async () => {
    const repo = createFakeRepository({
      hasVoted: async () => true,
    });
    const service = new VoteService(repo);

    await expect(
      service.castVote({ sessionId: 1, menuItemId: 1, voterName: "Alice" })
    ).rejects.toThrowError("이미 투표하셨습니다");
  });

  it("should return vote counts per menu item", async () => {
    const repo = createFakeRepository({
      getResults: async () => [
        { menuItemId: 1, menuName: "김치찌개", count: 3 },
        { menuItemId: 2, menuName: "된장찌개", count: 1 },
      ],
    });
    const service = new VoteService(repo);

    const results = await service.getResults(1);

    expect(results).toEqual([
      { menuItemId: 1, menuName: "김치찌개", count: 3 },
      { menuItemId: 2, menuName: "된장찌개", count: 1 },
    ]);
  });
});
