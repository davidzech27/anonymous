import { useRef, useState, useEffect } from "react"
import formatDuration from "~/util/formatDuration"

interface Props {
	user:
		| {
				firstName: string
				lastName: string
		  }
		| { id: number }
	messages: {
		id: number
		me: boolean
		content: string
		flagged: boolean
		sentAt: Date
	}[]
	onSend: (input: string) => void
	onClose: () => void
}

export default function Conversation({
	user,
	messages,
	onSend,
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
	}, [])

	useEffect(() => {
		if (
			scrollerRef.current !== null &&
			Math.abs(
				scrollerRef.current.scrollTop +
					scrollerRef.current.clientHeight -
					scrollerRef.current.scrollHeight
			) < 300
		) {
			scrollerRef.current.scrollTop =
				scrollerRef.current.scrollHeight -
				scrollerRef.current.clientHeight
		}
	}, [messages.length])

	return (
		<div className="flex h-full flex-col space-y-3 p-3">
			<div className="flex rounded-lg border border-white bg-white/20 p-3">
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
					{"firstName" in user && "lastName" in user
						? `${user.firstName} ${user.lastName}`
						: `#${user.id}`}
				</h1>
			</div>

			{messages !== undefined ? (
				<div
					ref={scrollerRef}
					className="flex-1 space-y-3 overflow-y-auto"
					aria-live="assertive"
				>
					{messages.map((message) => (
						<div
							key={message.id}
							className="flex flex-col space-y-3 rounded-lg border border-white bg-white/20 p-3"
						>
							<div className="text-lg font-bold leading-none text-secondary">
								{message.me
									? "Me"
									: "firstName" in user && "lastName" in user
									? `${user.firstName} ${user.lastName}`
									: `#${user.id}`}
							</div>

							{!message.flagged ? (
								<p className="break-words font-medium text-white">
									{message.content}
								</p>
							) : (
								<p className="break-words font-medium text-white">
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
