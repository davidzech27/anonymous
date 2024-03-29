"use client"
import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { PostHogProvider as DefaultPostHogProvider } from "posthog-js/react"

import env from "~/env.mjs"

if (typeof window !== "undefined") {
	posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
		api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
		session_recording: {
			maskAllInputs: false,
			maskInputOptions: {
				password: true,
				color: false,
				date: false,
				"datetime-local": false,
				email: false,
				month: false,
				number: false,
				range: false,
				search: false,
				tel: false,
				text: false,
				time: false,
				url: false,
				week: false,
				textarea: false,
				select: false,
			},
		},
	})
}

export function PostHogPageview() {
	const pathname = usePathname()
	const searchParams = useSearchParams()

	useEffect(() => {
		if (pathname) {
			let url = window.origin + pathname
			if (searchParams.toString()) {
				url = url + `?${searchParams.toString()}`
			}
			posthog.capture("$pageview", {
				$current_url: url,
			})
		}
	}, [pathname, searchParams])

	return null
}

export function PostHogProvider({ children }: React.PropsWithChildren) {
	return (
		<DefaultPostHogProvider client={posthog}>
			{children}
		</DefaultPostHogProvider>
	)
}
