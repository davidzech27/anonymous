import "./globals.css"

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
			<body className="absolute inset-0">{children}</body>
		</html>
	)
}
