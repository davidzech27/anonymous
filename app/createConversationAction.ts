"use server"
import { zact } from "zact/server"
import { z } from "zod"
import { cookies } from "next/headers"

import db from "~/database/db"
import { conversation, message } from "~/database/schema"
import { getAuthOrThrow } from "~/auth/jwt"
import realtime from "~/realtime/realtime"

const createConversationAction = zact(
	z.object({ userId: z.number(), content: z.string().min(1) })
)(async ({ userId, content }) => {
	const auth = await getAuthOrThrow({ cookies })

	const createdAt = new Date()

	const [createdConversationRow] = await db
		.insert(conversation)
		.values({ anonymousUserId: auth.id, knownUserId: userId, createdAt })
		.returning({ id: conversation.id })
		.all()

	if (createdConversationRow === undefined)
		throw new Error("Failed to create conversation")

	const [createdMessageRow] = await db
		.insert(message)
		.values({
			conversationId: createdConversationRow.id,
			fromUserId: auth.id,
			content,
			sentAt: createdAt,
		})
		.returning({ id: message.id })
		.all()

	if (createdMessageRow === undefined)
		throw new Error("Failed to create message")

	await realtime.trigger(userId.toString(), "conversation", {
		id: createdConversationRow.id,
		anonymousUserId: auth.id,
		firstMessage: {
			id: createdMessageRow.id,
			content,
		},
		createdAt,
	})

	return {
		id: createdConversationRow.id,
		createdAt,
		firstMessageId: createdMessageRow.id,
	}
})

export default createConversationAction
