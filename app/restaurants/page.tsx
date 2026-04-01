"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Restaurant {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  photoPath: string | null;
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
      // Update
      const res = await fetch(`/api/restaurants/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category: category || null, description: description || null }),
      });
      if (!res.ok) return;

      // Upload photo if changed
      if (photoFile) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        await fetch(`/api/restaurants/${editingId}/photo`, { method: "POST", body: formData });
      }
    } else {
      // Create
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category: category || null, description: description || null }),
      });
      if (!res.ok) return;
      const created = await res.json();

      // Upload photo if provided
      if (photoFile) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        await fetch(`/api/restaurants/${created.id}/photo`, { method: "POST", body: formData });
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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>식당 관리</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/" style={{ padding: "8px 16px", background: "#f0f0f0", borderRadius: 6, textDecoration: "none", color: "#333", fontSize: 14 }}>
            투표 페이지
          </Link>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{ padding: "8px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
          >
            + 식당 추가
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? "식당 수정" : "새 식당 추가"}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>이름 *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="식당 이름"
                style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>카테고리</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="예: 한식, 중식, 일식, 양식"
                style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="간단한 설명"
                rows={2}
                style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>사진</label>
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
                  style={{ marginTop: 8, maxWidth: 200, maxHeight: 150, objectFit: "cover", borderRadius: 6 }}
                />
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleSubmit}
                style={{ padding: "10px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
              >
                {editingId ? "수정" : "추가"}
              </button>
              <button
                onClick={resetForm}
                style={{ padding: "10px 20px", background: "#e5e7eb", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Grid */}
      {restaurants.length === 0 ? (
        <p style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>
          등록된 식당이 없습니다. 식당을 추가해보세요!
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {restaurants.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                overflow: "hidden",
                background: "white",
              }}
            >
              {/* Photo */}
              <div style={{ width: "100%", height: 160, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {r.photoPath ? (
                  <img
                    src={`/uploads/restaurants/${r.photoPath}`}
                    alt={r.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ color: "#9ca3af", fontSize: 40 }}>🍽️</span>
                )}
              </div>
              {/* Info */}
              <div style={{ padding: 12 }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: 16 }}>{r.name}</h3>
                {r.category && (
                  <span style={{ display: "inline-block", background: "#eff6ff", color: "#3b82f6", padding: "2px 8px", borderRadius: 12, fontSize: 12, marginBottom: 4 }}>
                    {r.category}
                  </span>
                )}
                {r.description && (
                  <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#6b7280", lineHeight: 1.4 }}>{r.description}</p>
                )}
                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => startEdit(r)}
                    style={{ flex: 1, padding: "6px 0", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    style={{ flex: 1, padding: "6px 0", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, cursor: "pointer", fontSize: 12, color: "#dc2626" }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
