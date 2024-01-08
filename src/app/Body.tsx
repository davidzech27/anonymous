"use client"

import { useRef, useEffect } from "react"

export default function Body({ children }: React.PropsWithChildren) {
	const ref = useRef<HTMLBodyElement>(null)

	useEffect(() => {
		const element = ref.current

		if (element === null) return

		const updateHeight = () => {
			element.style.height = `${window.innerHeight}px`
		}

		updateHeight()

		window.addEventListener("resize", updateHeight)

		const forms = document.querySelectorAll("form")

		const waitUpdateHeight = () => setTimeout(updateHeight, 1000)

		forms.forEach((form) =>
			form.addEventListener("submit", waitUpdateHeight)
		)

		return () => {
			window.removeEventListener("resize", updateHeight)

			forms.forEach((form) =>
				form.removeEventListener("submit", waitUpdateHeight)
			)
		}
	}, [])

	return (
		<body ref={ref} className="h-screen overflow-hidden">
			{children}{" "}
		</body>
	)
}
