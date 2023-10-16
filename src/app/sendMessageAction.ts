"use server"
import { zact } from "zact/server"
import { z } from "zod"
import { cookies } from "next/headers"
import { and, eq, sql } from "drizzle-orm"

import db from "~/database/db"
import { conversation, message, block } from "~/database/schema"
import { getAuthOrThrow } from "~/auth/jwt"
import realtime from "~/realtime/realtime"
import moderateContent from "~/ai/moderateContent"
import triggerPotentialSpecialMessage from "./triggerPotentialSpecialMessage/triggerPotentialSpecialMessage"
import discord from "~/discord/discord"

const sendMessageAction = zact(
	z.object({
		conversationId: z.number(),
		content: z.string().min(1),
	})
)(async ({ conversationId, content }) => {
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

	const [blockRow] = await db
		.select()
		.from(block)
		.where(
			and(
				eq(block.blockedUserId, auth.id),
				eq(
					block.blockerUserId,
					conversationRow.anonymousUserId !== auth.id
						? conversationRow.anonymousUserId
						: conversationRow.knownUserId
				)
			)
		)

	if (blockRow !== undefined) throw new Error("You're blocked by this user")

	const flagged = (await moderateContentPromise).flagged

	const sendMessagePromise = discord.send(
		`message sent ${JSON.stringify(
			{ from: auth.id, conversationId, content, flagged },
			null,
			4
		)}`
	)

	const createdMessageRow = await db.transaction(async (tx) => {
		try {
			const [[createdMessageRow]] = await Promise.all([
				tx
					.insert(message)
					.values({
						conversationId,
						fromUserId: auth.id,
						content,
						flagged,
						sentAt,
					})
					.returning({ id: message.id })
					.all(),
				tx
					.update(conversation)
					.set({
						[conversationRow.anonymousUserId !== auth.id
							? "anonymousUnread"
							: "knownUnread"]:
							conversationRow.anonymousUserId !== auth.id
								? sql`anonymous_unread + 1`
								: sql`known_unread + 1`,
					})
					.where(eq(conversation.id, conversationId)),
			])

			return createdMessageRow
		} catch (e) {
			tx.rollback()
		}
	})

	if (createdMessageRow === undefined)
		throw new Error("Failed to create message")

	const triggerPotentialSpecialMessagePromise =
		triggerPotentialSpecialMessage({
			reason: "sentMessage",
			fromUserId: auth.id,
			conversationId,
			content,
		})

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

	await triggerPotentialSpecialMessagePromise

	await sendMessagePromise

	return {
		id: createdMessageRow.id,
		content,
		flagged,
		sentAt,
	}
})

export default sendMessageAction
