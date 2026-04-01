import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ReviewService } from "@/lib/service/review-service";
import type { ReviewRepository } from "@/lib/service/review-repository";

function createFakeRepo(overrides: Partial<ReviewRepository> = {}): ReviewRepository {
  return {
    upsertReview: vi.fn(),
    getReviewByDate: vi.fn().mockResolvedValue(null),
    getReviewsByRestaurant: vi.fn().mockResolvedValue([]),
    getAverageRating: vi.fn().mockResolvedValue(null),
    deleteReview: vi.fn(),
    ...overrides,
  };
}

describe("ReviewService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call upsertReview with today's date", async () => {
    const repo = createFakeRepo();
    const service = new ReviewService(repo);

    await service.createOrUpdateReview({
      restaurantId: 1,
      userId: "user-1",
      rating: 4,
      content: "맛있어요",
    });

    expect(repo.upsertReview).toHaveBeenCalledWith({
      restaurantId: 1,
      userId: "user-1",
      rating: 4,
      content: "맛있어요",
      reviewDate: "2026-04-01",
    });
  });

  it("should allow review without content (rating only)", async () => {
    const repo = createFakeRepo();
    const service = new ReviewService(repo);

    await service.createOrUpdateReview({
      restaurantId: 1,
      userId: "user-1",
      rating: 5,
    });

    expect(repo.upsertReview).toHaveBeenCalledWith({
      restaurantId: 1,
      userId: "user-1",
      rating: 5,
      content: undefined,
      reviewDate: "2026-04-01",
    });
  });

  it("should allow review without rating (content only)", async () => {
    const repo = createFakeRepo();
    const service = new ReviewService(repo);

    await service.createOrUpdateReview({
      restaurantId: 1,
      userId: "user-1",
      content: "괜찮아요",
    });

    expect(repo.upsertReview).toHaveBeenCalledWith({
      restaurantId: 1,
      userId: "user-1",
      rating: undefined,
      content: "괜찮아요",
      reviewDate: "2026-04-01",
    });
  });

  it("should reject review with neither rating nor content", async () => {
    const repo = createFakeRepo();
    const service = new ReviewService(repo);

    await expect(
      service.createOrUpdateReview({
        restaurantId: 1,
        userId: "user-1",
      })
    ).rejects.toThrow("별점 또는 노트를 입력해주세요");
  });

  it("should return reviews by restaurant", async () => {
    const reviews = [
      { id: 1, restaurantId: 1, userId: "u1", nickname: "앨리스", rating: 5, content: "최고", reviewDate: "2026-04-01", createdAt: "2026-04-01", updatedAt: "2026-04-01" },
      { id: 2, restaurantId: 1, userId: "u2", nickname: "밥", rating: 3, content: null, reviewDate: "2026-03-31", createdAt: "2026-03-31", updatedAt: "2026-03-31" },
    ];
    const repo = createFakeRepo({
      getReviewsByRestaurant: vi.fn().mockResolvedValue(reviews),
    });
    const service = new ReviewService(repo);

    const result = await service.getReviewsByRestaurant(1);

    expect(result).toEqual(reviews);
    expect(repo.getReviewsByRestaurant).toHaveBeenCalledWith(1);
  });

  it("should return average rating for restaurant", async () => {
    const repo = createFakeRepo({
      getAverageRating: vi.fn().mockResolvedValue(4.2),
    });
    const service = new ReviewService(repo);

    const result = await service.getAverageRating(1);

    expect(result).toBe(4.2);
  });

  it("should return null average when no reviews", async () => {
    const repo = createFakeRepo({
      getAverageRating: vi.fn().mockResolvedValue(null),
    });
    const service = new ReviewService(repo);

    const result = await service.getAverageRating(1);

    expect(result).toBeNull();
  });

  it("should call deleteReview with today's date", async () => {
    const repo = createFakeRepo();
    const service = new ReviewService(repo);

    await service.deleteReview({ restaurantId: 1, userId: "user-1" });

    expect(repo.deleteReview).toHaveBeenCalledWith(1, "user-1", "2026-04-01");
  });

  it("should allow multiple reviews on different dates", async () => {
    const repo = createFakeRepo();
    const service = new ReviewService(repo);

    await service.createOrUpdateReview({
      restaurantId: 1,
      userId: "user-1",
      rating: 4,
      content: "오늘도 맛있음",
      reviewDate: "2026-04-01",
    });

    await service.createOrUpdateReview({
      restaurantId: 1,
      userId: "user-1",
      rating: 3,
      content: "어제는 보통",
      reviewDate: "2026-03-31",
    });

    expect(repo.upsertReview).toHaveBeenCalledTimes(2);
    expect(repo.upsertReview).toHaveBeenCalledWith(
      expect.objectContaining({ reviewDate: "2026-04-01" })
    );
    expect(repo.upsertReview).toHaveBeenCalledWith(
      expect.objectContaining({ reviewDate: "2026-03-31" })
    );
  });
});
