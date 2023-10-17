import { useRef, useState, useEffect, Fragment } from "react"
import formatDuration from "~/util/formatDuration"

interface Props {
	id: number | undefined
	user:
		| {
				id: number
				firstName: string
				lastName: string
				blocked: boolean
		  }
		| {
				id: number
				firstName: undefined
				lastName: undefined
				blocked: boolean
		  }
	special: boolean
	messages: {
		id: number
		me: boolean
		content: string
		flagged: boolean
		sentAt: Date
	}[]
	onSend: (input: string) => void
	onBlock: () => void
	onUnblock: () => void
	onClose: () => void
}

export default function Conversation({
	id,
	user,
	special,
	messages,
	onSend,
	onBlock,
	onUnblock,
	onClose,
}: Props) {
	const [input, setInput] = useState("")

	const disabled = input === ""

	const scrollerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (scrollerRef.current !== null) {
			scrollerRef.current.scrollTop =
				scrollerRef.current.scrollHeight -
				scrollerRef.current.clientHeight
		}
	}, [user.id, user.firstName, user.lastName])

	useEffect(() => {
		if (scrollerRef.current !== null) {
			scrollerRef.current.scrollTop =
				scrollerRef.current.scrollHeight -
				scrollerRef.current.clientHeight
		}
	}, [messages.length])

	const [linkCopied, setLinkCopied] = useState(false)

	const snapchatCreativeKitShareRef = useRef<{ element: HTMLElement | null }>(
		{ element: null }
	)

	useEffect(() => {
		const snapchatCreativeKitShare = document.getElementById(
			"snapchat-creative-kit-share"
		)

		if (snapchatCreativeKitShare !== null)
			snapchatCreativeKitShareRef.current.element =
				snapchatCreativeKitShare
	}, [])

	const snapchatCreativeKitShareParentRef = useRef<HTMLDivElement>(null)

	const [snapchatCreativeKitShareParent] = useState(() => (
		<div ref={snapchatCreativeKitShareParentRef} className="h-7" />
	))

	useEffect(() => {
		if (
			snapchatCreativeKitShareParentRef.current &&
			snapchatCreativeKitShareRef.current.element !== null
		) {
			snapchatCreativeKitShareParentRef.current.appendChild(
				snapchatCreativeKitShareRef.current.element
			)
		}
	}, [messages])

	const lastInviteIndex =
		messages.length -
		1 -
		[...messages]
			.reverse()
			.findIndex((message) => message.content.includes("invitedBy"))

	return (
		<div className="flex h-full flex-col space-y-3 p-3">
			<div className="flex items-center justify-between rounded-lg border border-white bg-white/20 p-3 mobile:flex-col mobile:items-end mobile:space-y-3">
				<div className="flex w-full mobile:justify-between">
					<svg
						onClick={onClose}
						fill="none"
						height="24"
						shapeRendering="geometricPrecision"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2.5"
						viewBox="0 0 24 24"
						width="24"
						aria-label="back to user list"
						className="relative top-[1px] h-6 w-6 cursor-pointer text-white outline-none hover:opacity-75 focus-visible:opacity-75"
						tabIndex={0}
					>
						<path d="M18 6L6 18" />
						<path d="M6 6l12 12" />
					</svg>

					<div className="pr-3" />

					<h1 className="text-2xl font-bold leading-none text-white">
						{user.firstName !== undefined &&
						user.lastName !== undefined
							? `${user.firstName} ${user.lastName}`
							: `#${id}`}
					</h1>
				</div>

				{!special &&
					(!user.blocked ? (
						<div
							onClick={onBlock}
							role="button"
							className="select-none whitespace-pre text-sm font-bold leading-none text-white transition hover:opacity-75 focus-visible:opacity-75 mobile:whitespace-pre-wrap mobile:text-base"
						>
							block user
						</div>
					) : (
						<div
							onClick={onUnblock}
							role="button"
							className="select-none whitespace-pre text-sm font-bold leading-none text-white transition hover:opacity-75 focus-visible:opacity-75 mobile:whitespace-pre-wrap mobile:text-base"
						>
							unblock user
						</div>
					))}
			</div>

			{messages !== undefined ? (
				<div
					ref={scrollerRef}
					className="flex-1 space-y-3 overflow-y-auto"
					aria-live="assertive"
				>
					{messages.map((message, index) => (
						<Fragment key={message.id}>
							<div className="flex flex-col space-y-3 rounded-lg border border-white bg-white/20 p-3">
								<div className="text-lg font-bold leading-none text-secondary">
									{message.me
										? "Me"
										: user.firstName !== undefined &&
										  user.lastName !== undefined
										? `${user.firstName} ${user.lastName}`
										: `#${id}`}
								</div>

								{!message.flagged ? (
									<p className="break-words font-medium text-white">
										{message.content}
									</p>
								) : (
									<p className="break-words font-medium text-white">
										this message did not comply with our
										content policy. remember to be nice!
									</p>
								)}

								<div className="flex justify-end">
									<span className="text-lg font-bold leading-none text-secondary">
										{formatDuration(message.sentAt)}
									</span>
								</div>
							</div>

							{special && index === lastInviteIndex && (
								<div className="flex items-center justify-between rounded-lg border border-white bg-white/20 p-3">
									<div
										onClick={() => {
											setLinkCopied(true)

											navigator.clipboard.writeText(
												message.content.match(
													/(https:\/\/[^\s]+)/g
												)?.[0] ?? ""
											)
										}}
										role="button"
										className="focus-visible:opacity-white text-sm font-bold text-white hover:opacity-75"
									>
										{!linkCopied
											? "copy link"
											: "link copied"}
									</div>

									{snapchatCreativeKitShareParent}

									<a
										href={`mailto:?subject=mchsanonymous&body=${encodeURIComponent(
											`I'm inviting you to mchsanonymous. Join here: ${
												message.content.match(
													/(https:\/\/[^\s]+)/g
												)?.[0]
											}`
										)}`}
										className="focus-visible:opacity-white text-sm font-bold text-white hover:opacity-75"
									>
										send email
									</a>
								</div>
							)}
						</Fragment>
					))}
				</div>
			) : (
				<div className="flex-1" />
			)}

			<form
				onSubmit={(e) => {
					e.preventDefault()

					if (disabled) return

					setInput("")

					onSend(input)
				}}
				className="flex w-full space-x-3"
			>
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					aria-required
					aria-label="send a message"
					placeholder="be nice"
					className="w-full rounded-lg border border-white bg-white/20 px-3 py-2 text-lg font-medium text-white outline-0 transition placeholder:select-none placeholder:font-light placeholder:text-white/50 focus:bg-white/30 focus:placeholder:text-white/60"
				/>

				<button
					type="submit"
					disabled={disabled}
					className="select-none rounded-lg border border-white bg-white/20 px-4 text-lg font-bold text-white transition hover:bg-white/30 focus-visible:bg-white/30 disabled:pointer-events-none disabled:opacity-50"
				>
					send
				</button>
			</form>
		</div>
	)
}
