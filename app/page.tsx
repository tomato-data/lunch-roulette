"use client";

import { useState, useEffect } from "react";
import Navigation from "@/app/components/navigation";

interface User {
  id: string;
  nickname: string;
}

interface Session {
  id: number;
  title: string;
  status: "open" | "closed";
}

interface MenuItem {
  id: number;
  sessionId: number;
  name: string;
}

interface VoteResult {
  menuItemId: number;
  menuName: string;
  count: number;
}

const STORAGE_KEY = "lunch-roulette-user";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newMenu, setNewMenu] = useState("");
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
    if (user) fetchSessions();
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

  async function fetchSessions() {
    const res = await fetch("/api/sessions");
    if (res.ok) setSessions(await res.json());
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
      fetchSessions();
    }
  }

  async function selectSession(session: Session) {
    setSelectedSession(session);
    setMessage("");
    const [menuRes, resultRes] = await Promise.all([
      fetch(`/api/sessions/${session.id}/menu`),
      fetch(`/api/sessions/${session.id}/results`),
    ]);
    if (menuRes.ok) setMenuItems(await menuRes.json());
    if (resultRes.ok) setResults(await resultRes.json());
  }

  async function addMenuItem() {
    if (!selectedSession || !newMenu.trim()) return;
    const res = await fetch(`/api/sessions/${selectedSession.id}/menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newMenu }),
    });
    if (res.ok) {
      setNewMenu("");
      selectSession(selectedSession);
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
    fetchSessions();
  }

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
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            padding: 40,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 8,
            }}
          >
            🍃
          </div>
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
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background)",
      }}
    >
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
            style={{
              fontSize: 14,
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-body)",
            }}
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
            <p
              style={{
                textAlign: "center",
                color: "var(--color-text-muted)",
                padding: 20,
                fontSize: 14,
              }}
            >
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
                    selectedSession?.id === s.id
                      ? "var(--color-secondary-light)"
                      : "var(--color-surface)",
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
                      s.status === "closed"
                        ? "var(--color-border)"
                        : "var(--color-primary-light)",
                    color:
                      s.status === "closed"
                        ? "var(--color-text-muted)"
                        : "var(--color-primary)",
                  }}
                >
                  {s.status === "closed" ? "종료" : "진행중"}
                </span>
              </button>
            ))}
          </div>
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

            {/* Add Menu */}
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
                  메뉴 추가
                </h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={newMenu}
                    onChange={(e) => setNewMenu(e.target.value)}
                    placeholder="메뉴 이름"
                    onKeyDown={(e) => e.key === "Enter" && addMenuItem()}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 14,
                      background: "var(--color-background)",
                      color: "var(--color-text)",
                      fontFamily: "var(--font-body)",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={addMenuItem}
                    style={{
                      padding: "10px 16px",
                      background: "var(--color-primary)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 14,
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    추가
                  </button>
                </div>
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
              메뉴 후보
            </h3>
            {menuItems.length === 0 && (
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: 14,
                  padding: "8px 0",
                }}
              >
                메뉴를 추가해주세요.
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
                    <span
                      style={{
                        fontSize: 14,
                        color: "var(--color-text)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {item.name}{" "}
                      <span style={{ color: "var(--color-secondary)", fontWeight: 600 }}>
                        ({result?.count ?? 0}표)
                      </span>
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

            {/* Message */}
            {message && (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  fontFamily: "var(--font-body)",
                  color: message.includes("완료")
                    ? "var(--color-primary)"
                    : "var(--color-accent)",
                }}
              >
                {message}
              </p>
            )}

            {/* Close Session */}
            {selectedSession.status === "open" && (
              <button
                onClick={closeSession}
                style={{
                  marginTop: 16,
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
          </section>
        )}
      </main>
    </div>
  );
}
