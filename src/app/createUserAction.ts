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
import { OTP, verificationAttempts, verificationCoolingDown } from "~/kv/schema"
import otpConstants from "./otpConstants"
import sms from "~/sms/sms"

const createUserAction = zact(
	z.object({
		firstName: z.string().min(1),
		lastName: z.string().min(1),
		phoneNumber: z.number(),
		otp: z.string(),
		invitedByUserId: z.number().optional(),
	})
)(async ({ firstName, lastName, phoneNumber, otp, invitedByUserId }) => {
	noStore()

	const createdAt = new Date()

	const storedOTP = OTP.validator.parse(
		await kv.get(OTP.key({ phoneNumber }))
	)

	if (storedOTP === null) {
		return {
			status: "error" as const,
			message: "Verification code expired.",
		}
	}

	const verificationCoolDown = Boolean(
		verificationCoolingDown.validator.parse(
			await kv.get(verificationCoolingDown.key({ phoneNumber }))
		)
	)

	if (verificationCoolDown) {
		return {
			status: "error" as const,
			message: "Slow down. Please wait before entering another code.",
		}
	}

	if (
		(verificationAttempts.validator.parse(
			await kv.incr(verificationAttempts.key({ phoneNumber }))
		) ?? 0) >= otpConstants.OTP_VERIFICATIONS_BEFORE_COOLDOWNS
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
		return {
			status: "error" as const,
			message: "Incorrect verification code.",
		}
	}

	const deleteKeysPromise = kv.del(
		OTP.key({ phoneNumber }),
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
		.onConflictDoUpdate({
			target: user.phoneNumber,
			set: {
				firstName: firstName.trim().slice(0, 50),
				lastName: lastName.trim().slice(0, 50),
			},
		})
		.returning({
			id: user.id,
			createdAt: user.createdAt,
		})
		.all()

	if (createdUserRow === undefined) throw new Error("Failed to create user")

	const isNewUser = createdUserRow.createdAt.getTime() === createdAt.getTime()

	const smsPromise = isNewUser
		? sms.send({
				to: phoneNumber,
				content:
					"You've subscribed to notifications from mchsanonymous. Notifications indicating the number of unread messages you have, if any, are sent at most once per day. Reply with STOP to opt-out. Message frequency depends on activity and Msg&Data rates may apply.",
		  })
		: undefined

	const triggerPotentialSpecialMessagePromise = isNewUser
		? triggerPotentialSpecialMessage({
				reason: "userJoined",
				userId: createdUserRow.id,
				invitedByUserId,
		  })
		: undefined

	await setAuth({
		cookies,
		auth: { id: createdUserRow.id, firstName, lastName },
	})

	await realtime.trigger("user", "joined", {
		id: createdUserRow.id,
		firstName,
		lastName,
	})

	await smsPromise

	await expireAttemptsPromise
	await deleteKeysPromise

	await triggerPotentialSpecialMessagePromise
})

export default createUserAction
