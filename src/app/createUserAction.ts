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
		smsNotificationConsent: z.boolean(),
		invitedByUserId: z.number().optional(),
	})
)(
	async ({
		firstName,
		lastName,
		phoneNumber,
		otp,
		smsNotificationConsent,
		invitedByUserId,
	}) => {
		noStore()

		const createdAt = new Date()
		createdAt.setMilliseconds(0)

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
				smsNotificationConsent,
				createdAt,
			})
			.onConflictDoUpdate({
				target: user.phoneNumber,
				set: {
					firstName: firstName.trim().slice(0, 50),
					lastName: lastName.trim().slice(0, 50),
					smsNotificationConsent,
				},
			})
			.returning({
				id: user.id,
				createdAt: user.createdAt,
			})
			.all()

		if (createdUserRow === undefined)
			throw new Error("Failed to create user")

		const isNewUser =
			createdUserRow.createdAt.getTime() === createdAt.getTime()

		await Promise.all([
			await setAuth({
				cookies,
				auth: { id: createdUserRow.id, firstName, lastName },
			}),
			isNewUser &&
				sms.send({
					to: phoneNumber,
					content: `Welcome to mchsanonymous! Send anyone you want anonymous messages—you can see who they are, but they won't be able to see who you are. Remember not to cyberbully, or you will be banned. Have fun!

You've subscribed to notifications from mchsanonymous. Notifications indicating the number of unread messages you have, if any, are sent at most once per day. Reply with STOP to opt-out. Message frequency depends on activity and Msg&Data rates may apply.`,
				}),
			isNewUser &&
				triggerPotentialSpecialMessage({
					reason: "userJoined",
					userId: createdUserRow.id,
					invitedByUserId,
				}),
			isNewUser &&
				realtime.trigger("user", "joined", {
					id: createdUserRow.id,
					firstName,
					lastName,
				}),
			expireAttemptsPromise,
			deleteKeysPromise,
		])

		return {
			status: "success" as const,
			userId: createdUserRow.id,
			phoneNumber,
			firstName: firstName.trim().slice(0, 50),
			lastName: lastName.trim().slice(0, 50),
		}
	}
)

export default createUserAction
