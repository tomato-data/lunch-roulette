import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  nickname: text("nickname").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const voteSessions = sqliteTable("vote_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  status: text("status", { enum: ["open", "closed"] })
    .notNull()
    .default("open"),
  revealAt: text("reveal_at"),
  confirmedAt: text("confirmed_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const menuItems = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => voteSessions.id),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  name: text("name").notNull(),
});

export const restaurants = sqliteTable("restaurants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category"),
  description: text("description"),
  photoPath: text("photo_path"),
  winCount: integer("win_count").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  rating: integer("rating"),
  content: text("content"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const lunchHistory = sqliteTable("lunch_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => voteSessions.id),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  visitedAt: text("visited_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString().split("T")[0]),
});

export const votes = sqliteTable("votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => voteSessions.id),
  menuItemId: integer("menu_item_id")
    .notNull()
    .references(() => menuItems.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
