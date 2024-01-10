import { Suspense } from "react"
import Script from "next/script"

import "./globals.css"
import { PostHogProvider, PostHogPageview } from "~/posthog/components"
import Body from "./Body"
import env from "~/env.mjs"

export const metadata = {
	title: "mchsanonymous",
	description:
		"send and receive anonymous messages from people at your school",
	openGraph: {
		title: "mchsanonymous",
		description:
			"send and receive anonymous messages from people at your school",
	},
	metadataBase: new URL(env.URL),
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en" className="bg-primary">
			<head>
				<meta
					property="snapchat:sticker"
					content={`${env.URL}/opengraph-image.png`}
				/>

				<meta property="snapchat:app_id" content={env.SNAP_APP_ID} />
			</head>

			<Suspense>
				<PostHogPageview />
			</Suspense>

			<PostHogProvider>
				<Body>{children}</Body>
			</PostHogProvider>

			<Script id="snapkit-creative-kit-sdk-loader">
				{`(function (d, s, id) {
      var js,
        sjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s);
      js.id = id;
      js.src = "https://sdk.snapkit.com/js/v1/create.js";
      sjs.parentNode.insertBefore(js, sjs);
    })(document, "script", "snapkit-creative-kit-sdk");`}
			</Script>
		</html>
	)
}
