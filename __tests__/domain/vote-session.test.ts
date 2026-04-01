import { describe, it, expect } from "vitest";
import { VoteSession } from "@/lib/domain/vote-session";

describe("VoteSession", () => {
  it("should create session with valid title in open status", () => {
    const session = VoteSession.create("금요일 점심");

    expect(session.title).toBe("금요일 점심");
    expect(session.isClosed).toBe(false);
  });

  it("should reject empty title", () => {
    expect(() => VoteSession.create("")).toThrowError("제목은 비어있을 수 없습니다");
  });

  it("should reject whitespace-only title", () => {
    expect(() => VoteSession.create("   ")).toThrowError("제목은 비어있을 수 없습니다");
  });

  it("should close an open session", () => {
    const session = VoteSession.create("점심 투표");

    session.close();

    expect(session.isClosed).toBe(true);
  });

  it("should throw when closing already closed session", () => {
    const session = VoteSession.create("점심 투표");
    session.close();

    expect(() => session.close()).toThrowError("이미 종료된 세션입니다");
  });
});
