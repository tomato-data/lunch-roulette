import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@/drizzle/schema";

const sqlite = new Database("data/lunch-roulette.db");
const defaultDb = drizzle(sqlite, { schema });

let _db: BetterSQLite3Database<typeof schema> = defaultDb;

export function getDb() {
  return _db;
}

/** For testing only — override the DB instance */
export function setDb(db: BetterSQLite3Database<typeof schema>) {
  _db = db;
}

export function resetDb() {
  _db = defaultDb;
}
