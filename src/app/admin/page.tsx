import { unstable_noStore as noStore } from "next/cache"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { sql } from "drizzle-orm"

import { getAuth } from "~/auth/jwt"
import db from "~/db/db"
import { user, conversation } from "~/db/schema"
import Button from "~/components/Button"
import sendSMSNotificationsAction from "../sendSMSNotificationsAction"

export default async function Admin() {
	noStore()

	const auth = await getAuth({ cookies })

	if (auth?.id !== 1) notFound()

	const [users, anonymousUnreadMessages, knownUnreadMessages] =
		await Promise.all([
			db
				.select({
					id: user.id,
					phoneNumber: user.phoneNumber,
					firstName: user.firstName,
					lastName: user.lastName,
				})
				.from(user),
			db
				.select({
					userId: conversation.anonymousUserId,
					count: sql<number>`SUM(${conversation.anonymousUnread})`,
				})
				.from(conversation)
				.groupBy(conversation.anonymousUserId),
			db
				.select({
					userId: conversation.knownUserId,
					count: sql<number>`SUM(${conversation.knownUnread})`,
				})
				.from(conversation)
				.groupBy(conversation.knownUserId),
		])

	const userIdToAnonymousUnreadMessagesMap = new Map(
		anonymousUnreadMessages.map((anonymousUnreadMessage) => [
			anonymousUnreadMessage.userId,
			anonymousUnreadMessage.count,
		])
	)

	const userIdToKnownUnreadMessagesMap = new Map(
		knownUnreadMessages.map((knownUnreadMessage) => [
			knownUnreadMessage.userId,
			knownUnreadMessage.count,
		])
	)

	const usersWithUnreadMessages = users.map((user) => ({
		id: user.id,
		phoneNumber: user.phoneNumber,
		firstName: user.firstName,
		lastName: user.lastName,
		unread:
			(userIdToAnonymousUnreadMessagesMap.get(user.id) ?? 0) +
			(userIdToKnownUnreadMessagesMap.get(user.id) ?? 0),
	}))

	return (
		<>
			<ul>
				{usersWithUnreadMessages.map((user) => (
					<li key={user.id} className="text-white">
						{user.id}. {user.firstName} {user.lastName}:{" "}
						{user.unread}
					</li>
				))}
			</ul>

			<form
				action={async () => {
					"use server"

					await sendSMSNotificationsAction(usersWithUnreadMessages)
				}}
			>
				<Button type="submit">send SMS notifications</Button>
			</form>
		</>
	)
}
