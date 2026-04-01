import { describe, it, expect } from "vitest";
import { Rating } from "@/lib/domain/rating";

describe("Rating 값 객체", () => {
  it("should reject zero", () => {
    expect(() => Rating.create(0)).toThrow("별점은 1~5 사이여야 합니다");
  });

  it("should reject six", () => {
    expect(() => Rating.create(6)).toThrow("별점은 1~5 사이여야 합니다");
  });

  it("should reject negative", () => {
    expect(() => Rating.create(-1)).toThrow("별점은 1~5 사이여야 합니다");
  });

  it("should reject decimal", () => {
    expect(() => Rating.create(3.5)).toThrow("별점은 1~5 사이여야 합니다");
  });

  it("should equal same value", () => {
    const a = Rating.create(3);
    const b = Rating.create(3);
    expect(a.equals(b)).toBe(true);
  });

  it("should not equal different value", () => {
    const a = Rating.create(3);
    const b = Rating.create(4);
    expect(a.equals(b)).toBe(false);
  });
});
