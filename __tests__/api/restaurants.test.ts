import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/drizzle/schema";
import { setDb, resetDb } from "@/lib/db";
import { GET, POST } from "@/app/api/restaurants/route";
import { PUT, DELETE } from "@/app/api/restaurants/[id]/route";

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
    CREATE TABLE menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES vote_sessions(id),
      restaurant_id INTEGER REFERENCES restaurants(id),
      name TEXT NOT NULL
    );
    CREATE TABLE votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES vote_sessions(id),
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      user_id TEXT NOT NULL REFERENCES users(id),
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

describe("Restaurant API Route Handlers", () => {
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

  describe("GET /api/restaurants", () => {
    it("should return empty array when no restaurants exist", async () => {
      const req = new Request("http://localhost/api/restaurants");

      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual([]);
    });

    it("should return restaurants after creation", async () => {
      db.insert(schema.restaurants).values({ name: "맛집", category: "한식" }).run();

      const req = new Request("http://localhost/api/restaurants");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("맛집");
      expect(body[0].category).toBe("한식");
      expect(body[0].avgRating).toBeNull();
    });
  });

  describe("POST /api/restaurants", () => {
    it("should create restaurant and return 201", async () => {
      const req = new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: "스시오마카세", category: "일식", description: "고급 스시" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("스시오마카세");
      expect(body.category).toBe("일식");
      expect(body.description).toBe("고급 스시");
      expect(body.id).toBeDefined();
    });

    it("should return 400 when name is empty", async () => {
      const req = new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: "", category: "한식" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/restaurants/[id]", () => {
    it("should update restaurant and return 200", async () => {
      const row = db.insert(schema.restaurants).values({ name: "원래이름", category: "한식" }).returning().get();

      const req = new Request(`http://localhost/api/restaurants/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: "새이름", category: "양식" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await PUT(req, { params: Promise.resolve({ id: String(row.id) }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("새이름");
      expect(body.category).toBe("양식");
    });

    it("should return 404 for non-existent id", async () => {
      const req = new Request("http://localhost/api/restaurants/999", {
        method: "PUT",
        body: JSON.stringify({ name: "없는식당" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await PUT(req, { params: Promise.resolve({ id: "999" }) });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/restaurants/[id]", () => {
    it("should delete restaurant and return 200", async () => {
      const row = db.insert(schema.restaurants).values({ name: "삭제할식당" }).returning().get();

      const req = new Request(`http://localhost/api/restaurants/${row.id}`, { method: "DELETE" });

      const res = await DELETE(req, { params: Promise.resolve({ id: String(row.id) }) });

      expect(res.status).toBe(200);

      // verify it's gone
      const getRes = await GET(new Request("http://localhost/api/restaurants"));
      const body = await getRes.json();
      expect(body).toEqual([]);
    });

    it("should return 404 for non-existent id", async () => {
      const req = new Request("http://localhost/api/restaurants/999", { method: "DELETE" });

      const res = await DELETE(req, { params: Promise.resolve({ id: "999" }) });

      expect(res.status).toBe(404);
    });
  });
});
