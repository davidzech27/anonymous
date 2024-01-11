import "~/app/globals.css"
import env from "~/env.mjs"

export const metadata = {
	metadataBase: new URL(env.URL),
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en" className="bg-primary">
			<body>{children}</body>
		</html>
	)
}
