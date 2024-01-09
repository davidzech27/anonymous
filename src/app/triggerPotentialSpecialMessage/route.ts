import { NextResponse, type NextRequest } from "next/server"
import { verifySignatureEdge } from "@upstash/qstash/dist/nextjs"
import { eq, sql, and } from "drizzle-orm"

import env from "~/env.mjs"
import { triggerPotentialSpecialMessageSchema } from "./triggerPotentialSpecialMessage"
import db from "~/db/db"
import { conversation, message, user } from "~/db/schema"
import realtime from "~/realtime/realtime"

async function handler(req: NextRequest) {
	const body = triggerPotentialSpecialMessageSchema.parse(await req.json())

	if (body.reason === "userJoined") {
		const { userId, invitedByUserId } = body

		if (userId === 1) return new NextResponse(null)

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
					Math.floor(invitedByUserRow.invitedUsers / 5) -
					invitedByUserRow.revealedUsers

				const usersLeft =
					5 -
					invitedByUserRow.invitedUsers +
					5 * invitedByUserRow.revealedUsers

				const content = `${userRow.firstName} ${
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
				}`

				const [createdMessageRow] = await db
					.insert(message)
					.values({
						conversationId: specialConversationRow.id,
						fromUserId: 1,
						content,
						flagged: false,
						sentAt: createdAt,
					})
					.returning({ id: message.id })
					.all()

				if (createdMessageRow === undefined)
					throw new Error("Failed to create message")

				await realtime.trigger(invitedByUserId.toString(), "message", {
					id: createdMessageRow.id,
					conversationId: specialConversationRow.id,
					content,
					flagged: false,
					sentAt: createdAt,
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

		const content = `welcome to mchsanonymous! send anyone you want anonymous messages—you can see who they are, but they won't be able to see who you are. remember not to cyberbully, or you will be banned. have fun!`

		const [createdMessageRow] = await db
			.insert(message)
			.values({
				conversationId: createdConversationRow.id,
				fromUserId: 1,
				content,
				flagged: false,
				sentAt: createdAt,
			})
			.returning({ id: message.id })
			.all()

		if (createdMessageRow === undefined)
			throw new Error("Failed to create message")

		await realtime.trigger(userId.toString(), "conversation", {
			id: createdConversationRow.id,
			anonymousUserId: 1,
			special: true,
			firstMessage: {
				id: createdMessageRow.id,
				content,
				flagged: false,
			},
			createdAt,
		})

		await new Promise((res) => setTimeout(res, 1000 * 5))

		const secondCreatedAt = new Date()

		const secondContent = `try picking someone from the user list to send an anonymous message to—they'll (probably) never know it's you!`

		const [secondCreatedMessageRow] = await db
			.insert(message)
			.values({
				conversationId: createdConversationRow.id,
				fromUserId: 1,
				content: secondContent,
				flagged: false,
				sentAt: secondCreatedAt,
			})
			.returning({ id: message.id })
			.all()

		if (secondCreatedMessageRow === undefined)
			throw new Error("Failed to create message")

		await realtime.trigger(userId.toString(), "message", {
			id: secondCreatedMessageRow.id,
			conversationId: createdConversationRow.id,
			content: secondContent,
			flagged: false,
			sentAt: secondCreatedAt,
		})

		await new Promise((res) => setTimeout(res, 1000 * 3))

		const thirdCreatedAt = new Date()

		const thirdContent = `it'll be fun i promise`

		const [thirdCreatedMessageRow] = await db
			.insert(message)
			.values({
				conversationId: createdConversationRow.id,
				fromUserId: 1,
				content: thirdContent,
				flagged: false,
				sentAt: thirdCreatedAt,
			})
			.returning({ id: message.id })
			.all()

		if (thirdCreatedMessageRow === undefined)
			throw new Error("Failed to create message")

		await realtime.trigger(userId.toString(), "message", {
			id: thirdCreatedMessageRow.id,
			conversationId: createdConversationRow.id,
			content: thirdContent,
			flagged: false,
			sentAt: thirdCreatedAt,
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
					.update(user)
					.set({ revealedUsers: sql`revealed_users + 1` })
					.where(eq(user.id, fromUserId))
					.returning()
					.all()

				if (userRow !== undefined) {
					userRow.revealedUsers--

					const usersAllowedToReveal =
						Math.floor(userRow.invitedUsers / 5) -
						userRow.revealedUsers

					const usersLeft =
						5 - userRow.invitedUsers + 5 * userRow.revealedUsers

					let content: string

					let revealed = false

					if (usersAllowedToReveal <= 0) {
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

					if (revealed === false)
						await db
							.update(user)
							.set({ revealedUsers: sql`revealed_users - 1` })
							.where(eq(user.id, fromUserId))

					const sentAt = new Date()

					const [createdMessageRow] = await db
						.insert(message)
						.values({
							conversationId: specialConversationRow.id,
							fromUserId: 1,
							content,
							flagged: false,
							sentAt,
						})
						.returning({ id: message.id })
						.all()

					if (createdMessageRow === undefined)
						throw new Error("Failed to create message")

					await realtime.trigger(fromUserId.toString(), "message", {
						id: createdMessageRow.id,
						conversationId: specialConversationRow.id,
						content,
						flagged: false,
						sentAt,
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

			const content = `hey, for every 5 new people you invite here using your unique invite link, you'll get to reveal the identity of someone who's anonymously messaged you. here it is: ${inviteLink}. plus, this place will be a lot cooler when everyone you know is on it`

			if (
				conversationRow?.knownUserId === fromUserId &&
				specialConversationMessages.find(
					(message) => message.content === content
				) === undefined
			) {
				const sentAt = new Date()

				const [createdMessageRow] = await db
					.insert(message)
					.values({
						conversationId: specialConversationRow.id,
						fromUserId: 1,
						content,
						flagged: false,
						sentAt,
					})
					.returning({ id: message.id })
					.all()

				if (createdMessageRow === undefined)
					throw new Error("Failed to create message")

				await realtime.trigger(fromUserId.toString(), "message", {
					id: createdMessageRow.id,
					conversationId: specialConversationRow.id,
					content,
					flagged: false,
					sentAt,
				})

				await new Promise((res) => setTimeout(res, 1000 * 5))

				const secondContent = "you should invite someone fr fr"

				const secondSentAt = new Date()

				const [secondCreatedMessageRow] = await db
					.insert(message)
					.values({
						conversationId: specialConversationRow.id,
						fromUserId: 1,
						content: secondContent,
						flagged: false,
						sentAt: secondSentAt,
					})
					.returning({ id: message.id })
					.all()

				if (secondCreatedMessageRow === undefined)
					throw new Error("Failed to create message")

				await realtime.trigger(fromUserId.toString(), "message", {
					id: secondCreatedMessageRow.id,
					conversationId: specialConversationRow.id,
					content: secondContent,
					flagged: false,
					sentAt: secondSentAt,
				})
			}
		}
	}

	return new NextResponse(null)
}

export const POST = verifySignatureEdge(handler)
