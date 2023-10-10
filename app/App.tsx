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
			sentAt: Date
		}[]
		createdAt: Date
	}[]
	initialKnownConversations: {
		id: number
		user: {
			firstName: string
			lastName: string
		}
		messages: {
			id: number
			me: boolean
			content: string
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
	}),
	createdAt: z.coerce.date(),
})

const messageSchema = z.object({
	id: z.number(),
	conversationId: z.number(),
	content: z.string(),
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
					user: knownConversations.find(
						(conversation) => conversation.id === conversationId
					)?.user ??
						anonymousConversations.find(
							(conversation) => conversation.id === conversationId
						)?.user ?? { id: 0 },
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
						id: newConversation.firstMessageId,
						me: true,
						content: input,
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
		if (conversationId === undefined) return

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
						{ ...optimisticMessage, id: createdMessage.id },
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
						{ ...optimisticMessage, id: createdMessage.id },
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
							sentAt: message.sentAt,
						}),
					},
					...prevKnownConversations.slice(0, conversationIndex),
					...prevKnownConversations.slice(conversationIndex + 1),
				]
			})
		}, []),
	})

	return (
		<main className="flex h-screen space-x-3 bg-primary p-6">
			<div className="w-[calc(25vw)] space-y-3 overflow-y-auto overflow-y-auto rounded-lg border border-white p-3">
				{anonymousConversations.map((conversation) => (
					<div
						key={conversation.id}
						onClick={() => setConversationId(conversation.id)}
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
							#{conversation.user.id}
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
									conversation.messages.at(-1)?.sentAt ??
										new Date()
								)}
							</span>
						</div>
					</div>
				))}
			</div>

			<div
				className="relative w-[calc(50vw-24px)] rounded-lg border border-white"
				aria-live="polite"
			>
				{conversation === undefined ? (
					<div className="space-y-3 overflow-y-auto p-3">
						{users.map((user) => (
							<div
								key={user.id}
								onClick={() => setDraftingUserId(user.id)}
								role="button"
								className="group relative flex flex-col rounded-lg border border-white bg-white/20 p-3"
							>
								<div className="text-lg font-bold leading-none text-secondary">
									{user.firstName} {user.lastName}
								</div>

								<div className="pt-3" />

								<div className="flex justify-end">
									<span className="text-lg font-bold leading-none text-secondary">
										Joined {formatDuration(user.createdAt)}
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

			<div className="w-[calc(25vw)] space-y-3 overflow-y-auto rounded-lg border border-white p-3">
				{knownConversations.map((conversation) => (
					<div
						key={conversation.id}
						onClick={() => setConversationId(conversation.id)}
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
								<span className="text-white/50">Me: </span>
							)}

							{conversation.messages
								.at(-1)
								?.content.slice(0, 100)}
						</p>

						<div className="pt-3" />

						<div className="flex justify-end">
							<span className="text-lg font-bold leading-none text-secondary">
								{formatDuration(
									conversation.messages.at(-1)?.sentAt ??
										new Date()
								)}
							</span>
						</div>
					</div>
				))}
			</div>
		</main>
	)
}
