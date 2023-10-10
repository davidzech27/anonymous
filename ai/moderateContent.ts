import { z } from "zod"

import openai from "./openai"

const responseSchema = z.object({
	results: z
		.object({
			category_scores: z.object({
				sexual: z.number(),
				hate: z.number(),
				harassment: z.number(),
				"self-harm": z.number(),
				"sexual/minors": z.number(),
				"hate/threatening": z.number(),
				"violence/graphic": z.number(),
				"self-harm/intent": z.number(),
				"self-harm/instructions": z.number(),
				"harassment/threatening": z.number(),
				violence: z.number(),
			}),
		})
		.array(),
})

export default async function moderateContent({
	content,
	categoryScoreThresholds,
}: {
	content: string
	categoryScoreThresholds: {
		sexual: number
		hate: number
		harassment: number
		"self-harm": number
		"sexual/minors": number
		"hate/threatening": number
		"violence/graphic": number
		"self-harm/intent": number
		"self-harm/instructions": number
		"harassment/threatening": number
		violence: number
	}
}) {
	const response = await (
		await openai.createModeration({
			input: content,
			model: "text-moderation-stable",
		})
	).json()

	console.info(
		"content moderation category scores",
		JSON.stringify(response, null, 4)
	)

	const responseParsed = responseSchema.safeParse(response)

	return {
		flagged:
			responseParsed.success &&
			Object.entries(
				responseParsed.data.results[0]?.category_scores ?? {}
			).reduce(
				(prev, cur) =>
					prev ||
					cur[1] >=
						((categoryScoreThresholds as Record<string, number>)[
							cur[0]
						] ?? 0),
				false
			),
	}
}
