import { notFound } from "next/navigation"
import { ImageResponse } from "next/og"
import { eq } from "drizzle-orm"
import fs from "fs"
import path from "path"
import url from "url"

import db from "~/db/db"
import { conversation, message, user } from "~/db/schema"

const colors = {
	primary: "#4A7460",
	secondary: "#EBCC7A",
}

export async function GET(request: Request) {
	const slug = request.url.split("/").at(-2)

	const snapchatSticker =
		request.headers
			.get("User-Agent")
			?.startsWith("Snapchat Creative Kit Web Share") ?? false

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

	let selectedMessages = messages.slice(startIndex - 1, endIndex)

	if (selectedMessages.length === 0) {
		notFound()
	}

	selectedMessages = selectedMessages.slice(0, 3)

	const height = snapchatSticker ? 1200 : 630

	const [mediumFont, boldFont] = await Promise.all([
		fs.promises.readFile(
			path.join(
				url.fileURLToPath(import.meta.url),
				"../SF-Pro-Medium.otf"
			)
		),
		fs.promises.readFile(
			path.join(url.fileURLToPath(import.meta.url), "../SF-Pro-Bold.otf")
		),
	])

	const imageResponseBodyStream = new ImageResponse(
		(
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					height: "100%",
					fontFamily: "SF-Pro",
					width: "100%",
				}}
			>
				<div
					style={{
						width: "100%",
						display: "flex",
						justifyContent: "center",
						backgroundColor: colors.primary,
						padding: `${
							snapchatSticker
								? 16
								: [16, 14, 12][selectedMessages.length - 1]
						}px`,
						paddingTop: `${
							snapchatSticker
								? 32
								: [32, 28, 24][selectedMessages.length - 1]
						}px`,
					}}
				>
					<span
						style={{
							color: colors.secondary,
							fontSize: "4rem",
							fontWeight: 700,
							letterSpacing: "-0.05em",
						}}
					>
						mchsanonymous conversation #{conversationId}
					</span>
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						backgroundColor: colors.primary,
						flex: 1,
						gap: "16px",
						overflowY: "auto",
						padding: `${
							snapchatSticker
								? 32
								: [32, 28, 24][selectedMessages.length - 1]
						}px`,
						paddingTop: "0px",
					}}
				>
					{selectedMessages.map((message) => (
						<div
							key={message.id}
							style={{
								flexShrink: 1,
								display: "flex",
								width: "100%",
								flexDirection: "column",
								borderRadius: "0.375rem",
								border: "1px solid white",
								backgroundColor: "rgba(255, 255, 255, 0.2)",
								padding: `${
									snapchatSticker
										? 32
										: [32, 28, 24][
												selectedMessages.length - 1
										  ]
								}px`,
							}}
						>
							<div
								style={{
									fontSize: `${
										snapchatSticker
											? 4
											: [4, 3, 2][
													selectedMessages.length - 1
											  ]
									}rem`,
									fontWeight: 700,
									letterSpacing: "-0.05em",
									color: colors.secondary,
								}}
							>
								{message.fromUserId === userId
									? `${userRow.firstName} ${userRow.lastName}`
									: "other person"}
							</div>

							{!message.flagged ? (
								<p
									style={{
										fontSize: `${
											snapchatSticker
												? 4
												: [4, 3, 2][
														selectedMessages.length -
															1
												  ]
										}rem`,
										fontWeight: 500,
										color: "white",
									}}
								>
									{message.content}
								</p>
							) : (
								<p
									style={{
										fontSize: `${
											snapchatSticker
												? 4
												: [4, 3, 2][
														selectedMessages.length -
															1
												  ]
										}rem`,
										color: "white",
									}}
								>
									this message did not comply with our content
									policy. remember to be nice!
								</p>
							)}
						</div>
					))}
				</div>
			</div>
		),
		{
			height,
			width: 1200,
			fonts: [
				{
					name: "SF-Pro",
					data: mediumFont,
					style: "normal",
					weight: 500,
				},
				{
					name: "SF-Pro",
					data: boldFont,
					style: "normal",
					weight: 700,
				},
			],
		}
	).body

	if (imageResponseBodyStream === null) {
		return new Response(null)
	}

	let imageResponseBody = new Uint8Array()

	const reader = imageResponseBodyStream.getReader()

	let result = await reader.read()

	while (!result.done) {
		imageResponseBody = new Uint8Array([
			...imageResponseBody,
			...result.value,
		])

		result = await reader.read()
	}

	return new Response(imageResponseBody, {
		headers: {
			"Content-Type": "image/png",
		},
	})
}
