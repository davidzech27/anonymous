import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core"

export const user = sqliteTable("user", {
	id: integer("id").primaryKey(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	// invitedUsers: integer("invited_users").default(0).notNull(),
	// revealedUsers: integer("revealed_users").default(0).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

export const conversation = sqliteTable("conversation", {
	id: integer("id").primaryKey(),
	anonymousUserId: integer("anonymous_user_id").notNull(),
	knownUserId: integer("known_user_id").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

export const message = sqliteTable("message", {
	id: integer("id").primaryKey(),
	conversationId: integer("conversation_id").notNull(),
	fromUserId: integer("from_user_id").notNull(),
	content: text("content").notNull(),
	sentAt: integer("sent_at", { mode: "timestamp" }).notNull(),
})
