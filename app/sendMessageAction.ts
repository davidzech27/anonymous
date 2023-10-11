"use server"
import { zact } from "zact/server"
import { z } from "zod"
import { cookies } from "next/headers"
import { and, eq } from "drizzle-orm"

import db from "~/database/db"
import { conversation, message, block } from "~/database/schema"
import { getAuthOrThrow } from "~/auth/jwt"
import realtime from "~/realtime/realtime"
import moderateContent from "~/ai/moderateContent"
import discord from "~/discord/discord"

const sendMessageAction = zact(
	z.object({
		conversationId: z.number(),
		userId: z.number(),
		content: z.string().min(1),
	})
)(async ({ conversationId, userId, content }) => {
	const auth = await getAuthOrThrow({ cookies })

	const moderateContentPromise = moderateContent({
		content,
		categoryScoreThresholds: {
			sexual: 0.95,
			hate: 0.9,
			harassment: 0.99,
			"self-harm": 0.95,
			"sexual/minors": 0.5,
			"hate/threatening": 0.75,
			"violence/graphic": 0.75,
			"self-harm/intent": 0.95,
			"self-harm/instructions": 0.95,
			"harassment/threatening": 0.95,
			violence: 0.95,
		},
	})

	const sentAt = new Date()

	const [[conversationRow]] = await Promise.all([
		db
			.select({
				anonymousUserId: conversation.anonymousUserId,
				knownUserId: conversation.knownUserId,
			})
			.from(conversation)
			.where(eq(conversation.id, conversationId)),
		(async () => {
			const [blockRow] = await db
				.select()
				.from(block)
				.where(
					and(
						eq(block.blockedUserId, auth.id),
						eq(block.blockerUserId, userId)
					)
				)

			if (blockRow !== undefined)
				throw new Error("You're blocked by this user")
		})(),
	])

	if (
		conversationRow === undefined ||
		(conversationRow.anonymousUserId !== userId &&
			conversationRow.knownUserId !== userId)
	)
		throw new Error("Conversation does not exist")

	if (
		conversationRow.anonymousUserId !== auth.id &&
		conversationRow.knownUserId !== auth.id
	)
		throw new Error("Not in conversation")

	const sendMessagePromise = discord.send(
		`message sent ${JSON.stringify(
			{ from: auth.id, conversationId, content },
			null,
			4
		)}`
	)

	const flagged = (await moderateContentPromise).flagged

	const [createdMessageRow] = await db
		.insert(message)
		.values({
			conversationId,
			fromUserId: auth.id,
			content,
			flagged,
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
			flagged,
			sentAt,
		}
	)

	await sendMessagePromise

	return {
		id: createdMessageRow.id,
		content,
		flagged,
		sentAt,
	}
})

export default sendMessageAction
