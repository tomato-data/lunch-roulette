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

  it("should default revealAt to today 12:55 KST when not specified", () => {
    const session = VoteSession.create("점심 투표");

    const today = new Date();
    // KST = UTC+9, 12:55 KST = 03:55 UTC
    const expectedHourUTC = 3;
    const expectedMinute = 55;
    const revealAt = new Date(session.revealAt);

    expect(revealAt.getUTCHours()).toBe(expectedHourUTC);
    expect(revealAt.getUTCMinutes()).toBe(expectedMinute);
    expect(revealAt.getUTCFullYear()).toBe(today.getUTCFullYear());
  });

  it("should use provided revealAt when specified", () => {
    const customRevealAt = "2026-04-01T14:00:00+09:00";
    const session = VoteSession.create("점심 투표", customRevealAt);

    expect(session.revealAt).toBe(new Date(customRevealAt).toISOString());
  });

  it("should return false for isRevealed before revealAt", () => {
    // Set revealAt far in the future
    const futureRevealAt = "2099-12-31T23:59:00+09:00";
    const session = VoteSession.create("점심 투표", futureRevealAt);

    expect(session.isRevealed()).toBe(false);
  });

  it("should return true for isRevealed after revealAt", () => {
    // Set revealAt in the past
    const pastRevealAt = "2020-01-01T00:00:00+09:00";
    const session = VoteSession.create("점심 투표", pastRevealAt);

    expect(session.isRevealed()).toBe(true);
  });
});
