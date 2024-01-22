import { cookies } from "next/headers"
import { desc, sql, eq } from "drizzle-orm"
import { unstable_noStore as noStore } from "next/cache"

import db from "~/db/db"
import { user, conversation, message, block } from "~/db/schema"
import { getAuth } from "~/auth/jwt"
import Landing from "./Landing"
import App from "./App"
import PreviewScreen from "./PreviewScreen"

export const dynamic = "force-dynamic"

const launchDate = new Date("Tues, 30 Jan 2024 0:0:0 GMT")

export default async function Index({
	searchParams,
}: {
	searchParams: Record<string, unknown>
}) {
	noStore()

	if (new Date().getTime() < launchDate.getTime()) {
		return <PreviewScreen launchDate={launchDate} />
	}

	const auth = await getAuth({ cookies })

	if (auth === undefined) {
		const invitedByUserIdString = searchParams.invitedBy

		const invitedByUserId = isNaN(Number(invitedByUserIdString))
			? undefined
			: Number(invitedByUserIdString)

		const [userCount, invitedByUser] = await Promise.all([
			db
				.select({ count: sql<number>`count(*)` })
				.from(user)
				.then(([row]) => row?.count ?? 0),
			invitedByUserId !== undefined
				? db
						.select({
							id: user.id,
							firstName: user.firstName,
							lastName: user.lastName,
						})
						.from(user)
						.where(eq(user.id, invitedByUserId))
						.then(([userRow]) => userRow)
				: undefined,
		])

		return (
			<Landing
				initialUserCount={userCount}
				initialLastJoinedUserPromise={db
					.select({
						id: user.id,
						firstName: user.firstName,
						lastName: user.lastName,
					})
					.from(user)
					.where(eq(user.id, userCount))
					.then(([userRow]) => userRow)}
				invitedByUser={invitedByUser}
			/>
		)
	}

	const [users, anonymousConversations, knownConversations, blocks] =
		await Promise.all([
			db
				.select({
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					createdAt: user.createdAt,
				})
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
					special: conversation.special,
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
								special: boolean
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
									special: cur.special,
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
		<>
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
		</>
	)
}
