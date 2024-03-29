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
import { posthog } from "posthog-js"

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
	const [fullNameInput, setFullNameInput] = useState("")

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

		if (input.length - phoneNumberInput.length > 1) {
			input = `1${input}`
		}

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

	const [screen, setScreen] = useState<"intro" | "name" | "number" | "otp">(
		"intro"
	)

	const [submitting, setSubmitting] = useState(false)

	const disabled =
		{
			intro: false,
			name: fullNameInput === "",
			number: phoneNumberInput.match(/\d/g)?.length !== 11,
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
			firstName: fullNameInput.split(/\s/g)[0] ?? "",
			lastName: fullNameInput.split(/\s/g)?.slice(1).join(" ") || " ",
			phoneNumber: Number(phoneNumberInput.match(/\d/g)?.join("")),
			otp: otpInput.trim(),
			smsNotificationConsent: smsNotificationConsentInput,
			invitedByUserId: invitedByUser?.id,
		})

		if (response?.status === "error") {
			alert(response.message)

			setSubmitting(false)
		} else if (response.status === "success") {
			posthog.identify(response.userId.toString(), {
				phoneNumber: response.phoneNumber,
				firstName: response.firstName,
				lastName: response.lastName,
			})

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

			<div className="flex w-full flex-col items-center">
				{invitedByUser !== undefined && screen === "intro" && (
					<>
						<h2 className="text-center text-4xl font-bold text-secondary mobile:text-2xl">
							{invitedByUser.firstName} {invitedByUser.lastName}{" "}
							is inviting you to mchsanonymous
						</h2>

						<div className="pt-16" />
					</>
				)}
				<div className="flex h-24 w-full flex-col items-center justify-end">
					{
						{
							intro: (
								<h2 className="w-1/2 text-center text-4xl font-bold leading-normal text-secondary mobile:w-full mobile:text-2xl">
									send and receive anonymous messages from
									people at maria carrillo high school
								</h2>
							),
							name: (
								<h2 className="w-1/2 text-center text-4xl font-bold leading-normal text-secondary mobile:w-full mobile:text-2xl">
									what&apos;s your full name?
								</h2>
							),
							number: (
								<h2 className="w-1/2 text-center text-4xl font-bold leading-normal text-secondary mobile:w-full mobile:text-2xl">
									we need your phone number to verify your
									identity. we won&apos;t sell it to{" "}
									<span className="underline">anyone</span>.
								</h2>
							),
							otp: (
								<h2 className="w-1/2 text-center text-4xl font-bold leading-normal text-secondary mobile:w-full mobile:text-2xl">
									we just sent you a code.
								</h2>
							),
						}[screen]
					}
				</div>
				<div className="pt-16 mobile:pt-12" />
				{screen === "intro" ? (
					<Button
						onClick={() => setScreen("name")}
						className="w-96 py-3 text-2xl mobile:max-w-[calc(100vw-40px)]"
					>
						continue
					</Button>
				) : (
					<form
						onSubmit={async (e) => {
							e.preventDefault()

							if (screen === "name") setScreen("number")

							if (screen === "number") {
								setScreen("otp")

								await onSendOTP()
							}

							if (screen === "otp") await onSubmit()
						}}
						className="flex w-96 flex-col items-center space-y-6 mobile:max-w-[calc(100vw-40px)]"
					>
						<div className="flex w-full space-x-2">
							<TextInput
								type={
									{
										name: "text" as const,
										number: "tel" as const,
										otp: "number" as const,
									}[screen]
								}
								value={
									{
										name: fullNameInput,
										number: phoneNumberInput,
										otp: otpInput,
									}[screen]
								}
								onChangeValue={(value) =>
									({
										name: setFullNameInput,
										number: onChangePhoneNumberInput,
										otp: setOTPInput,
									}[screen](value))
								}
								aria-required
								aria-label={
									{
										name: "full name",
										number: "phone number",
										otp: "code",
									}[screen]
								}
								placeholder={
									{
										name: "full name",
										number: "phone number",
										otp: "code",
									}[screen]
								}
								autoComplete={
									{
										name: "name" as const,
										number: "tel" as const,
										otp: "one-time-code" as const,
									}[screen]
								}
								className="flex-1"
							/>

							<Button type="submit" disabled={disabled}>
								{
									{
										name: "continue",
										number: "continue",
										otp: "join",
									}[screen]
								}
							</Button>
						</div>

						<div
							className={cn(
								"space-y-2",
								screen === "name" && "opacity-0"
							)}
						>
							<div className="flex items-center justify-between">
								<label
									htmlFor="opt-in-checkbox"
									className="select-none text-sm text-white"
								>
									uncheck this box to opt out of SMS
									notifications
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
										className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
									/>

									<span className="absolute left-0 top-0 h-4 w-4 rounded-[4px] border border-secondary bg-primary peer-focus-visible:ring" />

									<span className="absolute left-[8px] top-[7px] h-[4.5px] w-[9.5px] -translate-x-1/2 -translate-y-1/2 -rotate-45 transform border-2 border-r-0 border-t-0 border-secondary opacity-0 peer-checked:opacity-100" />
								</div>
							</div>

							<p className="text-[10px] text-white/70">
								notifications indicate the number of unread
								messages you have, if any, and are sent at most
								once per day. you can opt out later at any time
								by replying STOP. message frequency may vary,
								Msg&Data rates may apply.
							</p>
						</div>
					</form>
				)}
				<div className="pt-16 mobile:pt-12" />
				{screen === "intro" && (
					<div className="space-y-2 text-center">
						<h2 className="text-4xl font-bold text-secondary mobile:text-2xl">
							{userCount} students already here
						</h2>

						{lastJoinedUser ? (
							<div
								className="text-2xl font-bold text-secondary mobile:text-lg"
								aria-live="polite"
							>
								{lastJoinedUser.firstName}{" "}
								{lastJoinedUser.lastName} just joined
							</div>
						) : (
							<div className="h-8 mobile:h-7" />
						)}
					</div>
				)}{" "}
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
