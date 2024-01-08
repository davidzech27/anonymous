import { OpenAIApi, Configuration } from "openai-edge"

import env from "~/env.js"

const openai = new OpenAIApi(
	new Configuration({ apiKey: env.OPENAI_SECRET_KEY })
)

export default openai
