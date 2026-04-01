import { eq, and, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { reviews, users } from "@/drizzle/schema";
import type { ReviewRepository, ReviewRecord, UpsertReviewInput } from "./review-repository";
import * as schema from "@/drizzle/schema";

export class DrizzleReviewRepository implements ReviewRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  async upsertReview(input: UpsertReviewInput): Promise<void> {
    const existing = this.db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.restaurantId, input.restaurantId),
          eq(reviews.userId, input.userId),
          eq(reviews.reviewDate, input.reviewDate),
        )
      )
      .get();

    if (existing) {
      this.db
        .update(reviews)
        .set({
          rating: input.rating ?? null,
          content: input.content ?? null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(reviews.id, existing.id))
        .run();
    } else {
      this.db
        .insert(reviews)
        .values({
          restaurantId: input.restaurantId,
          userId: input.userId,
          rating: input.rating ?? null,
          content: input.content ?? null,
          reviewDate: input.reviewDate,
        })
        .run();
    }
  }

  async getReviewByDate(restaurantId: number, userId: string, reviewDate: string): Promise<ReviewRecord | null> {
    const row = this.db
      .select({
        id: reviews.id,
        restaurantId: reviews.restaurantId,
        userId: reviews.userId,
        nickname: users.nickname,
        rating: reviews.rating,
        content: reviews.content,
        reviewDate: reviews.reviewDate,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(
        and(
          eq(reviews.restaurantId, restaurantId),
          eq(reviews.userId, userId),
          eq(reviews.reviewDate, reviewDate),
        )
      )
      .get();
    return row ?? null;
  }

  async getReviewsByRestaurant(restaurantId: number): Promise<ReviewRecord[]> {
    return this.db
      .select({
        id: reviews.id,
        restaurantId: reviews.restaurantId,
        userId: reviews.userId,
        nickname: users.nickname,
        rating: reviews.rating,
        content: reviews.content,
        reviewDate: reviews.reviewDate,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.restaurantId, restaurantId))
      .orderBy(sql`${reviews.reviewDate} DESC`)
      .all();
  }

  async getAverageRating(restaurantId: number): Promise<number | null> {
    const result = this.db
      .select({ avg: sql<number | null>`avg(${reviews.rating})` })
      .from(reviews)
      .where(and(eq(reviews.restaurantId, restaurantId), sql`${reviews.rating} IS NOT NULL`))
      .get();
    return result?.avg ? Math.round(result.avg * 10) / 10 : null;
  }

  async deleteReview(restaurantId: number, userId: string, reviewDate: string): Promise<void> {
    this.db
      .delete(reviews)
      .where(
        and(
          eq(reviews.restaurantId, restaurantId),
          eq(reviews.userId, userId),
          eq(reviews.reviewDate, reviewDate),
        )
      )
      .run();
  }
}
