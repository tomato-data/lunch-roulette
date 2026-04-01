"use client";

import { useState, useEffect } from "react";
import Navigation from "@/app/components/navigation";
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
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background)",
      }}
    >
      <Navigation />
      <main
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              fontFamily: "var(--font-heading)",
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            오늘 뭐 먹지?
          </h2>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: 15,
              marginTop: 8,
              fontFamily: "var(--font-body)",
            }}
          >
            룰렛을 돌려 점심 메뉴를 정해보세요
          </p>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              color: "var(--color-primary)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: "4px solid var(--color-border)",
                borderTop: "4px solid var(--color-primary)",
                borderRadius: "50%",
                margin: "0 auto 16px",
                animation: "spin 0.8s linear infinite",
              }}
            />
            로딩 중...
          </div>
        ) : (
          <SpinnerWheel items={restaurants} />
        )}
      </main>
    </div>
  );
}
