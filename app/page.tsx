import { cookies } from "next/headers"
import { desc, sql, eq, asc } from "drizzle-orm"

import db from "~/database/db"
import { user, conversation, message } from "~/database/schema"
import { getAuth } from "~/auth/jwt"
import Landing from "./Landing"
import App from "./App"

export default async function Index() {
	const auth = await getAuth({ cookies })

	if (auth === undefined)
		return (
			<Landing
				initialUserCount={await db
					.select({ count: sql<number>`count(*)` })
					.from(user)
					.then(([row]) => row?.count ?? 0)}
			/>
		)

	const [users, anonymousConversations, initialKnownConversations] =
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
						id: user.id,
					},
					message: {
						id: message.id,
						fromUserId: message.fromUserId,
						content: message.content,
						sentAt: message.sentAt,
					},
				})
				.from(conversation)
				.where(eq(conversation.knownUserId, auth.id))
				.innerJoin(user, eq(user.id, conversation.knownUserId))
				.innerJoin(message, eq(conversation.id, message.conversationId))
				.orderBy(desc(message.sentAt))
				.then((rows) =>
					rows
						.reduce<
							{
								id: number
								user: { id: number }
								messages: {
									id: number
									me: boolean
									content: string
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
									messages: [
										{
											id: cur.message.id,
											me:
												cur.message.fromUserId ===
												auth.id,
											content: cur.message.content,
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
						firstName: user.firstName,
						lastName: user.lastName,
					},
					message: {
						id: message.id,
						fromUserId: message.fromUserId,
						content: message.content,
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
								user: { firstName: string; lastName: string }
								messages: {
									id: number
									me: boolean
									content: string
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
										firstName: cur.user.firstName,
										lastName: cur.user.lastName,
									},
									messages: [
										{
											id: cur.message.id,
											me:
												cur.message.fromUserId ===
												auth.id,
											content: cur.message.content,
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
		])

	return (
		<App
			userId={auth.id}
			initialUsers={users}
			initialAnonymousConversations={anonymousConversations}
			initialKnownConversations={initialKnownConversations}
		/>
	)
}
