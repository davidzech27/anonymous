import { notFound } from "next/navigation"
import { ImageResponse } from "next/og"
import { Fragment } from "react"
import { eq } from "drizzle-orm"

import db from "~/db/db"
import { conversation, message, user } from "~/db/schema"

export const runtime = "edge"

export default function SharePreview({
	params,
}: {
	params: Record<string, unknown>
}) {
	// const { slug } = params

	// if (typeof slug !== "string") notFound()

	// const decodedSlug = decodeURIComponent(slug)

	// const userId = Number(decodedSlug.split(",")[0])

	// const conversationId = Number(decodedSlug.split(",")[1])

	// const rangeString = decodedSlug.split(",")[2]

	// const startIndex = Number(rangeString?.split("-")[0])

	// const endIndex = Number(rangeString?.split("-")[1])

	// if (
	// 	isNaN(userId) ||
	// 	isNaN(conversationId) ||
	// 	isNaN(startIndex) ||
	// 	isNaN(endIndex)
	// ) {
	// 	notFound()
	// }

	// const [[userRow], [conversationRow], messageRows] = await Promise.all([
	// 	db.select().from(user).where(eq(user.id, userId)),
	// 	db
	// 		.select()
	// 		.from(conversation)
	// 		.where(eq(conversation.id, conversationId)),
	// 	db
	// 		.select()
	// 		.from(message)
	// 		.where(eq(message.conversationId, conversationId)),
	// ])

	// if (userRow === undefined || conversationRow === undefined) {
	// 	notFound()
	// }

	// if (
	// 	userId !== conversationRow.anonymousUserId &&
	// 	userId !== conversationRow.knownUserId
	// ) {
	// 	notFound()
	// }

	// const messages = messageRows.sort(
	// 	(message1, message2) =>
	// 		message1.sentAt.getTime() - message2.sentAt.getTime()
	// )

	// const selectedMessages = messages.slice(startIndex - 1, endIndex)

	// if (selectedMessages.length === 0) {
	// 	notFound()
	// }

	return new ImageResponse(
		(
			<div className="flex h-full flex-col space-y-3 bg-primary p-6 mobile:p-5">
				<div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-white p-3">
					{/* {selectedMessages.map((message) => (
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
										this message did not comply with our
										content policy. remember to be nice!
									</p>
								)}
							</div>
						</Fragment>
					))} */}
				</div>
			</div>
		)
	)
}
