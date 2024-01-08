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

	const start = new Date().getSeconds()

	const resendCoolDown = Boolean(
		await kv.get(resendCoolingDown.key({ phoneNumber }))
	)

	const secondsElapsed = new Date().getSeconds() - start

	if (resendCoolDown) {
		throw new Error(
			"Slow down. Please wait before requesting another code."
		)
	}

	const OTPString = Math.floor(Math.random() * 1000000)
		.toString()
		.padStart(6, "0")

	await Promise.all([
		sms.send({
			to: phoneNumber,
			content: `Your verification code is ${OTPString}.`,
		}),
		kv.setex(
			OTP.key({ phoneNumber }),
			otpConstants.OTP_TTL_SECONDS,
			OTPString
		),
		kv.setex(
			resendCoolingDown.key({ phoneNumber }),
			otpConstants.RESEND_COOLDOWN_SECONDS -
				secondsElapsed -
				otpConstants.RESEND_COOLDOWN_NETWORK_GRACE_TIME,
			1
		),
	])
})

export default sendOTPAction
