"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const myReview = reviews.find((r) => r.userId === userId);

  useEffect(() => {
    fetchRestaurant();
    fetchReviews();
  }, [id]);

  useEffect(() => {
    if (myReview) {
      setSelectedRating(myReview.rating ?? 0);
      setContent(myReview.content ?? "");
    }
  }, [myReview?.id]);

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
          <span key={i} style={{ color: rating && i <= rating ? "#f59e0b" : "#d1d5db", fontSize: size }}>
            ★
          </span>
        ))}
      </span>
    );
  }

  if (!restaurant) return <div style={{ padding: 20 }}>로딩 중...</div>;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/restaurants" style={{ color: "#6b7280", textDecoration: "none", fontSize: 14 }}>
          ← 식당 목록
        </Link>
      </div>

      {/* Restaurant Info */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h1 style={{ margin: 0 }}>{restaurant.name}</h1>
          {restaurant.category && (
            <span style={{ background: "#eff6ff", color: "#3b82f6", padding: "2px 8px", borderRadius: 12, fontSize: 12 }}>
              {restaurant.category}
            </span>
          )}
        </div>
        {avgRating && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            {renderStars(Math.round(avgRating))}
            <span style={{ fontWeight: 600 }}>{avgRating}</span>
            <span style={{ color: "#9ca3af", fontSize: 13 }}>({reviews.filter((r) => r.rating).length}개 평가)</span>
          </div>
        )}
        {restaurant.description && (
          <p style={{ color: "#4b5563", lineHeight: 1.6, margin: 0 }}>{restaurant.description}</p>
        )}
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "24px 0" }} />

      {/* Review Form */}
      {userId && (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 15 }}>
            {myReview ? "내 리뷰 수정" : "리뷰 작성"}
          </h3>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 14, marginRight: 8 }}>별점:</span>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                data-testid="star-button"
                onClick={() => setSelectedRating(i)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 24,
                  color: i <= selectedRating ? "#f59e0b" : "#d1d5db",
                  padding: "0 2px",
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
            style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, resize: "vertical", boxSizing: "border-box", marginBottom: 12 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSubmitReview}
              style={{ padding: "8px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
            >
              {myReview ? "리뷰 수정" : "리뷰 등록"}
            </button>
            {myReview && (
              <button
                onClick={handleDeleteReview}
                style={{ padding: "8px 16px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
              >
                삭제
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reviews List */}
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>리뷰 ({reviews.length})</h2>
      {reviews.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 20 }}>아직 리뷰가 없습니다.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviews.map((review) => (
            <div key={review.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{review.nickname}</span>
                {review.rating && renderStars(review.rating, 14)}
              </div>
              {review.content && (
                <p style={{ margin: 0, fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>{review.content}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
