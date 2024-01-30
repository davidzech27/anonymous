import { Client } from "@upstash/qstash"
import { z } from "zod"

import env from "~/env.mjs"

const qstash = new Client({ token: env.QSTASH_TOKEN })

export const triggerPotentialSpecialMessageSchema = z.discriminatedUnion(
	"reason",
	[
		z.object({
			reason: z.literal("userJoined"),
			userId: z.number(),
			invitedByUserId: z.number().optional(),
		}),
		z.object({
			reason: z.literal("sentMessage"),
			fromUserId: z.number(),
			conversationId: z.number(),
			content: z.string(),
		}),
	]
)

export default async function triggerPotentialSpecialMessage(
	body: z.infer<typeof triggerPotentialSpecialMessageSchema>
) {
	await qstash.publishJSON({
		body,
		url: `${env.URL}/triggerPotentialSpecialMessage`,
		contentBasedDeduplication: true,
	})
}
