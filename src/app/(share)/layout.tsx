import { Suspense } from "react"
import Script from "next/script"
import { headers } from "next/headers"

import "~/app/globals.css"
import { PostHogProvider, PostHogPageview } from "~/posthog/components"
import env from "~/env.mjs"

export const metadata = {
	metadataBase: new URL(env.URL),
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const url = new URL(headers().get("x-url") ?? "")

	const pathname = url.pathname

	return (
		<html lang="en" className="bg-primary">
			<head>
				<meta
					property="snapchat:sticker"
					content={`${env.URL}${pathname}/opengraph-image.png`}
				/>

				<meta property="snapchat:app_id" content={env.SNAP_APP_ID} />
			</head>

			<Suspense>
				<PostHogPageview />
			</Suspense>

			<PostHogProvider>
				<body>
					<div className="hidden">
						<div
							className="snapchat-creative-kit-share"
							id="snapchat-creative-kit-share"
						/>
					</div>

					{children}
				</body>
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
