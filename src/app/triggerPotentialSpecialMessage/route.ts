import { NextResponse, type NextRequest } from "next/server"
import { verifySignatureEdge } from "@upstash/qstash/dist/nextjs"
import { eq, sql, and } from "drizzle-orm"

import env from "~/env.mjs"
import { triggerPotentialSpecialMessageSchema } from "./triggerPotentialSpecialMessage"
import db from "~/db/db"
import { conversation, message, user } from "~/db/schema"
import realtime from "~/realtime/realtime"

async function sendMessage({
	conversationId,
	fromUserId,
	toUserId,
	content,
}: {
	conversationId: number
	fromUserId: number
	toUserId: number
	content: string
}) {
	const sentAt = new Date()

	const [createdMessageRow] = await db
		.insert(message)
		.values({
			conversationId,
			fromUserId,
			content,
			flagged: false,
			sentAt,
		})
		.returning({ id: message.id })
		.all()

	if (createdMessageRow === undefined)
		throw new Error("Failed to create message")

	await realtime.trigger(toUserId.toString(), "message", {
		id: createdMessageRow.id,
		conversationId,
		content,
		flagged: false,
		sentAt,
	})
}

async function handler(req: NextRequest) {
	const body = triggerPotentialSpecialMessageSchema.parse(await req.json())

	if (body.reason === "userJoined") {
		const { userId, invitedByUserId } = body

		const createdAt = new Date()

		const sendInvitedByUserMessagePromise = (async () => {
			if (invitedByUserId !== undefined) {
				const [
					[userRow],
					[invitedByUserRow],
					[specialConversationRow],
				] = await Promise.all([
					db
						.select({
							firstName: user.firstName,
							lastName: user.lastName,
						})
						.from(user)
						.where(eq(user.id, userId)),
					db
						.update(user)
						.set({ invitedUsers: sql`invited_users + 1` })
						.where(eq(user.id, invitedByUserId))
						.returning()
						.all(),
					db
						.select({ id: conversation.id })
						.from(conversation)
						.where(
							and(
								eq(conversation.knownUserId, invitedByUserId),
								eq(conversation.special, true)
							)
						),
				])

				if (
					userRow === undefined ||
					invitedByUserRow === undefined ||
					specialConversationRow === undefined
				)
					return

				const usersAllowedToReveal =
					Math.floor(invitedByUserRow.invitedUsers / 3) -
					invitedByUserRow.revealedUsers

				const usersLeft =
					3 -
					invitedByUserRow.invitedUsers +
					3 * invitedByUserRow.revealedUsers

				await sendMessage({
					conversationId: specialConversationRow.id,
					fromUserId: 1,
					toUserId: invitedByUserId,
					content: `${userRow.firstName} ${
						userRow.lastName
					} just joined using your invite link. this is your ${
						invitedByUserRow.invitedUsers
					}${
						["th", "st", "nd", "rd"][
							invitedByUserRow.invitedUsers > 10 &&
							invitedByUserRow.invitedUsers < 20
								? 0
								: invitedByUserRow.invitedUsers % 10
						] ?? "th"
					} invited user. ${
						usersAllowedToReveal > 0
							? `you can pick ${
									usersAllowedToReveal === 1
										? "an anonymous conversation"
										: `${usersAllowedToReveal} anonymous conversations`
							  } to reveal the identity of the person with whom you're talking. just send the conversation #`
							: `only ${usersLeft} more invites before you can pick an anonymous conversation to reveal the identity of the person with whom you're talking`
					}`,
				})
			}
		})()

		const [createdConversationRow] = await db
			.insert(conversation)
			.values({
				anonymousUserId: 1,
				knownUserId: userId,
				special: true,
				anonymousUnread: 0,
				knownUnread: 1,
				createdAt,
			})
			.returning()
			.all()

		if (createdConversationRow === undefined)
			throw new Error("Failed to create conversation")

		await sendMessage({
			conversationId: createdConversationRow.id,
			fromUserId: 1,
			toUserId: userId,
			content: `welcome to mchsanonymous! send anyone you want anonymous messages—you can see who they are, but they won't be able to see who you are. remember not to cyberbully, or you will be banned. have fun!`,
		})

		await new Promise((res) => setTimeout(res, 1000 * 5))

		await sendMessage({
			conversationId: createdConversationRow.id,
			fromUserId: 1,
			toUserId: userId,
			content: `try picking someone from your school to send an anonymous message to—they'll (probably) never know it's you!`,
		})

		await new Promise((res) => setTimeout(res, 1000 * 3))

		await sendMessage({
			conversationId: createdConversationRow.id,
			fromUserId: 1,
			toUserId: userId,
			content: `it'll be fun i promise`,
		})

		await new Promise((res) => setTimeout(res, 1000 * 3))

		await sendMessage({
			conversationId: createdConversationRow.id,
			fromUserId: 1,
			toUserId: userId,
			content: `if anyone you want to anonymously chat isn't on mchsanonymous, you should invite them! use this link: ${env.URL}/?invitedBy=${userId}`,
		})

		await sendMessage({
			conversationId: createdConversationRow.id,
			fromUserId: 1,
			toUserId: userId,
			content: `send it to a group chat, your DMs, or your Instagram story. or share to Snapchat using this link: https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(
				`${env.URL}/?invitedBy=${userId}`
			)}`,
		})

		await sendMessage({
			conversationId: createdConversationRow.id,
			fromUserId: 1,
			toUserId: userId,
			content:
				"you can also invite people by sharing your conversations. try clicking/tapping on the messages you want to share",
		})

		await new Promise((res) => setTimeout(res, 1000 * 5))

		await sendMessage({
			conversationId: createdConversationRow.id,
			fromUserId: 1,
			toUserId: userId,
			content: "you should invite someone fr fr",
		})

		await sendInvitedByUserMessagePromise
	} else if (body.reason === "sentMessage") {
		const { fromUserId, conversationId, content } = body

		const inviteLink = `${env.URL}/?invitedBy=${fromUserId}`

		const [specialConversationRow] = await db
			.select({ id: conversation.id })
			.from(conversation)
			.where(
				and(
					eq(conversation.knownUserId, fromUserId),
					eq(conversation.special, true)
				)
			)

		if (
			specialConversationRow !== undefined &&
			conversationId === specialConversationRow.id
		) {
			const revealedConversationId = Number(content.match(/\d+/g)?.[0])

			if (!isNaN(revealedConversationId)) {
				const [userRow] = await db
					.select({
						invitedUsers: user.invitedUsers,
						revealedUsers: user.revealedUsers,
					})
					.from(user)
					.where(eq(user.id, fromUserId))

				if (userRow !== undefined) {
					const usersAllowedToReveal =
						Math.floor(userRow.invitedUsers / 3) -
						userRow.revealedUsers

					let content: string

					let revealed = false

					if (usersAllowedToReveal <= 0) {
						const usersLeft =
							3 * userRow.revealedUsers - userRow.invitedUsers + 3

						content = `you still have to invite ${usersLeft} more users until you can reveal any${
							userRow.revealedUsers > 0 ? " more" : ""
						} identities. remember, here's your unique invite link: ${inviteLink}`
					} else {
						const [revealedConversationRow] = await db
							.select()
							.from(conversation)
							.where(
								and(
									eq(conversation.id, revealedConversationId),
									eq(conversation.knownUserId, fromUserId)
								)
							)

						if (revealedConversationRow === undefined) {
							content = "you're not in that conversation"
						} else {
							const [revealedUserRow] = await db
								.select({
									firstName: user.firstName,
									lastName: user.lastName,
								})
								.from(user)
								.where(
									eq(
										user.id,
										revealedConversationRow.anonymousUserId
									)
								)

							if (revealedUserRow !== undefined) {
								revealed = true

								content = `their name is ${revealedUserRow.firstName} ${revealedUserRow.lastName}`
							} else {
								content = "we can't find that user"
							}
						}
					}

					if (revealed) {
						await db
							.update(user)
							.set({
								revealedUsers: sql`revealed_users + 1`,
							})
							.where(eq(user.id, fromUserId))
					}

					await sendMessage({
						conversationId: specialConversationRow.id,
						fromUserId: 1,
						toUserId: fromUserId,
						content,
					})
				}
			}
		} else if (specialConversationRow !== undefined) {
			const [specialConversationMessages, [conversationRow]] =
				await Promise.all([
					db
						.select()
						.from(message)
						.where(
							eq(
								message.conversationId,
								specialConversationRow.id
							)
						),
					db
						.select()
						.from(conversation)
						.where(eq(conversation.id, conversationId)),
				])

			if (
				conversationRow?.knownUserId === fromUserId &&
				specialConversationMessages.find(
					(message) => message.content === content
				) === undefined
			) {
				await sendMessage({
					conversationId: specialConversationRow.id,
					fromUserId: 1,
					toUserId: fromUserId,
					content: `hey, for every 3 new people you invite here, you'll get to reveal the identity of someone who's anonymously messaged you. plus, this place will be a lot cooler when everyone you know is on it`,
				})
			}
		}
	}

	return new NextResponse(null)
}

export const POST = verifySignatureEdge(handler)
