"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import z from "zod"

import createUserAction from "./createUserAction"
import useRealtime from "~/realtime/useRealtime"
import cn from "~/util/cn"
import sendOTPAction from "./sendOTPAction"
import Button from "~/components/Button"
import TextInput from "~/components/Input"

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
	invitedByUser:
		| {
				id: number
				firstName: string
				lastName: string
		  }
		| undefined
}

const userJoinedSchema = z.object({
	id: z.number(),
	firstName: z.string(),
	lastName: z.string(),
})

export default function Landing({
	initialUserCount,
	initialLastJoinedUserPromise,
	invitedByUser,
}: Props) {
	const [firstNameInput, setFirstNameInput] = useState("")

	const [lastNameInput, setLastNameInput] = useState("")

	const [smsNotificationConsentInput, setSmsNotificationConsentInput] =
		useState(true)

	const [phoneNumberInput, setPhoneNumberInput] = useState("+1 ")

	const onChangePhoneNumberInput = (input: string) => {
		let firstDiffIndex: number | undefined

		if (input.length < phoneNumberInput.length) {
			const inputChars = input.split("")

			firstDiffIndex = phoneNumberInput
				.split("")
				.reduce<number | undefined>(
					(prev, cur, index) =>
						cur === inputChars[index] ? prev : prev ?? index,
					undefined
				)
		}

		input = input.trim().match(/\d/g)?.join("") ?? ""

		if (firstDiffIndex === 2) {
			input = input.slice(1)
		}

		if (firstDiffIndex === 8) {
			input = input.slice(0, 3).concat(input.slice(4))
		}

		if (firstDiffIndex === 12) {
			input = input.slice(0, 6).concat(input.slice(7))
		}

		input = `+${input.slice(0, 1)}${input.length >= 1 ? " " : ""}${
			input.length >= 2 ? "(" : ""
		}${input.slice(1, 4)}${input.length >= 4 ? ") " : ""}${input.slice(
			4,
			7
		)}${input.length >= 7 ? "-" : ""}${input.slice(7, 11)}`

		setPhoneNumberInput(input)
	}

	const [otpInput, setOTPInput] = useState("")

	const [screen, setScreen] = useState<"first" | "last" | "number" | "otp">(
		"first"
	)

	const [submitting, setSubmitting] = useState(false)

	const disabled =
		{
			first: firstNameInput === "",
			last: lastNameInput === "",
			number: phoneNumberInput === "",
			otp: otpInput === "",
		}[screen] || submitting

	const onSendOTP = async () => {
		const response = await sendOTPAction({
			phoneNumber: Number(phoneNumberInput.match(/\d/g)?.join("")),
		})

		if (response?.status === "error") {
			alert(response.status)
		}
	}

	const onSubmit = async () => {
		if (disabled) return

		setSubmitting(true)

		const response = await createUserAction({
			firstName: firstNameInput,
			lastName: lastNameInput,
			phoneNumber: Number(phoneNumberInput.match(/\d/g)?.join("")),
			otp: otpInput.trim(),
			smsNotificationConsent: smsNotificationConsentInput,
			invitedByUserId: invitedByUser?.id,
		})

		if (response?.status === "error") {
			alert(response.status)
		} else {
			location.reload()
		}
	}

	const [userCount, setUserCount] = useState(initialUserCount)

	const [lastJoinedUser, setLastJoinedUser] =
		useState<Awaited<typeof initialLastJoinedUserPromise>>()

	useEffect(() => {
		setTimeout(
			() => void initialLastJoinedUserPromise.then(setLastJoinedUser),
			1000
		)
	}, [initialLastJoinedUserPromise])

	useRealtime({
		channel: "user",
		event: "joined",
		onMessage: useCallback((message) => {
			void new Promise<boolean>((res) =>
				setSubmitting((submitting) => {
					res(submitting)

					return submitting
				})
			).then((submitting) => {
				if (submitting) return

				const user = userJoinedSchema.parse(message)

				setLastJoinedUser(user)

				setUserCount((prev) => prev + 1)
			})
		}, []),
	})

	return (
		<main className="flex h-full flex-col items-center justify-between bg-primary p-6 mobile:p-5">
			<h1 className="text-2xl font-bold text-secondary">mchsanonymous</h1>

			<div className="flex flex-col items-center">
				{invitedByUser !== undefined && (
					<>
						<h2 className="text-center text-4xl font-bold text-secondary mobile:text-2xl">
							{invitedByUser.firstName} {invitedByUser.lastName}{" "}
							is inviting you to mchsanonymous
						</h2>

						<div className="pt-16" />
					</>
				)}

				<h2 className="text-center text-4xl font-bold text-secondary mobile:text-2xl">
					send and receive anonymous messages from people at mchs
				</h2>

				<div className="pt-16 mobile:pt-8" />

				<form
					onSubmit={async (e) => {
						e.preventDefault()

						if (screen === "first") setScreen("last")

						if (screen === "last") setScreen("number")

						if (screen === "number") {
							setScreen("otp")

							await onSendOTP()
						}

						if (screen === "otp") await onSubmit()
					}}
					className="flex w-min flex-col items-center space-y-6 mobile:w-auto"
				>
					<div className="flex w-full space-x-2">
						<TextInput
							type={screen === "number" ? "tel" : "text"}
							value={
								{
									first: firstNameInput,
									last: lastNameInput,
									number: phoneNumberInput,
									otp: otpInput,
								}[screen]
							}
							onChangeValue={(value) =>
								({
									first: setFirstNameInput,
									last: setLastNameInput,
									number: onChangePhoneNumberInput,
									otp: setOTPInput,
								}[screen](value))
							}
							aria-required
							aria-label={
								{
									first: "first name",
									last: "last name",
									number: "phone number",
									otp: "code",
								}[screen]
							}
							placeholder={
								{
									first: "first name",
									last: "last name",
									number: "phone number",
									otp: "we sent you a code",
								}[screen]
							}
							autoComplete="off"
							className="flex-1"
						/>

						<Button type="submit" disabled={disabled}>
							{
								{
									first: "continue",
									last: "continue",
									number: "continue",
									otp: "join",
								}[screen]
							}
						</Button>
					</div>

					<div
						className={cn(
							"space-y-2",
							(screen === "first" || screen === "last") &&
								"opacity-0"
						)}
					>
						<div className="flex items-center justify-between">
							<label
								htmlFor="opt-in-checkbox"
								className="select-none text-sm text-white"
							>
								uncheck this box to opt out of SMS notifications
							</label>

							<div className="relative inline-block h-4 w-4">
								<input
									type="checkbox"
									checked={smsNotificationConsentInput}
									onChange={(e) =>
										setSmsNotificationConsentInput(
											e.target.checked
										)
									}
									id="opt-in-checkbox"
									className="peer hidden h-4 w-4 cursor-pointer"
								/>

								<span className="absolute left-0 top-0 h-4 w-4 rounded-[4px] border border-secondary bg-primary" />

								<span className="absolute left-[8px] top-[7px] h-[4.5px] w-[9.5px] -translate-x-1/2 -translate-y-1/2 -rotate-45 transform border-2 border-r-0 border-t-0 border-secondary opacity-0 transition-opacity peer-checked:opacity-100" />
							</div>
						</div>

						<p className="text-[10px] text-white/70">
							notifications indicate the number of unread messages
							you have, if any, and are sent at most once per day.
							you can opt out later at any time by replying STOP.
							message frequency may vary, Msg&Data rates may
							apply.
						</p>
					</div>
				</form>

				<div className="pt-16 mobile:pt-8" />

				<div className="space-y-2 text-center">
					<h2 className="text-4xl font-bold text-secondary mobile:text-2xl">
						{userCount} students already here
					</h2>

					{lastJoinedUser ? (
						<div
							className="text-2xl font-bold text-secondary mobile:text-lg"
							aria-live="polite"
						>
							{lastJoinedUser.firstName} {lastJoinedUser.lastName}{" "}
							just joined
						</div>
					) : (
						<div className="h-8 mobile:h-7" />
					)}
				</div>
			</div>

			<div className="flex w-full justify-between px-[20%] mobile:px-0">
				<Link
					href="https://understand.school/privacypolicy"
					className="text-sm font-bold text-secondary"
				>
					privacy policy
				</Link>

				<Link
					href="https://understand.school"
					className="text-sm font-bold text-secondary"
				>
					more information
				</Link>
			</div>
		</main>
	)
}
