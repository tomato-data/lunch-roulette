import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/drizzle/schema";
import { setDb, resetDb } from "@/lib/db";
import { GET as getSessions, POST as createSession } from "@/app/api/sessions/route";
import { GET as getMenu, POST as addMenu } from "@/app/api/sessions/[id]/menu/route";
import { POST as castVote } from "@/app/api/sessions/[id]/vote/route";
import { GET as getResults } from "@/app/api/sessions/[id]/results/route";
import { PATCH as closeSession } from "@/app/api/sessions/[id]/close/route";

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
  `);
  return { db, sqlite };
}

function insertTestUser(db: any, id = "test-user-1", nickname = "Alice") {
  db.insert(schema.users).values({ id, nickname }).run();
}

function insertTestRestaurant(db: any, name = "김치찌개집", category = "한식") {
  return db.insert(schema.restaurants).values({ name, category }).returning().get();
}

describe("API Route Handlers", () => {
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

  describe("POST /api/sessions", () => {
    it("should create a session and return 201", async () => {
      const req = new Request("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ title: "금요일 점심" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await createSession(req);

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.title).toBe("금요일 점심");
      expect(body.status).toBe("open");
      expect(body.id).toBeDefined();
    });
  });

  describe("POST /api/sessions/[id]/menu", () => {
    it("should add menu item by restaurantId and return 201 with restaurant info", async () => {
      const session = db.insert(schema.voteSessions).values({ title: "테스트" }).returning().get();
      const restaurant = insertTestRestaurant(db, "김치찌개집", "한식");
      const req = new Request("http://localhost/api/sessions/1/menu", {
        method: "POST",
        body: JSON.stringify({ restaurantId: restaurant.id }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await addMenu(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.restaurantId).toBe(restaurant.id);
      expect(body.name).toBe("김치찌개집");
    });

    it("should return 404 for non-existent restaurantId", async () => {
      const session = db.insert(schema.voteSessions).values({ title: "테스트" }).returning().get();
      const req = new Request("http://localhost/api/sessions/1/menu", {
        method: "POST",
        body: JSON.stringify({ restaurantId: 9999 }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await addMenu(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(404);
    });

    it("should return 409 for duplicate restaurantId in session", async () => {
      const session = db.insert(schema.voteSessions).values({ title: "테스트" }).returning().get();
      const restaurant = insertTestRestaurant(db, "김치찌개집", "한식");
      // Add first time
      db.insert(schema.menuItems).values({ sessionId: session.id, restaurantId: restaurant.id, name: "김치찌개집" }).run();

      const req = new Request("http://localhost/api/sessions/1/menu", {
        method: "POST",
        body: JSON.stringify({ restaurantId: restaurant.id }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await addMenu(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(409);
    });

    it("GET /sessions/[id]/menu → 음식점 이름·카테고리 포함 목록 반환", async () => {
      const session = db.insert(schema.voteSessions).values({ title: "테스트" }).returning().get();
      const r1 = insertTestRestaurant(db, "김치찌개집", "한식");
      const r2 = insertTestRestaurant(db, "스시야", "일식");
      db.insert(schema.menuItems).values({ sessionId: session.id, restaurantId: r1.id, name: "김치찌개집" }).run();
      db.insert(schema.menuItems).values({ sessionId: session.id, restaurantId: r2.id, name: "스시야" }).run();

      const req = new Request("http://localhost/api/sessions/1/menu");
      const res = await getMenu(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(2);
      expect(body[0]).toHaveProperty("restaurantId");
      expect(body[0]).toHaveProperty("name");
      expect(body[0]).toHaveProperty("category");
    });
  });

  describe("POST /api/sessions/[id]/vote", () => {
    it("should cast vote and return 201", async () => {
      insertTestUser(db);
      const session = db.insert(schema.voteSessions).values({ title: "테스트" }).returning().get();
      const restaurant = insertTestRestaurant(db, "김치찌개집", "한식");
      const menu = db.insert(schema.menuItems).values({ sessionId: session.id, restaurantId: restaurant.id, name: "김치찌개집" }).returning().get();
      const req = new Request("http://localhost/api/sessions/1/vote", {
        method: "POST",
        body: JSON.stringify({ menuItemId: menu.id, userId: "test-user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await castVote(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(201);
    });

    it("should return 409 for duplicate vote", async () => {
      insertTestUser(db);
      const session = db.insert(schema.voteSessions).values({ title: "테스트" }).returning().get();
      const restaurant = insertTestRestaurant(db, "김치찌개집", "한식");
      const menu = db.insert(schema.menuItems).values({ sessionId: session.id, restaurantId: restaurant.id, name: "김치찌개집" }).returning().get();
      db.insert(schema.votes).values({ sessionId: session.id, menuItemId: menu.id, userId: "test-user-1" }).run();

      const req = new Request("http://localhost/api/sessions/1/vote", {
        method: "POST",
        body: JSON.stringify({ menuItemId: menu.id, userId: "test-user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await castVote(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/sessions/[id]/results", () => {
    it("should return vote counts", async () => {
      insertTestUser(db, "user-a", "Alice");
      insertTestUser(db, "user-b", "Bob");
      insertTestUser(db, "user-c", "Charlie");
      const session = db.insert(schema.voteSessions).values({ title: "테스트" }).returning().get();
      const r1 = insertTestRestaurant(db, "김치찌개집", "한식");
      const r2 = insertTestRestaurant(db, "된장찌개집", "한식");
      const menu1 = db.insert(schema.menuItems).values({ sessionId: session.id, restaurantId: r1.id, name: "김치찌개집" }).returning().get();
      const menu2 = db.insert(schema.menuItems).values({ sessionId: session.id, restaurantId: r2.id, name: "된장찌개집" }).returning().get();
      db.insert(schema.votes).values({ sessionId: session.id, menuItemId: menu1.id, userId: "user-a" }).run();
      db.insert(schema.votes).values({ sessionId: session.id, menuItemId: menu1.id, userId: "user-b" }).run();
      db.insert(schema.votes).values({ sessionId: session.id, menuItemId: menu2.id, userId: "user-c" }).run();

      const req = new Request("http://localhost/api/sessions/1/results");

      const res = await getResults(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ menuName: "김치찌개집", category: "한식", count: 2 }),
          expect.objectContaining({ menuName: "된장찌개집", category: "한식", count: 1 }),
        ])
      );
    });
  });

  describe("POST /api/sessions (revealAt)", () => {
    it("should create session with revealAt and store in DB", async () => {
      const revealAt = "2026-04-01T14:00:00+09:00";
      const req = new Request("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ title: "점심 투표", revealAt }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await createSession(req);

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.revealAt).toBeDefined();
      expect(new Date(body.revealAt).toISOString()).toBe(new Date(revealAt).toISOString());
    });
  });

  describe("GET /api/sessions/[id]/results (revealAt)", () => {
    it("should return 403 when revealAt is in the future", async () => {
      const futureRevealAt = "2099-12-31T23:59:00Z";
      const session = db.insert(schema.voteSessions).values({ title: "테스트", revealAt: futureRevealAt }).returning().get();

      const req = new Request("http://localhost/api/sessions/1/results");
      const res = await getResults(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(403);
    });

    it("should return results when revealAt is in the past", async () => {
      insertTestUser(db, "user-a", "Alice");
      const pastRevealAt = "2020-01-01T00:00:00Z";
      const session = db.insert(schema.voteSessions).values({ title: "테스트", revealAt: pastRevealAt }).returning().get();
      const r1 = insertTestRestaurant(db, "김치찌개집", "한식");
      const menu1 = db.insert(schema.menuItems).values({ sessionId: session.id, restaurantId: r1.id, name: "김치찌개집" }).returning().get();
      db.insert(schema.votes).values({ sessionId: session.id, menuItemId: menu1.id, userId: "user-a" }).run();

      const req = new Request("http://localhost/api/sessions/1/results");
      const res = await getResults(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].menuName).toBe("김치찌개집");
    });
  });

  describe("GET /api/sessions (pagination)", () => {
    it("should return first 5 sessions for page=1", async () => {
      // Create 7 sessions
      for (let i = 1; i <= 7; i++) {
        db.insert(schema.voteSessions).values({ title: `세션 ${i}` }).run();
      }

      const req = new Request("http://localhost/api/sessions?page=1");
      const res = await getSessions(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sessions).toHaveLength(5);
      expect(body.totalCount).toBe(7);
      expect(body.totalPages).toBe(2);
      expect(body.currentPage).toBe(1);
    });

    it("should return remaining sessions for page=2", async () => {
      for (let i = 1; i <= 7; i++) {
        db.insert(schema.voteSessions).values({ title: `세션 ${i}` }).run();
      }

      const req = new Request("http://localhost/api/sessions?page=2");
      const res = await getSessions(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sessions).toHaveLength(2);
      expect(body.currentPage).toBe(2);
    });

    it("should default to page=1 when page not specified", async () => {
      for (let i = 1; i <= 3; i++) {
        db.insert(schema.voteSessions).values({ title: `세션 ${i}` }).run();
      }

      const req = new Request("http://localhost/api/sessions");
      const res = await getSessions(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sessions).toHaveLength(3);
      expect(body.currentPage).toBe(1);
      expect(body.totalCount).toBe(3);
      expect(body.totalPages).toBe(1);
    });
  });

  describe("PATCH /api/sessions/[id]/close", () => {
    it("should close session and return 200", async () => {
      const session = db.insert(schema.voteSessions).values({ title: "테스트" }).returning().get();

      const req = new Request("http://localhost/api/sessions/1/close", { method: "PATCH" });

      const res = await closeSession(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("closed");
    });
  });
});
