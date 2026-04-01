export interface ReviewRecord {
  id: number;
  restaurantId: number;
  userId: string;
  nickname: string;
  rating: number | null;
  content: string | null;
  reviewDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertReviewInput {
  restaurantId: number;
  userId: string;
  rating?: number;
  content?: string;
  reviewDate: string;
}

export interface ReviewRepository {
  upsertReview(input: UpsertReviewInput): Promise<void>;
  getReviewByDate(restaurantId: number, userId: string, reviewDate: string): Promise<ReviewRecord | null>;
  getReviewsByRestaurant(restaurantId: number): Promise<ReviewRecord[]>;
  getAverageRating(restaurantId: number): Promise<number | null>;
  deleteReview(restaurantId: number, userId: string, reviewDate: string): Promise<void>;
}
