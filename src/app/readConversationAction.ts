"use server"
import { zact } from "zact/server"
import { z } from "zod"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"

import db from "~/database/db"
import { conversation } from "~/database/schema"
import { getAuthOrThrow } from "~/auth/jwt"

const readConversationAction = zact(
	z.object({
		conversationId: z.number(),
	})
)(async ({ conversationId }) => {
	const auth = await getAuthOrThrow({ cookies })

	const [conversationRow] = await db
		.select({
			anonymousUserId: conversation.anonymousUserId,
			knownUserId: conversation.knownUserId,
		})
		.from(conversation)
		.where(eq(conversation.id, conversationId))

	if (conversationRow === undefined)
		throw new Error("Conversation does not exist")

	if (
		conversationRow.anonymousUserId !== auth.id &&
		conversationRow.knownUserId !== auth.id
	)
		throw new Error("Not in conversation")

	await db.update(conversation).set({
		[conversationRow.anonymousUserId === auth.id
			? "anonymousUnread"
			: "knownUnread"]: 0,
	})
})

export default readConversationAction
