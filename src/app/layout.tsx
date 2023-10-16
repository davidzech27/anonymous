import { Suspense } from "react"

import "./globals.css"
import { PostHogProvider, PostHogPageview } from "~/posthog/components"

export const metadata = {
	title: "mchsanonymous",
	description:
		"send and receive anonymous messages from people at your school",
	metadataBase: new URL("https://mchsanonymous.vercel.app"),
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en">
			<Suspense>
				<PostHogPageview />
			</Suspense>

			<PostHogProvider>
				<body className="absolute inset-0">{children}</body>
			</PostHogProvider>
		</html>
	)
}
