"use client"
import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"

import createUserAction from "./createUserAction"
import useRealtime from "~/realtime/useRealtime"

interface Props {
	initialUserCount: number
	initialLastJoinedUserPromise: Promise<
		| {
				id: number
				firstName: string
				lastName: string
		  }
		| undefined
	>
}

const userJoinedSchema = z.object({
	id: z.number(),
	firstName: z.string(),
	lastName: z.string(),
})

export default function Landing({
	initialUserCount,
	initialLastJoinedUserPromise,
}: Props) {
	const [firstNameInput, setFirstNameInput] = useState("")

	const [lastNameInput, setLastNameInput] = useState("")

	const [screen, setScreen] = useState<"first" | "last">("first")

	const [submitted, setSubmitted] = useState(false)

	const submittedRef = useRef(false)

	useEffect(() => {
		submittedRef.current = submitted
	}, [submitted])

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
			invitedByUserId,
		})

		location.reload()
	}

	const [userCount, setUserCount] = useState(initialUserCount)

	const [lastJoinedUser, setLastJoinedUser] =
		useState<Awaited<typeof initialLastJoinedUserPromise>>()

	useEffect(() => {
		setTimeout(
			() => initialLastJoinedUserPromise.then(setLastJoinedUser),
			1000
		)
	}, [initialLastJoinedUserPromise])

	useRealtime({
		channel: "user",
		event: "joined",
		onMessage: useCallback((message) => {
			if (submittedRef.current) return

			const user = userJoinedSchema.parse(message)

			setLastJoinedUser(user)

			setUserCount((prev) => prev + 1)
		}, []),
	})

	const [invitedByUserId, setInvitedByUserId] = useState<number>()

	const searchParams = useSearchParams()

	useEffect(() => {
		const invitedByUserIdString = searchParams.get("invitedBy")

		if (
			invitedByUserIdString !== null &&
			!isNaN(Number(invitedByUserIdString))
		) {
			setInvitedByUserId(Number(invitedByUserIdString))

			router.replace("/")
		}
	}, [searchParams, router])

	return (
		<main className="flex h-full flex-col items-center justify-center bg-primary p-6">
			<h1 className="absolute top-24 text-center text-5xl font-bold text-secondary">
				mchsanonymous
				<br />
				<div className="pt-4 text-xl">
					send and receive

					anonymous messages
				</div>
			</h1>

			<h2 className="text-center text-4xl font-bold text-secondary mobile:text-2xl">
				send and receive anonymous messages from people at your school
			</h2>

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

			<h2 className="text-4xl font-bold text-secondary mobile:text-2xl">
				{userCount} already here
			</h2>

			<div className="pt-8" />

			{lastJoinedUser ? (
				<div
					className="text-2xl font-bold text-secondary"
					aria-live="polite"
				>
					{lastJoinedUser.firstName} {lastJoinedUser.lastName} just
					joined
				</div>
			) : (
				<div className="h-8" />
			)}
		</main>
	)
}
