import { cookies } from "next/headers"
import { desc, sql, eq } from "drizzle-orm"

import db from "~/database/db"
import { user, conversation, message, block } from "~/database/schema"
import { getAuth } from "~/auth/jwt"
import Landing from "./Landing"
import App from "./App"

export default async function Index() {
	const auth = await getAuth({ cookies })

	if (auth === undefined) {
		const userCount = await db
			.select({ count: sql<number>`count(*)` })
			.from(user)
			.then(([row]) => row?.count ?? 0)

		return (
			<Landing
				initialUserCount={userCount}
				initialLastJoinedUserPromise={db
					.select()
					.from(user)
					.where(eq(user.id, userCount))
					.then(([userRow]) => userRow ?? undefined)}
			/>
		)
	}

	const [users, anonymousConversations, knownConversations, blocks] =
		await Promise.all([
			db
				.select()
				.from(user)
				.orderBy(desc(user.createdAt))
				.then((rows) => rows.filter(({ id }) => id !== auth.id)),
			db
				.select({
					conversation: {
						id: conversation.id,
						createdAt: conversation.createdAt,
					},
					user: {
						id: conversation.anonymousUserId,
					},
					unread: conversation.knownUnread,
					message: {
						id: message.id,
						fromUserId: message.fromUserId,
						content: message.content,
						flagged: message.flagged,
						sentAt: message.sentAt,
					},
				})
				.from(conversation)
				.where(eq(conversation.knownUserId, auth.id))
				.innerJoin(message, eq(conversation.id, message.conversationId))
				.orderBy(desc(message.sentAt))
				.then((rows) =>
					rows
						.reduce<
							{
								id: number
								user: { id: number }
								unread: number
								messages: {
									id: number
									me: boolean
									content: string
									flagged: boolean
									sentAt: Date
								}[]
								createdAt: Date
							}[]
						>((prev, cur) => {
							const conversationIndex = prev.findIndex(
								({ id }) => id === cur.conversation.id
							)

							if (conversationIndex === -1)
								return prev.concat({
									id: cur.conversation.id,
									user: {
										id: cur.user.id,
									},
									unread: cur.unread,
									messages: [
										{
											id: cur.message.id,
											me:
												cur.message.fromUserId ===
												auth.id,
											content: cur.message.content,
											flagged: cur.message.flagged,
											sentAt: cur.message.sentAt,
										},
									],
									createdAt: cur.conversation.createdAt,
								})

							const conversation = prev[conversationIndex]

							if (conversation === undefined) return prev

							return [
								...prev.slice(0, conversationIndex),
								{
									...conversation,
									messages: conversation.messages.concat({
										id: cur.message.id,
										me: cur.message.fromUserId === auth.id,
										content: cur.message.content,
										flagged: cur.message.flagged,
										sentAt: cur.message.sentAt,
									}),
								},
								...prev.slice(conversationIndex + 1),
							]
						}, [])
						.map(({ messages, ...conversation }) => ({
							...conversation,
							messages: messages.reverse(),
						}))
				),
			db
				.select({
					conversation: {
						id: conversation.id,
						createdAt: conversation.createdAt,
					},
					user: {
						id: user.id,
						firstName: user.firstName,
						lastName: user.lastName,
					},
					unread: conversation.anonymousUnread,
					message: {
						id: message.id,
						fromUserId: message.fromUserId,
						content: message.content,
						flagged: message.flagged,
						sentAt: message.sentAt,
					},
				})
				.from(conversation)
				.where(eq(conversation.anonymousUserId, auth.id))
				.innerJoin(user, eq(user.id, conversation.knownUserId))
				.innerJoin(message, eq(conversation.id, message.conversationId))
				.orderBy(desc(message.sentAt))
				.then((rows) =>
					rows
						.reduce<
							{
								id: number
								user: {
									id: number
									firstName: string
									lastName: string
								}
								unread: number
								messages: {
									id: number
									me: boolean
									content: string
									flagged: boolean
									sentAt: Date
								}[]
								createdAt: Date
							}[]
						>((prev, cur) => {
							const conversationIndex = prev.findIndex(
								({ id }) => id === cur.conversation.id
							)

							if (conversationIndex === -1)
								return prev.concat({
									id: cur.conversation.id,
									user: {
										id: cur.user.id,
										firstName: cur.user.firstName,
										lastName: cur.user.lastName,
									},
									unread: cur.unread,
									messages: [
										{
											id: cur.message.id,
											me:
												cur.message.fromUserId ===
												auth.id,
											content: cur.message.content,
											flagged: cur.message.flagged,
											sentAt: cur.message.sentAt,
										},
									],
									createdAt: cur.conversation.createdAt,
								})

							const conversation = prev[conversationIndex]

							if (conversation === undefined) return prev

							return [
								...prev.slice(0, conversationIndex),
								{
									...conversation,
									messages: conversation.messages.concat({
										id: cur.message.id,
										me: cur.message.fromUserId === auth.id,
										content: cur.message.content,
										flagged: cur.message.flagged,
										sentAt: cur.message.sentAt,
									}),
								},
								...prev.slice(conversationIndex + 1),
							]
						}, [])
						.map(({ messages, ...conversation }) => ({
							...conversation,
							messages: messages.reverse(),
						}))
				),
			db
				.select({ blockedUserId: block.blockedUserId })
				.from(block)
				.where(eq(block.blockerUserId, auth.id)),
		])

	return (
		<App
			userId={auth.id}
			initialUsers={users.map((user) =>
				blocks.find(
					({ blockedUserId }) => blockedUserId === user.id
				) !== undefined
					? { ...user, blocked: true }
					: { ...user, blocked: false }
			)}
			initialAnonymousConversations={anonymousConversations.map(
				(conversation) => ({
					...conversation,
					user: {
						...conversation.user,
						blocked:
							blocks.find(
								({ blockedUserId }) =>
									blockedUserId === conversation.user.id
							) !== undefined,
					},
				})
			)}
			initialKnownConversations={knownConversations.map(
				(conversation) => ({
					...conversation,
					user: {
						...conversation.user,
						blocked:
							blocks.find(
								({ blockedUserId }) =>
									blockedUserId === conversation.user.id
							) !== undefined,
					},
				})
			)}
		/>
	)
}
