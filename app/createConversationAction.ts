"use server"
import { zact } from "zact/server"
import { z } from "zod"
import { cookies } from "next/headers"
import { eq, and } from "drizzle-orm"

import db from "~/database/db"
import { conversation, message, block } from "~/database/schema"
import { getAuthOrThrow } from "~/auth/jwt"
import realtime from "~/realtime/realtime"
import moderateContent from "~/ai/moderateContent"
import discord from "~/discord/discord"

const createConversationAction = zact(
	z.object({ userId: z.number(), content: z.string().min(1) })
)(async ({ userId, content }) => {
	const auth = await getAuthOrThrow({ cookies })

	const moderateContentPromise = moderateContent({
		content,
		categoryScoreThresholds: {
			sexual: 0.5,
			hate: 0.5,
			harassment: 0.8,
			"self-harm": 0.5,
			"sexual/minors": 0.5,
			"hate/threatening": 0.5,
			"violence/graphic": 0.5,
			"self-harm/intent": 0.5,
			"self-harm/instructions": 0.5,
			"harassment/threatening": 0.5,
			violence: 0.5,
		},
	})

	const [blockRow] = await db
		.select()
		.from(block)
		.where(
			and(
				eq(block.blockedUserId, auth.id),
				eq(block.blockerUserId, userId)
			)
		)

	if (blockRow !== undefined) throw new Error("You're blocked by this user")

	const createdAt = new Date()

	const [createdConversationRow] = await db
		.insert(conversation)
		.values({ anonymousUserId: auth.id, knownUserId: userId, createdAt })
		.returning({ id: conversation.id })
		.all()

	if (createdConversationRow === undefined)
		throw new Error("Failed to create conversation")

	const flagged = (await moderateContentPromise).flagged

	const sendMessagePromise = discord.send(
		`conversation created ${JSON.stringify(
			{ from: auth.id, to: userId, content, flagged },
			null,
			4
		)}`
	)

	const [createdMessageRow] = await db
		.insert(message)
		.values({
			conversationId: createdConversationRow.id,
			fromUserId: auth.id,
			content,
			flagged,
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
			flagged,
		},
		createdAt,
	})

	await sendMessagePromise

	return {
		id: createdConversationRow.id,
		firstMessage: {
			id: createdMessageRow.id,
			content,
			flagged,
		},
		createdAt,
	}
})

export default createConversationAction
