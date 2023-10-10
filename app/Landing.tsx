"use client"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"

import createUserAction from "./createUserAction"
import useRealtime from "~/realtime/useRealtime"

interface Props {
	initialUserCount: number
}

const userJoinedSchema = z.object({
	id: z.number(),
	firstName: z.string(),
	lastName: z.string(),
})

export default function Landing({ initialUserCount }: Props) {
	const [firstNameInput, setFirstNameInput] = useState("")

	const [lastNameInput, setLastNameInput] = useState("")

	const [screen, setScreen] = useState<"first" | "last">("first")

	const [submitted, setSubmitted] = useState(false)

	const disabled =
		{ first: firstNameInput === "", last: lastNameInput === "" }[screen] ||
		submitted

	const router = useRouter()

	const onSubmit = async () => {
		if (disabled) return

		setSubmitted(true)

		await createUserAction({
			firstName: firstNameInput,
			lastName: lastNameInput,
		})

		router.refresh()
	}

	const [userCount, setUserCount] = useState(initialUserCount)

	const [lastJoinedUser, setLastJoinedUser] =
		useState<z.infer<typeof userJoinedSchema>>()

	useRealtime({
		channel: "user",
		event: "joined",
		onMessage: useCallback((message) => {
			const user = userJoinedSchema.parse(message)

			setLastJoinedUser(user)

			setUserCount((prev) => prev + 1)
		}, []),
	})

	return (
		<main className="flex h-screen flex-col items-center justify-center bg-primary">
			<h1 className="text-4xl font-bold text-secondary">
				send and receive anonymous messages from people at your school
			</h1>

			<div className="pt-8" />

			<form
				onSubmit={(e) => {
					e.preventDefault()

					if (screen === "first") setScreen("last")

					if (screen === "last") onSubmit()
				}}
				className="flex space-x-2"
			>
				<input
					type="text"
					value={
						{ first: firstNameInput, last: lastNameInput }[screen]
					}
					onChange={(e) =>
						({ first: setFirstNameInput, last: setLastNameInput }[
							screen
						](e.target.value))
					}
					aria-required
					aria-label={
						{ first: "first name", last: "last name" }[screen]
					}
					placeholder={
						{ first: "first name", last: "last name" }[screen]
					}
					className="rounded-lg border border-white bg-white/20 px-3 py-2 text-lg font-medium text-white outline-0 transition placeholder:select-none placeholder:font-light placeholder:text-white/50 focus:bg-white/30 focus:placeholder:text-white/60"
				/>

				<button
					type="submit"
					disabled={disabled}
					className="select-none rounded-lg border border-white bg-white/20 px-4 text-lg font-bold text-white transition hover:bg-white/30 focus-visible:bg-white/30 disabled:pointer-events-none disabled:opacity-50"
				>
					{{ first: "continue", last: "join" }[screen]}
				</button>
			</form>

			<div className="pt-8" />

			<h2 className="text-4xl font-bold text-secondary">
				{userCount} already here
			</h2>

			<div className="pt-8" />

			{lastJoinedUser && (
				<div
					className="text-lg font-bold text-secondary"
					aria-live="polite"
				>
					{lastJoinedUser.firstName} {lastJoinedUser.lastName} just
					joined
				</div>
			)}
		</main>
	)
}
