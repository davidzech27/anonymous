"use server"

import { zact } from "zact/server"
import z from "zod"
import { unstable_noStore as noStore } from "next/cache"

import kv from "~/kv/kv"
import { resendCoolingDown, OTP } from "~/kv/schema"
import sms from "~/sms/sms"
import otpConstants from "./otpConstants"

const sendOTPAction = zact(
	z.object({
		phoneNumber: z.number(),
	})
)(async ({ phoneNumber }) => {
	noStore()

	const start = new Date()

	const resendCoolDown = Boolean(
		resendCoolingDown.validator.parse(
			await kv.get(resendCoolingDown.key({ phoneNumber }))
		)
	)

	if (resendCoolDown) {
		return {
			status: "error" as const,
			message: "Slow down. Please wait before requesting another code.",
		}
	}

	const otp = `${Math.floor(Math.random() * 1000000)
		.toString()
		.padStart(6, "0")}`

	await Promise.all([
		sms.send({
			to: phoneNumber,
			content: `Your mchsanonymous verification code is ${otp}.`,
		}),
		kv.setex(
			OTP.key({ phoneNumber }),
			otpConstants.OTP_TTL_SECONDS,
			`"${otp}"`
		),
		kv.setex(
			resendCoolingDown.key({ phoneNumber }),
			Math.round(
				otpConstants.RESEND_COOLDOWN_SECONDS -
					(new Date().getTime() - start.getTime()) / 1000
			),
			1
		),
	])
})

export default sendOTPAction
