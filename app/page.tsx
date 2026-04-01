"use client";

import { useState, useEffect } from "react";

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

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newMenu, setNewMenu] = useState("");
  const [voterName, setVoterName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    const res = await fetch("/api/sessions");
    if (res.ok) {
      setSessions(await res.json());
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
    if (!selectedSession || !voterName.trim()) {
      setMessage("이름을 입력해주세요!");
      return;
    }
    const res = await fetch(`/api/sessions/${selectedSession.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuItemId, voterName: voterName.trim() }),
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

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>
      <h1>Lunch Roulette</h1>

      {/* Session Creation */}
      <section style={{ marginBottom: 24 }}>
        <h2>새 투표 세션</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="예: 금요일 점심"
            onKeyDown={(e) => e.key === "Enter" && createSession()}
            style={{ flex: 1, padding: 8 }}
          />
          <button onClick={createSession} style={{ padding: "8px 16px" }}>
            만들기
          </button>
        </div>
      </section>

      {/* Session List */}
      <section style={{ marginBottom: 24 }}>
        <h2>세션 목록</h2>
        {sessions.length === 0 && <p>세션이 없습니다. 새로 만들어보세요!</p>}
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => selectSession(s)}
            style={{
              display: "block",
              width: "100%",
              padding: 12,
              marginBottom: 4,
              textAlign: "left",
              background: selectedSession?.id === s.id ? "#e0e7ff" : "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {s.title} {s.status === "closed" ? "(종료)" : "(진행중)"}
          </button>
        ))}
      </section>

      {/* Selected Session */}
      {selectedSession && (
        <section>
          <h2>{selectedSession.title}</h2>

          {/* Add Menu */}
          {selectedSession.status === "open" && (
            <div style={{ marginBottom: 16 }}>
              <h3>메뉴 추가</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newMenu}
                  onChange={(e) => setNewMenu(e.target.value)}
                  placeholder="메뉴 이름"
                  onKeyDown={(e) => e.key === "Enter" && addMenuItem()}
                  style={{ flex: 1, padding: 8 }}
                />
                <button onClick={addMenuItem} style={{ padding: "8px 16px" }}>
                  추가
                </button>
              </div>
            </div>
          )}

          {/* Voter Name */}
          {selectedSession.status === "open" && (
            <div style={{ marginBottom: 16 }}>
              <h3>내 이름</h3>
              <input
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                placeholder="이름 입력"
                style={{ padding: 8, width: "100%" }}
              />
            </div>
          )}

          {/* Menu Items + Vote Buttons */}
          <h3>메뉴 후보</h3>
          {menuItems.length === 0 && <p>메뉴를 추가해주세요.</p>}
          {menuItems.map((item) => {
            const result = results.find((r) => r.menuItemId === item.id);
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 12,
                  marginBottom: 4,
                  background: "#f9f9f9",
                  borderRadius: 4,
                }}
              >
                <span>
                  {item.name} ({result?.count ?? 0}표)
                </span>
                {selectedSession.status === "open" && (
                  <button
                    onClick={() => castVote(item.id)}
                    style={{ padding: "6px 12px" }}
                  >
                    투표
                  </button>
                )}
              </div>
            );
          })}

          {/* Message */}
          {message && (
            <p style={{ marginTop: 12, color: message.includes("완료") ? "green" : "red" }}>
              {message}
            </p>
          )}

          {/* Close Session */}
          {selectedSession.status === "open" && (
            <button
              onClick={closeSession}
              style={{ marginTop: 16, padding: "8px 16px", background: "#fee2e2" }}
            >
              투표 종료
            </button>
          )}
        </section>
      )}
    </div>
  );
}
