import { Suspense } from "react"
import Script from "next/script"

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
				<body>{children}</body>
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
