import { unstable_noStore as noStore } from "next/cache"
import { notFound } from "next/navigation"
import { Fragment } from "react"
import { getAuth } from "~/auth/jwt"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { type Metadata } from "next"

import Button from "~/components/Button"
import db from "~/db/db"
import { conversation, message, user } from "~/db/schema"
import formatDuration from "~/util/formatDuration"
import env from "~/env.mjs"

export const dynamic = "force-dynamic"

export async function generateMetadata({
	params,
}: {
	params: Record<string, unknown>
}) {
	const { slug } = params

	if (typeof slug !== "string") notFound()

	const decodedSlug = decodeURIComponent(slug)

	const userId = Number(decodedSlug.split(",")[0])

	if (isNaN(userId)) {
		notFound()
	}

	const [userRow] = await db.select().from(user).where(eq(user.id, userId))

	if (userRow === undefined) {
		notFound()
	}

	const description = `view ${userRow.firstName}'s messages on mchsanonymous`

	return {
		title: "mchsanonymous",
		description,
		openGraph: {
			title: "mchsanonymous",
			description,
			images: `${env.URL}/share/${decodedSlug}/opengraph-image.png`,
		},
	} satisfies Metadata
}

export default async function Share({
	params,
	searchParams,
}: {
	params: Record<string, unknown>
	searchParams: Record<string, unknown>
}) {
	noStore()

	const { slug } = params

	if (typeof slug !== "string") notFound()

	const decodedSlug = decodeURIComponent(slug)

	const userId = Number(decodedSlug.split(",")[0])

	const conversationId = Number(decodedSlug.split(",")[1])

	const rangeString = decodedSlug.split(",")[2]

	const startIndex = Number(rangeString?.split("-")[0])

	const endIndex = Number(rangeString?.split("-")[1])

	if (
		isNaN(userId) ||
		isNaN(conversationId) ||
		isNaN(startIndex) ||
		isNaN(endIndex)
	) {
		notFound()
	}

	const [[userRow], [conversationRow], messageRows] = await Promise.all([
		db.select().from(user).where(eq(user.id, userId)),
		db
			.select()
			.from(conversation)
			.where(eq(conversation.id, conversationId)),
		db
			.select()
			.from(message)
			.where(eq(message.conversationId, conversationId)),
	])

	if (userRow === undefined || conversationRow === undefined) {
		notFound()
	}

	if (
		userId !== conversationRow.anonymousUserId &&
		userId !== conversationRow.knownUserId
	) {
		notFound()
	}

	const messages = messageRows.sort(
		(message1, message2) =>
			message1.sentAt.getTime() - message2.sentAt.getTime()
	)

	const selectedMessages = messages.slice(startIndex - 1, endIndex)

	if (selectedMessages.length === 0) {
		notFound()
	}

	const auth = await getAuth({ cookies })

	return (
		<div className="flex h-full flex-col space-y-3 bg-primary p-6 mobile:p-5">
			<div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-white p-3">
				{selectedMessages.map((message) => (
					<Fragment key={message.id}>
						<div className="flex flex-col space-y-3 rounded-lg border border-white bg-white/20 p-3">
							<div className="text-lg font-bold leading-none text-secondary">
								{message.fromUserId === userId
									? `${userRow.firstName} ${userRow.lastName}`
									: "other person"}
							</div>

							{!message.flagged ? (
								<p className="font-medium text-white">
									{message.content}
								</p>
							) : (
								<p className="font-medium text-white">
									this message did not comply with our content
									policy. remember to be nice!
								</p>
							)}

							<div className="flex justify-end">
								<span className="text-lg font-bold leading-none text-secondary">
									{formatDuration(message.sentAt)}
								</span>
							</div>
						</div>
					</Fragment>
				))}
			</div>

			<a
				href={
					auth === undefined &&
					typeof searchParams.invitedBy === "string" &&
					!isNaN(Number(searchParams.invitedBy))
						? `/?invitedBy=${searchParams.invitedBy}`
						: "/"
				}
			>
				<Button className="h-16 w-full text-2xl">
					{auth === undefined
						? "join mchsanonymous"
						: "go to mchsanonymous"}
				</Button>
			</a>
		</div>
	)
}
