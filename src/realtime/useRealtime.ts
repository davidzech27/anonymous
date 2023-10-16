import { useEffect, useRef } from "react"

import env from "~/env.mjs"

export default function useRealtime({
	channel,
	event,
	onMessage,
}: {
	channel: string
	event: string
	onMessage: (message: unknown) => void
}) {
	const effectCalled = useRef(false)

	useEffect(() => {
		if (effectCalled.current) return

		effectCalled.current = true

		const channelPromise = import("pusher-js").then(({ default: Pusher }) =>
			new Pusher(env.NEXT_PUBLIC_SOKETI_APP_KEY, {
				wsHost: env.NEXT_PUBLIC_SOKETI_HOST,
				wsPort: env.NEXT_PUBLIC_SOKETI_PORT,
				wssPort: env.NEXT_PUBLIC_SOKETI_PORT,
				forceTLS: true,
				disableStats: true,
				enabledTransports: ["ws", "wss"],
			})
				.subscribe(channel)
				.bind(event, onMessage)
		)

		return () => {
			channelPromise.then((channel) => channel.unsubscribe())
		}
	}, [channel, event, onMessage])
}
