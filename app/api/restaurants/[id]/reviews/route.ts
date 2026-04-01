import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { restaurants, users } from "@/drizzle/schema";
import { ReviewService } from "@/lib/service/review-service";
import { DrizzleReviewRepository } from "@/lib/service/drizzle-review-repository";
import { Rating } from "@/lib/domain/rating";

type RouteContext = { params: Promise<{ id: string }> };

function getService() {
  const db = getDb();
  const repo = new DrizzleReviewRepository(db as any);
  return new ReviewService(repo);
}

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const restaurantId = Number(id);
  const service = getService();

  const [reviews, avgRating] = await Promise.all([
    service.getReviewsByRestaurant(restaurantId),
    service.getAverageRating(restaurantId),
  ]);

  return NextResponse.json({ reviews, avgRating });
}

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const restaurantId = Number(id);
  const body = await req.json();
  const db = getDb();

  // check restaurant exists
  const restaurant = db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).get();
  if (!restaurant) {
    return NextResponse.json({ error: "음식점을 찾을 수 없습니다" }, { status: 404 });
  }

  // check user exists
  if (body.userId) {
    const user = db.select().from(users).where(eq(users.id, body.userId)).get();
    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 400 });
    }
  }

  // validate rating range
  if (body.rating != null) {
    try {
      Rating.create(body.rating);
    } catch {
      return NextResponse.json({ error: "별점은 1~5 사이여야 합니다" }, { status: 400 });
    }
  }

  // validate at least one field
  if (body.rating == null && !body.content) {
    return NextResponse.json({ error: "별점 또는 노트를 입력해주세요" }, { status: 400 });
  }

  const service = getService();
  const repo = new DrizzleReviewRepository(db as any);

  // check if existing review (for upsert vs create status)
  const existing = await repo.getReview(restaurantId, body.userId);

  await service.createOrUpdateReview({
    restaurantId,
    userId: body.userId,
    rating: body.rating,
    content: body.content,
  });

  const review = await repo.getReview(restaurantId, body.userId);

  return NextResponse.json(review, { status: existing ? 200 : 201 });
}

export async function DELETE(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const restaurantId = Number(id);
  const body = await req.json();
  const db = getDb();
  const repo = new DrizzleReviewRepository(db as any);

  const existing = await repo.getReview(restaurantId, body.userId);
  if (!existing) {
    return NextResponse.json({ error: "리뷰를 찾을 수 없습니다" }, { status: 404 });
  }

  const service = getService();
  await service.deleteReview({ restaurantId, userId: body.userId });

  return NextResponse.json({ deleted: true });
}
