"use server"
import { zact } from "zact/server"
import { z } from "zod"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"

import db from "~/database/db"
import { conversation, message } from "~/database/schema"
import { getAuthOrThrow } from "~/auth/jwt"
import realtime from "~/realtime/realtime"

const sendMessageAction = zact(
	z.object({ conversationId: z.number(), content: z.string().min(1) })
)(async ({ conversationId, content }) => {
	const auth = await getAuthOrThrow({ cookies })

	const sentAt = new Date()

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

	const [createdMessageRow] = await db
		.insert(message)
		.values({
			conversationId,
			fromUserId: auth.id,
			content,
			sentAt,
		})
		.returning({ id: message.id })
		.all()

	if (createdMessageRow === undefined)
		throw new Error("Failed to create message")

	await realtime.trigger(
		(conversationRow.anonymousUserId === auth.id
			? conversationRow.knownUserId
			: conversationRow.anonymousUserId
		).toString(),
		"message",
		{
			id: createdMessageRow.id,
			conversationId,
			content,
			sentAt,
		}
	)

	return { id: createdMessageRow.id }
})

export default sendMessageAction
