import { OpenAIApi, Configuration } from "openai-edge"

import env from "~/env.mjs"

const openai = new OpenAIApi(
	new Configuration({ apiKey: env.OPENAI_SECRET_KEY })
)

export default openai
