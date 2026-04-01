"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navigation from "@/app/components/navigation";

interface Restaurant {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  photoPath: string | null;
  avgRating: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  async function fetchRestaurants() {
    const res = await fetch("/api/restaurants");
    if (res.ok) setRestaurants(await res.json());
  }

  function resetForm() {
    setName("");
    setCategory("");
    setDescription("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditingId(null);
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startEdit(r: Restaurant) {
    setEditingId(r.id);
    setName(r.name);
    setCategory(r.category ?? "");
    setDescription(r.description ?? "");
    setPhotoPreview(r.photoPath ? `/uploads/restaurants/${r.photoPath}` : null);
    setPhotoFile(null);
    setShowForm(true);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit() {
    if (!name.trim()) return;

    if (editingId) {
      const res = await fetch(`/api/restaurants/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: category || null,
          description: description || null,
        }),
      });
      if (!res.ok) return;

      if (photoFile) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        await fetch(`/api/restaurants/${editingId}/photo`, {
          method: "POST",
          body: formData,
        });
      }
    } else {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: category || null,
          description: description || null,
        }),
      });
      if (!res.ok) return;
      const created = await res.json();

      if (photoFile) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        await fetch(`/api/restaurants/${created.id}/photo`, {
          method: "POST",
          body: formData,
        });
      }
    }

    resetForm();
    fetchRestaurants();
  }

  async function handleDelete(id: number) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await fetch(`/api/restaurants/${id}`, { method: "DELETE" });
    fetchRestaurants();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)" }}>
      <Navigation />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontFamily: "var(--font-heading)",
              color: "var(--color-text)",
            }}
          >
            식당 관리
          </h2>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            style={{
              padding: "10px 20px",
              background: "var(--color-primary)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              boxShadow: "0 2px 8px rgba(74, 124, 89, 0.2)",
            }}
          >
            + 식당 추가
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 16,
                fontFamily: "var(--font-heading)",
                color: "var(--color-text)",
                fontSize: 17,
              }}
            >
              {editingId ? "식당 수정" : "새 식당 추가"}
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontWeight: 500,
                    fontSize: 14,
                    color: "var(--color-text)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  이름 *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="식당 이름"
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: "border-box",
                    background: "var(--color-background)",
                    color: "var(--color-text)",
                    fontFamily: "var(--font-body)",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontWeight: 500,
                    fontSize: 14,
                    color: "var(--color-text)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  카테고리
                </label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: 한식, 중식, 일식, 양식"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: "border-box",
                    background: "var(--color-background)",
                    color: "var(--color-text)",
                    fontFamily: "var(--font-body)",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontWeight: 500,
                    fontSize: 14,
                    color: "var(--color-text)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  설명
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="간단한 설명"
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 14,
                    resize: "vertical",
                    boxSizing: "border-box",
                    background: "var(--color-background)",
                    color: "var(--color-text)",
                    fontFamily: "var(--font-body)",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontWeight: 500,
                    fontSize: 14,
                    color: "var(--color-text)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  사진
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ fontSize: 14 }}
                />
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="미리보기"
                    style={{
                      marginTop: 8,
                      maxWidth: 200,
                      maxHeight: 150,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleSubmit}
                  style={{
                    padding: "10px 24px",
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
                  {editingId ? "수정" : "추가"}
                </button>
                <button
                  onClick={resetForm}
                  style={{
                    padding: "10px 24px",
                    background: "var(--color-border)",
                    color: "var(--color-text)",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Restaurant Grid */}
        {restaurants.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--color-text-muted)",
              padding: 60,
              background: "var(--color-surface)",
              borderRadius: 12,
              border: "2px dashed var(--color-border)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
            <p style={{ fontSize: 15 }}>등록된 식당이 없습니다. 식당을 추가해보세요!</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {restaurants.map((r) => (
              <div
                key={r.id}
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "box-shadow 0.2s",
                }}
              >
                {/* Photo */}
                <div
                  style={{
                    width: "100%",
                    height: 160,
                    background: "var(--color-primary-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {r.photoPath ? (
                    <img
                      src={`/uploads/restaurants/${r.photoPath}`}
                      alt={r.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span
                      style={{ color: "var(--color-primary)", fontSize: 40, opacity: 0.4 }}
                    >
                      🍽️
                    </span>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding: 14 }}>
                  <Link
                    href={`/restaurants/${r.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <h3
                      style={{
                        margin: "0 0 6px 0",
                        fontSize: 16,
                        fontFamily: "var(--font-heading)",
                        color: "var(--color-text)",
                      }}
                    >
                      {r.name}
                    </h3>
                  </Link>
                  {r.avgRating && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--color-secondary)",
                        marginBottom: 6,
                      }}
                    >
                      {"★".repeat(Math.round(r.avgRating))}{" "}
                      <span style={{ color: "var(--color-text-muted)" }}>
                        {r.avgRating}
                      </span>
                    </div>
                  )}
                  {r.category && (
                    <span
                      style={{
                        display: "inline-block",
                        background: "var(--color-secondary-light)",
                        color: "var(--color-secondary)",
                        padding: "2px 10px",
                        borderRadius: 12,
                        fontSize: 12,
                        marginBottom: 6,
                        fontWeight: 500,
                      }}
                    >
                      {r.category}
                    </span>
                  )}
                  {r.description && (
                    <p
                      style={{
                        margin: "6px 0 0 0",
                        fontSize: 13,
                        color: "var(--color-text-muted)",
                        lineHeight: 1.4,
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {r.description}
                    </p>
                  )}
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => startEdit(r)}
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        background: "var(--color-background)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        color: "var(--color-text)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        background: "var(--color-accent-light)",
                        border: "1px solid var(--color-accent)",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        color: "var(--color-accent)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
