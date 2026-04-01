"use client";

import { useState, useEffect } from "react";
import Navigation from "@/app/components/navigation";
import RestaurantAutocomplete from "@/app/components/restaurant-autocomplete";

interface User {
  id: string;
  nickname: string;
}

interface Session {
  id: number;
  title: string;
  status: "open" | "closed";
  revealAt: string | null;
  confirmedAt: string | null;
}

interface MenuItem {
  id: number;
  sessionId: number;
  restaurantId: number;
  name: string;
  category: string | null;
}

interface VoteResult {
  menuItemId: number;
  menuName: string;
  category: string | null;
  count: number;
}

const STORAGE_KEY = "lunch-roulette-user";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as User;
      fetch(`/api/users?id=${parsed.id}`).then((res) => {
        if (res.ok) {
          setUser(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (user) fetchSessions(1);
  }, [user]);

  async function registerUser() {
    if (!nicknameInput.trim()) return;
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: nicknameInput.trim() }),
    });
    if (res.ok) {
      const newUser: User = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);
      setNicknameInput("");
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setSelectedSession(null);
  }

  async function fetchSessions(page: number) {
    const res = await fetch(`/api/sessions?page=${page}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    }
  }

  async function createSession() {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    if (res.ok) {
      setNewTitle("");
      fetchSessions(1);
    }
  }

  async function selectSession(session: Session) {
    setSelectedSession(session);
    setMessage("");
    const menuRes = await fetch(`/api/sessions/${session.id}/menu`);
    if (menuRes.ok) setMenuItems(await menuRes.json());

    // Only fetch results if revealed
    const isRevealed = !session.revealAt || new Date() >= new Date(session.revealAt);
    if (isRevealed) {
      const resultRes = await fetch(`/api/sessions/${session.id}/results`);
      if (resultRes.ok) setResults(await resultRes.json());
      else setResults([]);
    } else {
      setResults([]);
    }
  }

  async function addRestaurant(restaurant: { id: number; name: string; category: string | null }) {
    if (!selectedSession) return;
    const res = await fetch(`/api/sessions/${selectedSession.id}/menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: restaurant.id }),
    });
    if (res.ok) {
      selectSession(selectedSession);
    } else {
      const data = await res.json();
      setMessage(data.error || "추가 실패");
    }
  }

  async function castVote(menuItemId: number) {
    if (!selectedSession || !user) return;
    const res = await fetch(`/api/sessions/${selectedSession.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuItemId, userId: user.id }),
    });
    if (res.ok) {
      setMessage("투표 완료!");
      selectSession(selectedSession);
    } else {
      const data = await res.json();
      setMessage(data.error || "투표 실패");
    }
  }

  async function closeSession() {
    if (!selectedSession) return;
    await fetch(`/api/sessions/${selectedSession.id}/close`, { method: "PATCH" });
    setSelectedSession({ ...selectedSession, status: "closed" });
    fetchSessions(currentPage);
  }

  async function confirmVisit() {
    if (!selectedSession) return;
    const res = await fetch(`/api/sessions/${selectedSession.id}/confirm`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setSelectedSession({ ...selectedSession, confirmedAt: updated.confirmedAt });
      setMessage("방문 확정!");
      fetchSessions(currentPage);
    } else {
      const data = await res.json();
      setMessage(data.error || "확정 실패");
    }
  }

  const isRevealed = selectedSession
    ? !selectedSession.revealAt || new Date() >= new Date(selectedSession.revealAt)
    : false;

  // Login screen
  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🍃</div>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 28,
              color: "var(--color-primary)",
              marginBottom: 8,
            }}
          >
            Lunch Roulette
          </h1>
          <p
            style={{
              color: "var(--color-text-muted)",
              marginBottom: 32,
              fontSize: 15,
              fontFamily: "var(--font-body)",
            }}
          >
            닉네임을 설정해주세요
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="닉네임 입력"
              onKeyDown={(e) => e.key === "Enter" && registerUser()}
              autoFocus
              style={{
                flex: 1,
                padding: "12px 16px",
                fontSize: 16,
                border: "2px solid var(--color-border)",
                borderRadius: 10,
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontFamily: "var(--font-body)",
                outline: "none",
              }}
            />
            <button
              onClick={registerUser}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                fontWeight: 600,
                background: "var(--color-primary)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)" }}>
      <Navigation />
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
        {/* User info */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
          }}
        >
          <span
            style={{ fontSize: 14, color: "var(--color-text-muted)", fontFamily: "var(--font-body)" }}
          >
            {user.nickname}님
          </span>
          <button
            onClick={logout}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              color: "var(--color-text-muted)",
              background: "none",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            변경
          </button>
        </div>

        {/* Session Creation */}
        <section style={{ marginBottom: 28 }}>
          <h2
            style={{
              fontSize: 18,
              fontFamily: "var(--font-heading)",
              color: "var(--color-text)",
              marginBottom: 12,
            }}
          >
            새 투표 세션
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="예: 금요일 점심"
              onKeyDown={(e) => e.key === "Enter" && createSession()}
              style={{
                flex: 1,
                padding: "10px 14px",
                border: "2px solid var(--color-border)",
                borderRadius: 10,
                fontSize: 14,
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontFamily: "var(--font-body)",
                outline: "none",
              }}
            />
            <button
              onClick={createSession}
              style={{
                padding: "10px 20px",
                fontWeight: 600,
                background: "var(--color-primary)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 14,
                fontFamily: "var(--font-body)",
              }}
            >
              만들기
            </button>
          </div>
        </section>

        {/* Session List */}
        <section style={{ marginBottom: 28 }}>
          <h2
            style={{
              fontSize: 18,
              fontFamily: "var(--font-heading)",
              color: "var(--color-text)",
              marginBottom: 12,
            }}
          >
            세션 목록
          </h2>
          {sessions.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 20, fontSize: 14 }}>
              세션이 없습니다. 새로 만들어보세요!
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  padding: "14px 16px",
                  textAlign: "left",
                  background:
                    selectedSession?.id === s.id ? "var(--color-secondary-light)" : "var(--color-surface)",
                  border:
                    selectedSession?.id === s.id
                      ? "2px solid var(--color-secondary)"
                      : "1px solid var(--color-border)",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text)",
                  transition: "background 0.2s",
                }}
              >
                <span style={{ fontWeight: 500 }}>{s.title}</span>
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: 12,
                    background:
                      s.status === "closed" ? "var(--color-border)" : "var(--color-primary-light)",
                    color:
                      s.status === "closed" ? "var(--color-text-muted)" : "var(--color-primary)",
                  }}
                >
                  {s.status === "closed" ? "종료" : "진행중"}
                </span>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                marginTop: 12,
              }}
            >
              <button
                onClick={() => fetchSessions(currentPage - 1)}
                disabled={currentPage <= 1}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  background: currentPage <= 1 ? "var(--color-border)" : "var(--color-surface)",
                  color: currentPage <= 1 ? "var(--color-text-muted)" : "var(--color-text)",
                  cursor: currentPage <= 1 ? "default" : "pointer",
                }}
              >
                이전
              </button>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)", padding: "6px 0" }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => fetchSessions(currentPage + 1)}
                disabled={currentPage >= totalPages}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  background: currentPage >= totalPages ? "var(--color-border)" : "var(--color-surface)",
                  color: currentPage >= totalPages ? "var(--color-text-muted)" : "var(--color-text)",
                  cursor: currentPage >= totalPages ? "default" : "pointer",
                }}
              >
                다음
              </button>
            </div>
          )}
        </section>

        {/* Selected Session */}
        {selectedSession && (
          <section
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontFamily: "var(--font-heading)",
                color: "var(--color-text)",
                marginBottom: 16,
              }}
            >
              {selectedSession.title}
            </h2>

            {/* Add Restaurant (autocomplete) */}
            {selectedSession.status === "open" && (
              <div style={{ marginBottom: 16 }}>
                <h3
                  style={{
                    fontSize: 15,
                    color: "var(--color-text-muted)",
                    marginBottom: 8,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  음식점 추가
                </h3>
                <RestaurantAutocomplete onSelect={addRestaurant} />
              </div>
            )}

            {/* Menu Items */}
            <h3
              style={{
                fontSize: 15,
                color: "var(--color-text-muted)",
                marginBottom: 8,
                fontFamily: "var(--font-body)",
              }}
            >
              후보 음식점
            </h3>
            {menuItems.length === 0 && (
              <p style={{ color: "var(--color-text-muted)", fontSize: 14, padding: "8px 0" }}>
                음식점을 검색해서 추가해주세요.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {menuItems.map((item) => {
                const result = results.find((r) => r.menuItemId === item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      background: "var(--color-background)",
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 14, color: "var(--color-text)", fontFamily: "var(--font-body)" }}>
                      {item.name}
                      {item.category && (
                        <span style={{ marginLeft: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
                          {item.category}
                        </span>
                      )}
                      {isRevealed && (
                        <span style={{ marginLeft: 8, color: "var(--color-secondary)", fontWeight: 600 }}>
                          ({result?.count ?? 0}표)
                        </span>
                      )}
                    </span>
                    {selectedSession.status === "open" && (
                      <button
                        onClick={() => castVote(item.id)}
                        style={{
                          padding: "6px 14px",
                          background: "var(--color-accent)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 500,
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        투표
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reveal time info */}
            {selectedSession.revealAt && !isRevealed && (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                결과 공개: {new Date(selectedSession.revealAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}

            {/* Message */}
            {message && (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  fontFamily: "var(--font-body)",
                  color: message.includes("완료") || message.includes("확정")
                    ? "var(--color-primary)"
                    : "var(--color-accent)",
                }}
              >
                {message}
              </p>
            )}

            {/* Action buttons */}
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              {selectedSession.status === "open" && (
                <button
                  onClick={closeSession}
                  style={{
                    padding: "10px 20px",
                    background: "var(--color-accent-light)",
                    color: "var(--color-accent)",
                    border: "1px solid var(--color-accent)",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  투표 종료
                </button>
              )}
              {isRevealed && !selectedSession.confirmedAt && (
                <button
                  onClick={confirmVisit}
                  style={{
                    padding: "10px 20px",
                    background: "var(--color-primary)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  방문 확정
                </button>
              )}
              {selectedSession.confirmedAt && (
                <span
                  style={{
                    padding: "10px 20px",
                    background: "var(--color-primary-light)",
                    color: "var(--color-primary)",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  방문 확정됨
                </span>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
