import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/drizzle/schema";
import { setDb, resetDb } from "@/lib/db";
import { POST as confirmVisit } from "@/app/api/sessions/[id]/confirm/route";

function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  sqlite.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE vote_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      reveal_at TEXT,
      confirmed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      photo_path TEXT,
      win_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES vote_sessions(id),
      restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
      name TEXT NOT NULL
    );
    CREATE TABLE votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES vote_sessions(id),
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE lunch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES vote_sessions(id),
      restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
      visited_at TEXT NOT NULL DEFAULT (date('now'))
    );
    CREATE TABLE reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      rating INTEGER,
      content TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return { db, sqlite };
}

function setupVotedSession(db: any) {
  const restaurant = db.insert(schema.restaurants).values({ name: "김치찌개집", category: "한식" }).returning().get();
  const session = db.insert(schema.voteSessions).values({
    title: "점심 투표",
    status: "closed",
    revealAt: "2020-01-01T00:00:00Z",
  }).returning().get();
  const menu = db.insert(schema.menuItems).values({
    sessionId: session.id,
    restaurantId: restaurant.id,
    name: "김치찌개집",
  }).returning().get();
  db.insert(schema.users).values({ id: "user-1", nickname: "Alice" }).run();
  db.insert(schema.votes).values({
    sessionId: session.id,
    menuItemId: menu.id,
    userId: "user-1",
  }).run();
  return { session, restaurant, menu };
}

describe("Confirm Visit API", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let sqlite: Database.Database;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqlite = testDb.sqlite;
    setDb(db as any);
  });

  afterEach(() => {
    resetDb();
    sqlite.close();
  });

  it("POST /sessions/[id]/confirm → 당첨 음식점 방문 확정, winCount +1", async () => {
    const { session, restaurant } = setupVotedSession(db);

    const req = new Request("http://localhost/api/sessions/1/confirm", { method: "POST" });
    const res = await confirmVisit(req, { params: Promise.resolve({ id: String(session.id) }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.confirmedAt).toBeDefined();

    // Check winCount incremented
    const updated = db.select().from(schema.restaurants).all();
    expect(updated[0].winCount).toBe(1);

    // Check lunch_history created
    const history = db.select().from(schema.lunchHistory).all();
    expect(history).toHaveLength(1);
    expect(history[0].restaurantId).toBe(restaurant.id);
    expect(history[0].sessionId).toBe(session.id);
  });

  it("POST /sessions/[id]/confirm → 이미 확정된 세션 409", async () => {
    const { session } = setupVotedSession(db);
    // Confirm once by directly setting confirmedAt
    const { eq } = await import("drizzle-orm");
    db.update(schema.voteSessions)
      .set({ confirmedAt: new Date().toISOString() })
      .where(eq(schema.voteSessions.id, session.id))
      .run();

    const req = new Request("http://localhost/api/sessions/1/confirm", { method: "POST" });
    const res = await confirmVisit(req, { params: Promise.resolve({ id: String(session.id) }) });

    expect(res.status).toBe(409);
  });

  it("POST /sessions/[id]/confirm → revealAt 이전 확정 시도 400", async () => {
    const restaurant = db.insert(schema.restaurants).values({ name: "김치찌개집", category: "한식" }).returning().get();
    const session = db.insert(schema.voteSessions).values({
      title: "점심 투표",
      status: "closed",
      revealAt: "2099-12-31T23:59:00Z",
    }).returning().get();

    const req = new Request("http://localhost/api/sessions/1/confirm", { method: "POST" });
    const res = await confirmVisit(req, { params: Promise.resolve({ id: String(session.id) }) });

    expect(res.status).toBe(400);
  });
});
