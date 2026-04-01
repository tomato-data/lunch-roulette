import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/drizzle/schema";
import { setDb, resetDb } from "@/lib/db";
import { POST as createSession } from "@/app/api/sessions/route";
import { POST as addMenu } from "@/app/api/sessions/[id]/menu/route";
import { POST as castVote } from "@/app/api/sessions/[id]/vote/route";
import { GET as getResults } from "@/app/api/sessions/[id]/results/route";
import { PATCH as closeSession } from "@/app/api/sessions/[id]/close/route";

function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  sqlite.exec(`
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
      voter_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return { db, sqlite };
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
    it("should add menu item and return 201", async () => {
      const session = db.insert(schema.voteSessions).values({ title: "테스트" }).returning().get();
      const req = new Request("http://localhost/api/sessions/1/menu", {
        method: "POST",
        body: JSON.stringify({ name: "김치찌개" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await addMenu(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("김치찌개");
    });
  });

  describe("POST /api/sessions/[id]/vote", () => {
    it("should cast vote and return 201", async () => {
      const session = db.insert(schema.voteSessions).values({ title: "테스트" }).returning().get();
      const menu = db.insert(schema.menuItems).values({ sessionId: session.id, name: "김치찌개" }).returning().get();
      const req = new Request("http://localhost/api/sessions/1/vote", {
        method: "POST",
        body: JSON.stringify({ menuItemId: menu.id, voterName: "Alice" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await castVote(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(201);
    });

    it("should return 409 for duplicate vote", async () => {
      const session = db.insert(schema.voteSessions).values({ title: "테스트" }).returning().get();
      const menu = db.insert(schema.menuItems).values({ sessionId: session.id, name: "김치찌개" }).returning().get();
      db.insert(schema.votes).values({ sessionId: session.id, menuItemId: menu.id, voterName: "Alice" }).run();

      const req = new Request("http://localhost/api/sessions/1/vote", {
        method: "POST",
        body: JSON.stringify({ menuItemId: menu.id, voterName: "Alice" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await castVote(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/sessions/[id]/results", () => {
    it("should return vote counts", async () => {
      const session = db.insert(schema.voteSessions).values({ title: "테스트" }).returning().get();
      const menu1 = db.insert(schema.menuItems).values({ sessionId: session.id, name: "김치찌개" }).returning().get();
      const menu2 = db.insert(schema.menuItems).values({ sessionId: session.id, name: "된장찌개" }).returning().get();
      db.insert(schema.votes).values({ sessionId: session.id, menuItemId: menu1.id, voterName: "Alice" }).run();
      db.insert(schema.votes).values({ sessionId: session.id, menuItemId: menu1.id, voterName: "Bob" }).run();
      db.insert(schema.votes).values({ sessionId: session.id, menuItemId: menu2.id, voterName: "Charlie" }).run();

      const req = new Request("http://localhost/api/sessions/1/results");

      const res = await getResults(req, { params: Promise.resolve({ id: String(session.id) }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ menuName: "김치찌개", count: 2 }),
          expect.objectContaining({ menuName: "된장찌개", count: 1 }),
        ])
      );
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
