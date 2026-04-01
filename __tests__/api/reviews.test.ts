import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
      review_date TEXT NOT NULL DEFAULT (date('now')),
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));

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
    vi.useRealTimers();
    resetDb();
    sqlite.close();
  });

  describe("GET /api/restaurants/[id]/reviews", () => {
    it("should return reviews list with average rating", async () => {
      db.insert(schema.reviews).values({ restaurantId, userId: "user-1", rating: 4, content: "좋아요", reviewDate: "2026-04-01" }).run();

      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`);
      const res = await GET(req, makeParams(String(restaurantId)));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.reviews).toHaveLength(1);
      expect(body.reviews[0].rating).toBe(4);
      expect(body.reviews[0].content).toBe("좋아요");
      expect(body.reviews[0].nickname).toBe("앨리스");
      expect(body.reviews[0].reviewDate).toBe("2026-04-01");
      expect(body.avgRating).toBe(4);
    });

    it("should return multiple reviews from different dates", async () => {
      db.insert(schema.reviews).values({ restaurantId, userId: "user-1", rating: 4, content: "오늘", reviewDate: "2026-04-01" }).run();
      db.insert(schema.reviews).values({ restaurantId, userId: "user-1", rating: 3, content: "어제", reviewDate: "2026-03-31" }).run();

      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`);
      const res = await GET(req, makeParams(String(restaurantId)));

      const body = await res.json();
      expect(body.reviews).toHaveLength(2);
      expect(body.avgRating).toBe(3.5);
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
      expect(body.reviewDate).toBe("2026-04-01");
    });

    it("should upsert when same user reviews again on same day", async () => {
      db.insert(schema.reviews).values({ restaurantId, userId, rating: 3, content: "보통", reviewDate: "2026-04-01" }).run();

      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ userId, rating: 5, content: "다시 생각해보니 최고" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req, makeParams(String(restaurantId)));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.rating).toBe(5);
      expect(body.content).toBe("다시 생각해보니 최고");
    });

    it("should create new review on different day (not upsert)", async () => {
      // yesterday's review
      db.insert(schema.reviews).values({ restaurantId, userId, rating: 3, content: "어제", reviewDate: "2026-03-31" }).run();

      // today's new review
      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ userId, rating: 5, content: "오늘은 최고" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req, makeParams(String(restaurantId)));

      expect(res.status).toBe(201);

      // verify 2 reviews exist
      const getReq = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`);
      const getRes = await GET(getReq, makeParams(String(restaurantId)));
      const getBody = await getRes.json();
      expect(getBody.reviews).toHaveLength(2);
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
    it("should delete today's review", async () => {
      db.insert(schema.reviews).values({ restaurantId, userId, rating: 4, reviewDate: "2026-04-01" }).run();

      const req = new Request(`http://localhost/api/restaurants/${restaurantId}/reviews`, {
        method: "DELETE",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await DELETE(req, makeParams(String(restaurantId)));

      expect(res.status).toBe(200);
    });

    it("should return 404 when no today's review to delete", async () => {
      // yesterday's review exists, but not today's
      db.insert(schema.reviews).values({ restaurantId, userId, rating: 4, reviewDate: "2026-03-31" }).run();

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
