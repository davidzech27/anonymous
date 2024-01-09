"use client"
import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { z } from "zod"
import { posthog } from "posthog-js"
import Fuse from "fuse.js"

import createConversationAction from "./createConversationAction"
import sendMessageAction from "./sendMessageAction"
import readConversationAction from "./readConversationAction"
import blockUserAction from "./blockUserAction"
import unblockUserAction from "./unblockUserAction"
import useRealtime from "~/realtime/useRealtime"
import formatDuration from "~/util/formatDuration"
import Conversation from "./Conversation"
import cn from "~/util/cn"
import Input from "~/components/Input"

interface Props {
	userId: number
	initialUsers: {
		id: number
		firstName: string
		lastName: string
		blocked: boolean
		createdAt: Date
	}[]
	initialAnonymousConversations: {
		id: number
		user: {
			id: number
			blocked: boolean
		}
		unread: number
		special: boolean
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
			blocked: boolean
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
}

const userJoinedSchema = z.object({
	id: z.number(),
	firstName: z.string(),
	lastName: z.string(),
})

const conversationSchema = z.object({
	id: z.number(),
	anonymousUserId: z.number(),
	special: z.boolean(),
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

	const conversationIdRef = useRef<number>()

	const conversation = useMemo(
		() =>
			conversationId !== undefined
				? {
						user: knownConversations.find(
							(conversation) => conversation.id === conversationId
						)?.user ?? {
							...(anonymousConversations.find(
								(conversation) =>
									conversation.id === conversationId
							)?.user ?? { id: 0, blocked: false }),
							firstName: undefined,
							lastName: undefined,
						},
						special:
							anonymousConversations.find(
								(conversation) =>
									conversation.id === conversationId
							)?.special ?? false,
						unread:
							(
								knownConversations.find(
									(conversation) =>
										conversation.id === conversationId
								) ??
								anonymousConversations.find(
									(conversation) =>
										conversation.id === conversationId
								)
							)?.unread ?? 0,
						messages:
							knownConversations.find(
								(conversation) =>
									conversation.id === conversationId
							)?.messages ??
							anonymousConversations.find(
								(conversation) =>
									conversation.id === conversationId
							)?.messages ??
							[],
				  }
				: draftingUserId !== undefined
				? {
						user: users.find(({ id }) => id === draftingUserId) ?? {
							id: 0,
							firstName: undefined,
							lastName: undefined,
							blocked: false,
						},
						special: false,
						unread: 0,
						messages: [],
				  }
				: undefined,
		[
			conversationId,
			anonymousConversations,
			knownConversations,
			draftingUserId,
			users,
		]
	)

	const anonymousUnread = anonymousConversations.reduce(
		(prev, cur) => prev + cur.unread,
		0
	)

	const knownUnread = knownConversations.reduce(
		(prev, cur) => prev + cur.unread,
		0
	)

	const conversationUnread =
		[...anonymousConversations, ...anonymousConversations].find(
			(conversation) => conversation.id === conversationId
		)?.unread ?? 0

	useEffect(() => {
		conversationIdRef.current = conversationId

		if (
			conversationId !== undefined &&
			conversation !== undefined &&
			conversation.unread !== 0
		) {
			setAnonymousConversations((prevAnonymousConversations) => {
				const conversationIndex = prevAnonymousConversations.findIndex(
					({ id }) => id === conversationId
				)

				if (conversationIndex === -1) return prevAnonymousConversations

				const conversation =
					prevAnonymousConversations[conversationIndex]

				if (conversation === undefined)
					return prevAnonymousConversations

				return [
					...prevAnonymousConversations.slice(0, conversationIndex),
					{
						...conversation,
						unread: 0,
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

				return [
					...prevKnownConversations.slice(0, conversationIndex),
					{
						...conversation,
						unread: 0,
					},
					...prevKnownConversations.slice(conversationIndex + 1),
				]
			})

			void readConversationAction({ conversationId })
		}
	}, [conversationId, conversation])

	const onCreateConversation = async (input: string) => {
		if (draftingUserId === undefined) return

		const user = users.find(({ id }) => id === draftingUserId)

		if (user === undefined) return

		const createdConversation = await createConversationAction({
			userId: draftingUserId,
			content: input,
		})

		posthog.capture("Create conversation", {
			userId: draftingUserId,
			...createdConversation,
		})

		setDraftingUserId(undefined)

		setConversationId(createdConversation.id)

		setKnownConversations((prevKnownConversations) => [
			{
				id: createdConversation.id,
				user,
				unread: 0,
				messages: [
					{
						id: createdConversation.firstMessage.id,
						me: true,
						content: createdConversation.firstMessage.content,
						flagged: createdConversation.firstMessage.flagged,
						sentAt: createdConversation.createdAt,
					},
				],
				createdAt: createdConversation.createdAt,
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
			content: input,
		})

		posthog.capture("Send message", {
			conversationId,
			...createdMessage,
			special:
				conversationId ===
				anonymousConversations.reduce(
					(prev, cur) => (cur.id < prev ? cur.id : prev),
					Infinity
				),
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

	const onBlock = async () => {
		const userId = conversation?.user.id

		if (userId === undefined) return

		setUsers((users) => {
			const userIndex = users.findIndex((user) => user.id === userId)

			const user = users[userIndex]

			if (user === undefined) return users

			return [
				...users.slice(0, userIndex),
				{ ...user, blocked: true },
				...users.slice(userIndex + 1),
			]
		})

		setAnonymousConversations((conversations) => {
			const conversationIndex = conversations.findIndex(
				(conversation) => conversation.user.id === userId
			)

			const conversation = conversations[conversationIndex]

			if (conversation === undefined) return conversations

			return [
				...conversations.slice(0, conversationIndex),
				{
					...conversation,
					user: { ...conversation.user, blocked: true },
				},
				...conversations.slice(conversationIndex + 1),
			]
		})

		setKnownConversations((conversations) => {
			const conversationIndex = conversations.findIndex(
				(conversation) => conversation.user.id === userId
			)

			const conversation = conversations[conversationIndex]

			if (conversation === undefined) return conversations

			return [
				...conversations.slice(0, conversationIndex),
				{
					...conversation,
					user: { ...conversation.user, blocked: true },
				},
				...conversations.slice(conversationIndex + 1),
			]
		})

		await blockUserAction({ userId })
	}

	const onUnblock = async () => {
		const userId = conversation?.user.id

		if (userId === undefined) return

		setUsers((users) => {
			const userIndex = users.findIndex((user) => user.id === userId)

			const user = users[userIndex]

			if (user === undefined) return users

			return [
				...users.slice(0, userIndex),
				{ ...user, blocked: false },
				...users.slice(userIndex + 1),
			]
		})

		setAnonymousConversations((conversations) => {
			const conversationIndex = conversations.findIndex(
				(conversation) => conversation.user.id === userId
			)

			const conversation = conversations[conversationIndex]

			if (conversation === undefined) return conversations

			return [
				...conversations.slice(0, conversationIndex),
				{
					...conversation,
					user: { ...conversation.user, blocked: false },
				},
				...conversations.slice(conversationIndex + 1),
			]
		})

		setKnownConversations((conversations) => {
			const conversationIndex = conversations.findIndex(
				(conversation) => conversation.user.id === userId
			)

			const conversation = conversations[conversationIndex]

			if (conversation === undefined) return conversations

			return [
				...conversations.slice(0, conversationIndex),
				{
					...conversation,
					user: { ...conversation.user, blocked: false },
				},
				...conversations.slice(conversationIndex + 1),
			]
		})

		await unblockUserAction({ userId })
	}

	useRealtime({
		channel: "user",
		event: "joined",
		onMessage: useCallback((message) => {
			const user = userJoinedSchema.parse(message)

			setUsers((prevUsers) => [
				{ ...user, blocked: false, createdAt: new Date() },
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
					user: { id: conversation.anonymousUserId, blocked: false },
					special: conversation.special,
					unread: 1,
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
						unread:
							conversationIdRef.current === conversation.id &&
							screenRef.current === "main"
								? 0
								: conversation.unread + 1,
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
						unread:
							conversationIdRef.current === conversation.id &&
							screenRef.current === "main"
								? 0
								: conversation.unread + 1,
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

			setConversationId((conversationId) => {
				if (message.conversationId === conversationId) {
					void readConversationAction({ conversationId })
				}

				return conversationId
			})
		}, []),
	})

	const [searchUsersInput, setSearchUsersInput] = useState("")

	const usersFuse = useMemo(
		() =>
			new Fuse(users, {
				keys: [
					{ name: "firstName", weight: 1 },
					{ name: "lastName", weight: 0.5 },
				],
			}),
		[users]
	)

	const displayedUsers =
		searchUsersInput.trim() === ""
			? users
			: usersFuse.search(searchUsersInput).map((result) => result.item)

	const [screen, setScreen] = useState<"anonymous" | "main" | "known">("main")

	const [previousScreen, setPreviousScreen] = useState(screen)

	const screenRef = useRef(screen)

	useEffect(() => {
		setPreviousScreen(screenRef.current)

		screenRef.current = screen
	}, [screen])

	const [, rerender] = useState({})

	useEffect(() => {
		const intervalId = setInterval(() => rerender({}), 1000)

		return () => {
			clearInterval(intervalId)
		}
	}, [])

	return (
		<div className="flex h-full flex-col bg-primary">
			<div className="relative flex w-screen flex-1 flex-col overflow-hidden">
				<main
					className={cn(
						"relative flex h-[calc(100%-90px)] flex-1 space-x-3 p-6 transition-all mobile:w-[300vw] mobile:space-x-12 mobile:pb-0",
						{
							anonymous: "mobile:right-0",
							main: "mobile:right-[100vw]",
							known: "mobile:right-[200vw]",
						}[screen]
					)}
				>
					<div
						aria-live="polite"
						className="w-[25vw] space-y-3 overflow-y-auto rounded-lg border border-white p-3 mobile:w-[calc(100vw-48px)]"
					>
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
									style={{
										boxShadow:
											conversation.unread !== 0
												? "0 0 16px rgba(255, 255, 255, 0.5)"
												: "0 0 16px rgba(255, 255, 255, 0)",
									}}
									className={cn(
										"flex flex-col rounded-lg border border-white p-3 outline-none transition",
										conversation.id === conversationId
											? "bg-white/30"
											: "bg-white/20 hover:bg-white/30 focus-visible:bg-white/30"
									)}
								>
									<div className="flex justify-between">
										<div className="text-lg font-bold leading-none text-secondary">
											#{conversation.id}
										</div>

										{conversation.unread !== 0 && (
											<div className="text-lg font-bold leading-none text-secondary">
												{conversation.unread} unread
											</div>
										)}
									</div>

									<div className="pt-3" />

									<p className="text-white">
										{conversation.messages
											.at(-1)
											?.content.slice(0, 100) +
											((conversation.messages.at(-1)
												?.content.length ?? 0) >= 100
												? "..."
												: "")}
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
							<p className="text-lg text-white">
								No one has started a conversation with you yet,
								but this is where they&apos;ll appear.
							</p>
						)}
					</div>

					<div className="space-y-3">
						{conversation === undefined && (
							<Input
								value={searchUsersInput}
								onChangeValue={setSearchUsersInput}
								placeholder="search mchs students on mchsanonymous"
								className="w-full text-base"
							/>
						)}

						<div
							className={cn(
								"relative w-[calc(50vw-24px)] rounded-lg border border-white mobile:w-[calc(100vw-48px)]",
								conversation === undefined
									? "h-[calc(100%-58px)]"
									: "h-full"
							)}
							aria-live="polite"
						>
							{conversation === undefined ? (
								<div className="h-full space-y-3 overflow-y-auto p-3">
									{displayedUsers.length === 0 ? (
										<span className="text-lg font-medium text-white">
											you need to get {searchUsersInput}{" "}
											on mchsanonymous!!
										</span>
									) : (
										displayedUsers.map((user) => (
											<div
												key={user.id}
												onClick={() =>
													setDraftingUserId(user.id)
												}
												role="button"
												className="group relative flex flex-col rounded-lg border border-white bg-white/20 p-3"
											>
												<div className="text-lg font-bold leading-none text-secondary">
													{user.firstName}{" "}
													{user.lastName}
												</div>

												<div className="pt-3" />

												<div className="flex justify-end">
													<span className="text-lg font-bold leading-none text-secondary">
														Joined{" "}
														{formatDuration(
															user.createdAt
														)}
													</span>
												</div>

												<div className="pointer-events-none absolute inset-0 right-[1px] flex items-center justify-center rounded-lg bg-white/[0.15] text-center text-2xl font-bold text-white opacity-0 backdrop-blur-md transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-visible:pointer-events-auto group-focus-visible:opacity-100 mobile:text-lg">
													send an anonymous message
												</div>
											</div>
										))
									)}
								</div>
							) : (
								<Conversation
									id={conversationId}
									special={conversation.special}
									user={conversation.user}
									messages={conversation.messages}
									onSend={
										draftingUserId !== undefined
											? onCreateConversation
											: onSendMessage
									}
									onBlock={onBlock}
									onUnblock={onUnblock}
									onClose={
										draftingUserId !== undefined
											? () => setDraftingUserId(undefined)
											: () => {
													setConversationId(undefined)

													setScreen(previousScreen)
											  }
									}
								/>
							)}
						</div>
					</div>

					<div
						aria-live="polite"
						className="w-[25vw] space-y-3 overflow-y-auto rounded-lg border border-white p-3 mobile:w-[calc(100vw-48px)]"
					>
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
									style={{
										boxShadow:
											conversation.unread !== 0
												? "0 0 20px rgba(255, 255, 255, 0.5)"
												: "0 0 20px rgba(255, 255, 255, 0)",
									}}
									className={cn(
										"flex flex-col rounded-lg border border-white p-3 outline-none transition",
										conversation.id === conversationId
											? "bg-white/30"
											: "bg-white/20 hover:bg-white/30 focus-visible:bg-white/30"
									)}
								>
									<div className="flex justify-between">
										<div className="text-lg font-bold leading-none text-secondary">
											{conversation.user.firstName}{" "}
											{conversation.user.lastName}
										</div>

										{conversation.unread !== 0 && (
											<div className="text-lg font-bold leading-none text-secondary">
												{conversation.unread} unread
											</div>
										)}
									</div>

									<div className="pt-3" />

									<p className="text-white">
										{conversation.messages.at(-1)?.me && (
											<span className="text-white/50">
												Me:{" "}
											</span>
										)}

										{conversation.messages
											.at(-1)
											?.content.slice(0, 100) +
											((conversation.messages.at(-1)
												?.content.length ?? 0) >= 100
												? "..."
												: "")}
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
							<p className="text-lg text-white">
								You haven&apos;t started any conversations with
								anyone yet, but this is where they&apos;ll
								appear.
							</p>
						)}
					</div>
				</main>
			</div>

			<nav className="hidden p-6 mobile:flex">
				<div className="relative w-1/3 text-center">
					<div
						onClick={() => setScreen("anonymous")}
						role="button"
						className={cn(
							"absolute inset-0 -right-[18px] flex items-center justify-center text-lg font-bold text-white transition",
							screen === "anonymous" && "opacity-50"
						)}
					>
						anonymous
						{anonymousUnread !== 0 && (
							<div className="ml-1 h-[18px] w-[18px] rounded-full bg-secondary pt-0.5 text-sm leading-none text-primary">
								{anonymousUnread}
							</div>
						)}
					</div>
				</div>

				<div className="relative w-1/3 text-center">
					<div
						onClick={() => setScreen("main")}
						role="button"
						className={cn(
							"absolute inset-0 -right-[18px] flex items-center justify-center text-lg font-bold text-white transition",
							screen === "main" && "opacity-50"
						)}
					>
						{conversation !== undefined
							? conversation.user.firstName ??
							  `#${conversationId}`
							: "users"}

						{conversationUnread !== 0 && (
							<div className="ml-1 h-[18px] w-[18px] rounded-full bg-secondary pt-0.5 text-sm leading-none text-primary">
								{conversationUnread}
							</div>
						)}
					</div>
				</div>

				<div className="relative w-1/3 text-center">
					<div
						onClick={() => setScreen("known")}
						role="button"
						className={cn(
							"absolute inset-0 -right-[18px] flex items-center justify-center text-lg font-bold text-white transition",
							screen === "known" && "opacity-50"
						)}
					>
						known
						{knownUnread !== 0 && (
							<div className="ml-1 h-[18px] w-[18px] rounded-full bg-secondary pt-0.5 text-sm leading-none text-primary">
								{knownUnread}
							</div>
						)}
					</div>
				</div>
			</nav>
		</div>
	)
}
