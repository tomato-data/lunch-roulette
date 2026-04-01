import type { ReviewRepository, ReviewRecord } from "./review-repository";
import { Rating } from "../domain/rating";

interface CreateOrUpdateReviewInput {
  restaurantId: number;
  userId: string;
  rating?: number;
  content?: string;
}

interface DeleteReviewInput {
  restaurantId: number;
  userId: string;
}

export class ReviewService {
  constructor(private repo: ReviewRepository) {}

  async createOrUpdateReview(input: CreateOrUpdateReviewInput): Promise<void> {
    if (input.rating == null && !input.content) {
      throw new Error("별점 또는 노트를 입력해주세요");
    }

    if (input.rating != null) {
      Rating.create(input.rating);
    }

    await this.repo.upsertReview({
      restaurantId: input.restaurantId,
      userId: input.userId,
      rating: input.rating,
      content: input.content,
    });
  }

  async getReviewsByRestaurant(restaurantId: number): Promise<ReviewRecord[]> {
    return this.repo.getReviewsByRestaurant(restaurantId);
  }

  async getAverageRating(restaurantId: number): Promise<number | null> {
    return this.repo.getAverageRating(restaurantId);
  }

  async deleteReview(input: DeleteReviewInput): Promise<void> {
    await this.repo.deleteReview(input.restaurantId, input.userId);
  }
}
