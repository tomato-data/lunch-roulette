import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/drizzle/schema";
import { setDb, resetDb } from "@/lib/db";
import { GET, POST, DELETE } from "@/app/api/restaurants/[id]/reviews/route";

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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES vote_sessions(id),
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

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("Review API Route Handlers", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let sqlite: Database.Database;
  let restaurantId: number;
  let userId: string;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqlite = testDb.sqlite;
    setDb(db as any);

    // seed a restaurant and user
    const restaurant = db.insert(schema.restaurants).values({ name: "테스트식당", category: "한식" }).returning().get();
    restaurantId = restaurant.id;
    db.insert(schema.users).values({ id: "user-1", nickname: "앨리스" }).run();
    userId = "user-1";
  });

  afterEach(() => {
    resetDb();
    sqlite.close();
  });

  describe("GET /api/restaurants/[id]/reviews", () => {
    it("should return reviews list with average rating", async () => {
      db.insert(schema.reviews).values({ restaurantId, userId: "user-1", rating: 4, content: "좋아요" }).run();

      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`);
      const res = await GET(req, makeParams(String(restaurantId)));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.reviews).toHaveLength(1);
      expect(body.reviews[0].rating).toBe(4);
      expect(body.reviews[0].content).toBe("좋아요");
      expect(body.reviews[0].nickname).toBe("앨리스");
      expect(body.avgRating).toBe(4);
    });
  });

  describe("POST /api/restaurants/[id]/reviews", () => {
    it("should create review and return 201", async () => {
      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ userId, rating: 5, content: "최고에요" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req, makeParams(String(restaurantId)));

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.rating).toBe(5);
      expect(body.content).toBe("최고에요");
    });

    it("should upsert when same user reviews again", async () => {
      // first review
      db.insert(schema.reviews).values({ restaurantId, userId, rating: 3, content: "보통" }).run();

      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ userId, rating: 5, content: "다시 와보니 최고" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req, makeParams(String(restaurantId)));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.rating).toBe(5);
      expect(body.content).toBe("다시 와보니 최고");

      // verify only 1 review exists
      const getReq = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`);
      const getRes = await GET(getReq, makeParams(String(restaurantId)));
      const getBody = await getRes.json();
      expect(getBody.reviews).toHaveLength(1);
    });

    it("should return 400 when neither rating nor content", async () => {
      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req, makeParams(String(restaurantId)));

      expect(res.status).toBe(400);
    });

    it("should return 400 when rating out of range", async () => {
      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ userId, rating: 6 }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req, makeParams(String(restaurantId)));

      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent restaurant", async () => {
      const req = new Request("http://localhost/api/restaurants/999/reviews", {
        method: "POST",
        body: JSON.stringify({ userId, rating: 5 }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req, makeParams("999"));

      expect(res.status).toBe(404);
    });

    it("should return 400 for non-existent user", async () => {
      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ userId: "ghost-user", rating: 5 }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req, makeParams(String(restaurantId)));

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/restaurants/[id]/reviews", () => {
    it("should delete user's review", async () => {
      db.insert(schema.reviews).values({ restaurantId, userId, rating: 4 }).run();

      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`, {
        method: "DELETE",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await DELETE(req, makeParams(String(restaurantId)));

      expect(res.status).toBe(200);
    });

    it("should return 404 when no review to delete", async () => {
      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`, {
        method: "DELETE",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await DELETE(req, makeParams(String(restaurantId)));

      expect(res.status).toBe(404);
    });
  });
});
