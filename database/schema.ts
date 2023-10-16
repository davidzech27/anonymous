import { sqliteTable, integer, text, primaryKey } from "drizzle-orm/sqlite-core"

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
	anonymousUnread: integer("anonymous_unread").notNull().default(0),
	knownUnread: integer("known_unread").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

export const message = sqliteTable("message", {
	id: integer("id").primaryKey(),
	conversationId: integer("conversation_id").notNull(),
	fromUserId: integer("from_user_id").notNull(),
	content: text("content").notNull(),
	flagged: integer("flagged", { mode: "boolean" }).default(false).notNull(),
	sentAt: integer("sent_at", { mode: "timestamp" }).notNull(),
})

export const block = sqliteTable(
	"block",
	{
		blockerUserId: integer("blocker_user_id"),
		blockedUserId: integer("blocked_user_id"),
	},
	(table) => ({
		primaryKey: primaryKey(table.blockerUserId, table.blockedUserId),
	})
)
