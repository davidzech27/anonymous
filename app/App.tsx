"use client"
import { useState, useCallback } from "react"
import { z } from "zod"

import createConversationAction from "./createConversationAction"
import sendMessageAction from "./sendMessageAction"
import useRealtime from "~/realtime/useRealtime"
import formatDuration from "~/util/formatDuration"
import Conversation from "./Conversation"
import cn from "~/util/cn"

interface Props {
	userId: number
	initialUsers: {
		id: number
		firstName: string
		lastName: string
		createdAt: Date
	}[]
	initialAnonymousConversations: {
		id: number
		user: {
			id: number
		}
		messages: {
			id: number
			me: boolean
			content: string
			flagged: boolean
			sentAt: Date
		}[]
		createdAt: Date
	}[]
	initialKnownConversations: {
		id: number
		user: {
			id: number
			firstName: string
			lastName: string
		}
		messages: {
			id: number
			me: boolean
			content: string
			flagged: boolean
			sentAt: Date
		}[]
		createdAt: Date
	}[]
}

const userJoinedSchema = z.object({
	id: z.number(),
	firstName: z.string(),
	lastName: z.string(),
})

const conversationSchema = z.object({
	id: z.number(),
	anonymousUserId: z.number(),
	firstMessage: z.object({
		id: z.number(),
		content: z.string(),
		flagged: z.boolean(),
	}),
	createdAt: z.coerce.date(),
})

const messageSchema = z.object({
	id: z.number(),
	conversationId: z.number(),
	content: z.string(),
	flagged: z.boolean(),
	sentAt: z.coerce.date(),
})

export default function App({
	userId,
	initialUsers,
	initialAnonymousConversations,
	initialKnownConversations,
}: Props) {
	const [users, setUsers] = useState(initialUsers)

	const [anonymousConversations, setAnonymousConversations] = useState(
		initialAnonymousConversations
	)

	const [knownConversations, setKnownConversations] = useState(
		initialKnownConversations
	)

	const [draftingUserId, setDraftingUserId] = useState<number>()

	const [conversationId, setConversationId] = useState<number>()

	const conversation =
		conversationId !== undefined
			? {
					user: (
						knownConversations.find(
							(conversation) => conversation.id === conversationId
						) ??
						anonymousConversations.find(
							(conversation) => conversation.id === conversationId
						)
					)?.user,
					messages:
						knownConversations.find(
							(conversation) => conversation.id === conversationId
						)?.messages ??
						anonymousConversations.find(
							(conversation) => conversation.id === conversationId
						)?.messages ??
						[],
			  }
			: draftingUserId !== undefined
			? {
					user: users.find(({ id }) => id === draftingUserId) ?? {
						id: draftingUserId,
					},
					messages: [],
			  }
			: undefined

	const onCreateConversation = async (input: string) => {
		if (draftingUserId === undefined) return

		const user = users.find(({ id }) => id === draftingUserId)

		if (user === undefined) return

		const newConversation = await createConversationAction({
			userId: draftingUserId,
			content: input,
		})

		setDraftingUserId(undefined)

		setConversationId(newConversation.id)

		setKnownConversations((prevKnownConversations) => [
			{
				id: newConversation.id,
				user,
				messages: [
					{
						id: newConversation.firstMessage.id,
						me: true,
						content: newConversation.firstMessage.content,
						flagged: newConversation.firstMessage.flagged,
						sentAt: newConversation.createdAt,
					},
				],
				createdAt: newConversation.createdAt,
			},
			...prevKnownConversations,
		])
	}

	const [optimisticMessages, setOptimisticMessages] = useState(0)

	const onSendMessage = async (input: string) => {
		if (conversationId === undefined || conversation === undefined) return

		const optimisticId = optimisticMessages * -1 - 1

		const sentAt = new Date()

		setAnonymousConversations((prevAnonymousConversations) => {
			const conversationIndex = prevAnonymousConversations.findIndex(
				({ id }) => id === conversationId
			)

			if (conversationIndex === -1) return prevAnonymousConversations

			const conversation = prevAnonymousConversations[conversationIndex]

			if (conversation === undefined) return prevAnonymousConversations

			return [
				{
					...conversation,
					messages: conversation.messages.concat({
						id: optimisticId,
						me: true,
						content: input,
						flagged: false,
						sentAt,
					}),
				},
				...prevAnonymousConversations.slice(0, conversationIndex),
				...prevAnonymousConversations.slice(conversationIndex + 1),
			]
		})

		setKnownConversations((prevKnownConversations) => {
			const conversationIndex = prevKnownConversations.findIndex(
				({ id }) => id === conversationId
			)

			if (conversationIndex === -1) return prevKnownConversations

			const conversation = prevKnownConversations[conversationIndex]

			if (conversation === undefined) return prevKnownConversations

			return [
				{
					...conversation,
					messages: conversation.messages.concat({
						id: optimisticId,
						me: true,
						content: input,
						flagged: false,
						sentAt,
					}),
				},
				...prevKnownConversations.slice(0, conversationIndex),
				...prevKnownConversations.slice(conversationIndex + 1),
			]
		})

		setOptimisticMessages((prev) => prev + 1)

		const createdMessage = await sendMessageAction({
			conversationId,
			// @ts-expect-error - not worth figuring out
			userId: conversation.user.id,
			content: input,
		})

		setOptimisticMessages((prev) => prev - 1)

		setAnonymousConversations((prevAnonymousConversations) => {
			const conversationIndex = prevAnonymousConversations.findIndex(
				({ id }) => id === conversationId
			)

			if (conversationIndex === -1) return prevAnonymousConversations

			const conversation = prevAnonymousConversations[conversationIndex]

			if (conversation === undefined) return prevAnonymousConversations

			const optimisticMessageIndex = conversation.messages.findIndex(
				({ id }) => id === optimisticId
			)

			const optimisticMessage =
				conversation.messages[optimisticMessageIndex]

			if (optimisticMessage === undefined)
				return prevAnonymousConversations

			return [
				...prevAnonymousConversations.slice(0, conversationIndex),
				{
					...conversation,
					messages: [
						...conversation.messages.slice(
							0,
							optimisticMessageIndex
						),
						{ ...optimisticMessage, ...createdMessage },
						...conversation.messages.slice(
							optimisticMessageIndex + 1
						),
					],
				},
				...prevAnonymousConversations.slice(conversationIndex + 1),
			]
		})

		setKnownConversations((prevKnownConversations) => {
			const conversationIndex = prevKnownConversations.findIndex(
				({ id }) => id === conversationId
			)

			if (conversationIndex === -1) return prevKnownConversations

			const conversation = prevKnownConversations[conversationIndex]

			if (conversation === undefined) return prevKnownConversations

			const optimisticMessageIndex = conversation.messages.findIndex(
				({ id }) => id === optimisticId
			)

			const optimisticMessage =
				conversation.messages[optimisticMessageIndex]

			if (optimisticMessage === undefined) return prevKnownConversations

			return [
				...prevKnownConversations.slice(0, conversationIndex),
				{
					...conversation,
					messages: [
						...conversation.messages.slice(
							0,
							optimisticMessageIndex
						),
						{ ...optimisticMessage, ...createdMessage },
						...conversation.messages.slice(
							optimisticMessageIndex + 1
						),
					],
				},
				...prevKnownConversations.slice(conversationIndex + 1),
			]
		})
	}

	useRealtime({
		channel: "user",
		event: "joined",
		onMessage: useCallback((message) => {
			const user = userJoinedSchema.parse(message)

			setUsers((prevUsers) => [
				{ ...user, createdAt: new Date() },
				...prevUsers,
			])
		}, []),
	})

	useRealtime({
		channel: userId.toString(),
		event: "conversation",
		onMessage: useCallback((message) => {
			const conversation = conversationSchema.parse(message)

			setAnonymousConversations((prevAnonymousConversations) => [
				{
					id: conversation.id,
					user: { id: conversation.anonymousUserId },
					messages: [
						{
							id: conversation.firstMessage.id,
							me: false,
							content: conversation.firstMessage.content,
							flagged: conversation.firstMessage.flagged,
							sentAt: conversation.createdAt,
						},
					],
					createdAt: conversation.createdAt,
				},
				...prevAnonymousConversations,
			])
		}, []),
	})

	useRealtime({
		channel: userId.toString(),
		event: "message",
		onMessage: useCallback((rawMessage) => {
			const message = messageSchema.parse(rawMessage)

			setAnonymousConversations((prevAnonymousConversations) => {
				const conversationIndex = prevAnonymousConversations.findIndex(
					({ id }) => id === message.conversationId
				)

				if (conversationIndex === -1) return prevAnonymousConversations

				const conversation =
					prevAnonymousConversations[conversationIndex]

				if (conversation === undefined)
					return prevAnonymousConversations

				return [
					{
						...conversation,
						messages: conversation.messages.concat({
							id: message.id,
							me: false,
							content: message.content,
							flagged: message.flagged,
							sentAt: message.sentAt,
						}),
					},
					...prevAnonymousConversations.slice(0, conversationIndex),
					...prevAnonymousConversations.slice(conversationIndex + 1),
				]
			})

			setKnownConversations((prevKnownConversations) => {
				const conversationIndex = prevKnownConversations.findIndex(
					({ id }) => id === message.conversationId
				)

				if (conversationIndex === -1) return prevKnownConversations

				const conversation = prevKnownConversations[conversationIndex]

				if (conversation === undefined) return prevKnownConversations

				return [
					{
						...conversation,
						messages: conversation.messages.concat({
							id: message.id,
							me: false,
							content: message.content,
							flagged: message.flagged,
							sentAt: message.sentAt,
						}),
					},
					...prevKnownConversations.slice(0, conversationIndex),
					...prevKnownConversations.slice(conversationIndex + 1),
				]
			})
		}, []),
	})

	const [screen, setScreen] = useState<"anonymous" | "main" | "known">("main")

	return (
		<div className="flex h-screen flex-col bg-primary">
			<nav className="hidden px-6 pt-1 mobile:flex">
				<div className="flex-1 p-3 text-center">
					<div
						onClick={() => setScreen("anonymous")}
						role="button"
						className={cn(
							"text-lg font-bold text-white transition",
							screen === "anonymous" && "opacity-50"
						)}
					>
						anonymous
					</div>
				</div>

				<div className="flex-1 p-3 text-center">
					<div
						onClick={() => setScreen("main")}
						role="button"
						className={cn(
							"text-lg font-bold text-white transition",
							screen === "main" && "opacity-50"
						)}
					>
						{/*			 @ts-expect-error - not worth figuring out */}
						{conversation !== undefined
							? //@ts-expect-error - not worth figuring out
							  "firstName" in conversation.user
								? conversation.user.firstName
								: //	@ts-expect-error - not worth figuring out
								  `#${conversation.user.id}`
							: "users"}
					</div>
				</div>

				<div className="flex-1 p-3 text-center">
					<div
						onClick={() => setScreen("known")}
						role="button"
						className={cn(
							"text-lg font-bold text-white transition",
							screen === "known" && "opacity-50"
						)}
					>
						known
					</div>
				</div>
			</nav>

			<div className="relative flex w-screen flex-1 flex-col overflow-hidden">
				<main
					className={cn(
						"relative flex h-[calc(100vh-70px)] flex-1 space-x-3 p-6 transition-all mobile:w-[300vw] mobile:space-x-12 mobile:pt-0",
						{
							anonymous: "mobile:right-0",
							main: "mobile:right-[100vw]",
							known: "mobile:right-[200vw]",
						}[screen]
					)}
				>
					<div className="w-[25vw] space-y-3 overflow-y-auto rounded-lg border border-white p-3 mobile:w-[calc(100vw-48px)]">
						{anonymousConversations.length !== 0 ? (
							anonymousConversations.map((conversation) => (
								<div
									key={conversation.id}
									onClick={() => {
										setConversationId(conversation.id)

										setScreen("main")
									}}
									role="button"
									tabIndex={0}
									className={cn(
										"flex flex-col rounded-lg border border-white p-3 outline-none transition",
										conversation.id === conversationId
											? "bg-white/30"
											: "bg-white/20 hover:bg-white/30 focus-visible:bg-white/30"
									)}
								>
									<div className="text-lg font-bold leading-none text-secondary">
										#{conversation.id}
									</div>

									<div className="pt-3" />

									<p className="font-light text-white">
										{conversation.messages
											.at(-1)
											?.content.slice(0, 100)}
									</p>

									<div className="pt-3" />

									<div className="flex justify-end">
										<span className="text-lg font-bold leading-none text-secondary">
											{formatDuration(
												conversation.messages.at(-1)
													?.sentAt ?? new Date()
											)}
										</span>
									</div>
								</div>
							))
						) : (
							<p className="text-lg font-light text-white">
								No one has started a conversation with you yet,
								but this is where they&apos;ll appear.
							</p>
						)}
					</div>

					<div
						className="relative w-[calc(50vw-24px)] rounded-lg border border-white mobile:w-[calc(100vw-48px)]"
						aria-live="polite"
					>
						{conversation === undefined ? (
							<div className="h-full space-y-3 overflow-y-auto p-3">
								{users.map((user) => (
									<div
										key={user.id}
										onClick={() =>
											setDraftingUserId(user.id)
										}
										role="button"
										className="group relative flex flex-col rounded-lg border border-white bg-white/20 p-3"
									>
										<div className="text-lg font-bold leading-none text-secondary">
											{user.firstName} {user.lastName}
										</div>

										<div className="pt-3" />

										<div className="flex justify-end">
											<span className="text-lg font-bold leading-none text-secondary">
												Joined{" "}
												{formatDuration(user.createdAt)}
											</span>
										</div>

										<div className="pointer-events-none absolute inset-0 right-[1px] flex items-center justify-center rounded-lg bg-white/[0.15] text-2xl font-bold text-white opacity-0 backdrop-blur-md transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-visible:pointer-events-auto group-focus-visible:opacity-100">
											send an anonymous message
										</div>
									</div>
								))}
							</div>
						) : (
							<Conversation
								//	@ts-expect-error - not worth figuring out
								user={conversation.user}
								messages={conversation.messages}
								onSend={
									draftingUserId !== undefined
										? onCreateConversation
										: onSendMessage
								}
								onClose={
									draftingUserId !== undefined
										? () => setDraftingUserId(undefined)
										: () => setConversationId(undefined)
								}
							/>
						)}
					</div>

					<div className=" w-[25vw] space-y-3 overflow-y-auto rounded-lg border border-white p-3 mobile:w-[calc(100vw-48px)]">
						{knownConversations.length !== 0 ? (
							knownConversations.map((conversation) => (
								<div
									key={conversation.id}
									onClick={() => {
										setConversationId(conversation.id)

										setScreen("main")
									}}
									role="button"
									tabIndex={0}
									className={cn(
										"flex flex-col rounded-lg border border-white p-3 outline-none transition",
										conversation.id === conversationId
											? "bg-white/30"
											: "bg-white/20 hover:bg-white/30 focus-visible:bg-white/30"
									)}
								>
									<div className="text-lg font-bold leading-none text-secondary">
										{conversation.user.firstName}{" "}
										{conversation.user.lastName}
									</div>

									<div className="pt-3" />

									<p className="font-light text-white">
										{conversation.messages.at(-1)?.me && (
											<span className="text-white/50">
												Me:{" "}
											</span>
										)}

										{conversation.messages
											.at(-1)
											?.content.slice(0, 100)}
									</p>

									<div className="pt-3" />

									<div className="flex justify-end">
										<span className="text-lg font-bold leading-none text-secondary">
											{formatDuration(
												conversation.messages.at(-1)
													?.sentAt ?? new Date()
											)}
										</span>
									</div>
								</div>
							))
						) : (
							<p className="text-lg font-light text-white">
								You haven&apos;t started any conversations with
								anyone yet, but this is where they&apos;ll
								appear.
							</p>
						)}
					</div>
				</main>
			</div>
		</div>
	)
}
