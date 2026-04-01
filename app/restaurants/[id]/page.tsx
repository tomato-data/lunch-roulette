"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navigation from "@/app/components/navigation";

interface Restaurant {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  photoPath: string | null;
  avgRating: number | null;
}

interface Review {
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

export default function RestaurantDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [content, setContent] = useState("");
  const userId =
    typeof window !== "undefined"
      ? (() => {
          try {
            const stored = localStorage.getItem("lunch-roulette-user");
            return stored ? JSON.parse(stored).id : null;
          } catch {
            return null;
          }
        })()
      : null;

  const today = new Date().toISOString().slice(0, 10);
  const myTodayReview = reviews.find((r) => r.userId === userId && r.reviewDate === today);

  useEffect(() => {
    fetchRestaurant();
    fetchReviews();
  }, [id]);

  useEffect(() => {
    if (myTodayReview) {
      setSelectedRating(myTodayReview.rating ?? 0);
      setContent(myTodayReview.content ?? "");
    }
  }, [myTodayReview?.id]);

  async function fetchRestaurant() {
    const res = await fetch(`/api/restaurants/${id}`);
    if (res.ok) setRestaurant(await res.json());
  }

  async function fetchReviews() {
    const res = await fetch(`/api/restaurants/${id}/reviews`);
    if (res.ok) {
      const data = await res.json();
      setReviews(data.reviews);
      setAvgRating(data.avgRating);
    }
  }

  async function handleSubmitReview() {
    if (!selectedRating && !content.trim()) return;
    await fetch(`/api/restaurants/${id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        rating: selectedRating || undefined,
        content: content.trim() || undefined,
      }),
    });
    setSelectedRating(0);
    setContent("");
    fetchReviews();
  }

  async function handleDeleteReview() {
    await fetch(`/api/restaurants/${id}/reviews`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setSelectedRating(0);
    setContent("");
    fetchReviews();
  }

  function renderStars(rating: number | null, size = 16) {
    return (
      <span>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            style={{
              color:
                rating && i <= rating
                  ? "var(--color-secondary)"
                  : "var(--color-border)",
              fontSize: size,
            }}
          >
            ★
          </span>
        ))}
      </span>
    );
  }

  if (!restaurant) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-background)" }}>
        <Navigation />
        <div
          style={{
            padding: 60,
            textAlign: "center",
            color: "var(--color-primary)",
          }}
        >
          로딩 중...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)" }}>
      <Navigation />
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "24px 20px" }}>
        {/* Back link */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/restaurants"
            style={{
              color: "var(--color-text-muted)",
              textDecoration: "none",
              fontSize: 14,
              fontFamily: "var(--font-body)",
            }}
          >
            ← 식당 목록
          </Link>
        </div>

        {/* Restaurant Info */}
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: 12,
            padding: 24,
            border: "1px solid var(--color-border)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-heading)",
                color: "var(--color-text)",
                fontSize: 24,
              }}
            >
              {restaurant.name}
            </h1>
            {restaurant.category && (
              <span
                style={{
                  background: "var(--color-secondary-light)",
                  color: "var(--color-secondary)",
                  padding: "3px 10px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {restaurant.category}
              </span>
            )}
          </div>
          {avgRating && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              {renderStars(Math.round(avgRating))}
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--color-text)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {avgRating}
              </span>
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: 13,
                  fontFamily: "var(--font-body)",
                }}
              >
                ({reviews.filter((r) => r.rating).length}개 평가)
              </span>
            </div>
          )}
          {restaurant.description && (
            <p
              style={{
                color: "var(--color-text-muted)",
                lineHeight: 1.6,
                margin: 0,
                fontSize: 14,
                fontFamily: "var(--font-body)",
              }}
            >
              {restaurant.description}
            </p>
          )}
        </div>

        {/* Review Form */}
        {userId && (
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <h3
              style={{
                margin: "0 0 14px 0",
                fontSize: 16,
                fontFamily: "var(--font-heading)",
                color: "var(--color-text)",
              }}
            >
              {myTodayReview ? "오늘 리뷰 수정" : "오늘의 리뷰 작성"}
            </h3>
            <div style={{ marginBottom: 14 }}>
              <span
                style={{
                  fontSize: 14,
                  marginRight: 8,
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                별점:
              </span>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  data-testid="star-button"
                  onClick={() => setSelectedRating(i)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 26,
                    color:
                      i <= selectedRating
                        ? "var(--color-secondary)"
                        : "var(--color-border)",
                    padding: "0 2px",
                    transition: "color 0.15s",
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="이 식당에 대한 메모를 남겨보세요"
              rows={3}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 14,
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: 14,
                background: "var(--color-background)",
                color: "var(--color-text)",
                fontFamily: "var(--font-body)",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleSubmitReview}
                style={{
                  padding: "10px 20px",
                  background: "var(--color-primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                }}
              >
                {myTodayReview ? "리뷰 수정" : "리뷰 등록"}
              </button>
              {myTodayReview && (
                <button
                  onClick={handleDeleteReview}
                  style={{
                    padding: "10px 20px",
                    background: "var(--color-accent-light)",
                    color: "var(--color-accent)",
                    border: "1px solid var(--color-accent)",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        )}

        {/* Reviews List */}
        <h2
          style={{
            fontSize: 18,
            marginBottom: 16,
            fontFamily: "var(--font-heading)",
            color: "var(--color-text)",
          }}
        >
          리뷰 ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p
            style={{
              color: "var(--color-text-muted)",
              textAlign: "center",
              padding: 24,
              fontSize: 14,
              background: "var(--color-surface)",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
            }}
          >
            아직 리뷰가 없습니다.
          </p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {reviews.map((review) => (
              <div
                key={review.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 10,
                  padding: 16,
                  background: "var(--color-surface)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "var(--color-text)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {review.nickname}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {review.reviewDate}
                    </span>
                  </span>
                  {review.rating && renderStars(review.rating, 14)}
                </div>
                {review.content && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: "var(--color-text-muted)",
                      lineHeight: 1.5,
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {review.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
