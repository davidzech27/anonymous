"use server"

import { zact } from "zact/server"
import z from "zod"
import { cookies } from "next/headers"
import { unstable_noStore as noStore } from "next/cache"

import db from "~/db/db"
import { user } from "~/db/schema"
import { setAuth } from "~/auth/jwt"
import realtime from "~/realtime/realtime"
import triggerPotentialSpecialMessage from "./triggerPotentialSpecialMessage/triggerPotentialSpecialMessage"
import kv from "~/kv/kv"
import {
	OTP,
	resendCoolingDown,
	verificationAttempts,
	verificationCoolingDown,
} from "~/kv/schema"
import otpConstants from "./otpConstants"

const createUserAction = zact(
	z.object({
		firstName: z.string().min(1),
		lastName: z.string().min(1),
		phoneNumber: z.number(),
		otp: z.number(),
		invitedByUserId: z.number().optional(),
	})
)(async ({ firstName, lastName, phoneNumber, otp, invitedByUserId }) => {
	noStore()

	const createdAt = new Date()

	const storedOTP = await kv.get(OTP.key({ phoneNumber }))

	if (typeof storedOTP !== "number") {
		throw new Error("Verification code expired.")
	}

	const verificationCoolDown = Boolean(
		await kv.get(verificationCoolingDown.key({ phoneNumber }))
	)

	if (verificationCoolDown) {
		throw new Error("Slow down. Please wait before entering another code.")
	}

	if (
		(await kv.incr(verificationAttempts.key({ phoneNumber }))) >=
		otpConstants.OTP_VERIFICATIONS_BEFORE_COOLDOWNS
	) {
		await kv.setex(
			verificationCoolingDown.key({ phoneNumber }),
			otpConstants.OTP_VERIFICATION_COOLDOWN_SECONDS,
			1
		)
	}

	const expireAttemptsPromise = kv.expire(
		verificationAttempts.key({ phoneNumber }),
		otpConstants.OTP_VERIFICATION_ATTEMPTS_TTL_SECONDS
	)

	if (storedOTP !== otp) {
		throw new Error("Incorrect verification code.")
	}

	const deleteKeysPromise = kv.del(
		OTP.key({ phoneNumber }),
		resendCoolingDown.key({ phoneNumber }),
		verificationAttempts.key({ phoneNumber }),
		verificationCoolingDown.key({ phoneNumber })
	)

	const [createdUserRow] = await db
		.insert(user)
		.values({
			phoneNumber,
			firstName: firstName.trim().slice(0, 50),
			lastName: lastName.trim().slice(0, 50),
			createdAt,
		})
		.returning({ id: user.id })
		.all()

	if (createdUserRow === undefined) throw new Error("Failed to create user")

	const triggerPotentialSpecialMessagePromise =
		triggerPotentialSpecialMessage({
			reason: "userJoined",
			userId: createdUserRow.id,
			invitedByUserId,
		})

	await setAuth({
		cookies,
		auth: { id: createdUserRow.id, firstName, lastName },
	})

	await realtime.trigger("user", "joined", {
		id: createdUserRow.id,
		firstName,
		lastName,
	})

	await expireAttemptsPromise
	await deleteKeysPromise

	await triggerPotentialSpecialMessagePromise
})

export default createUserAction
