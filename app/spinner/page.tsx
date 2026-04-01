"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SpinnerWheel from "./spinner-wheel";

interface Restaurant {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  photoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SpinnerPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/restaurants")
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Lunch Roulette</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/"
            style={{ padding: "8px 16px", background: "#f0f0f0", borderRadius: 6, textDecoration: "none", color: "#333", fontSize: 14 }}
          >
            투표 페이지
          </Link>
          <Link
            href="/restaurants"
            style={{ padding: "8px 16px", background: "#f0f0f0", borderRadius: 6, textDecoration: "none", color: "#333", fontSize: 14 }}
          >
            식당 관리
          </Link>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#9ca3af" }}>로딩 중...</p>
      ) : (
        <SpinnerWheel items={restaurants} />
      )}
    </div>
  );
}
