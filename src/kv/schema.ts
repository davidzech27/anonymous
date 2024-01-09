import z from "zod"

export const OTP = {
	key: ({ phoneNumber }: { phoneNumber: number }) => `otp:${phoneNumber}`,
	validator: z.string().nullable(),
}

export const resendCoolingDown = {
	key: ({ phoneNumber }: { phoneNumber: number }) =>
		`resendcooldown:${phoneNumber}`,
	validator: z.literal(1).nullable(),
}

export const verificationAttempts = {
	key: ({ phoneNumber }: { phoneNumber: number }) =>
		`verificationattempts:${phoneNumber}`,
	validator: z.number().nullable(),
}

export const verificationCoolingDown = {
	key: ({ phoneNumber }: { phoneNumber: number }) =>
		`verificationcooldown:${phoneNumber}`,
	validator: z.literal(1).nullable(),
}
