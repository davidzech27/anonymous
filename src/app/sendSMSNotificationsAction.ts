"use server"

import sms from "~/sms/sms"
import env from "~/env.mjs"

export default async function sendSMSNotificationsAction(
	users: {
		phoneNumber: number
		unread: number
		smsNotificationConsent: boolean
	}[]
) {
	"use server"

	await Promise.all(
		users
			.filter((user) => user.unread > 0 && user.smsNotificationConsent)
			.map(
				(user) =>
					new Promise((res) =>
						setTimeout(() => {
							void sms
								.send({
									to: user.phoneNumber,
									content: `You have ${user.unread} unread messages waiting on mchsanonymous. Visit ${env.URL} to view them!`,
								})
								.then(res)
						}, Math.random() * 1000 * 30)
					)
			)
	)
}
