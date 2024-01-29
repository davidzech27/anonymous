import readline from "readline"
import fs from "fs"
import z from "zod"

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
})

rl.question("headers json string: ", (headersJSONString: string) => {
	void (async () => {
		// let followers: { username: string; pk: string }[] = []

		// const headers = JSON.parse(headersJSONString) as HeadersInit

		// for (let maxId = 24; maxId < 2418 + 12; maxId += 24) {
		// 	const newFollowers = z
		// 		.object({
		// 			users: z
		// 				.object({ username: z.string(), pk: z.string() })
		// 				.array(),
		// 		})
		// 		.parse(
		// 			await (
		// 				await fetch(
		// 					`https://www.instagram.com/api/v1/friendships/539812716/followers/?count=24&max_id=${maxId}&search_surface=follow_list_page`,
		// 					{
		// 						headers,
		// 					}
		// 				)
		// 			).json()
		// 		)
		// 		.users.map((user) => ({ username: user.username, pk: user.pk }))

		// 	followers.push(...newFollowers)

		// 	followers = followers.filter(
		// 		(follower, index, self) =>
		// 			index ===
		// 			self.findIndex(
		// 				({ username }) => username === follower.username
		// 			)
		// 	)

		// 	console.log(followers.length, "followers")

		// 	fs.writeFile(
		// 		"followers.json",
		// 		JSON.stringify(followers, null, 2),
		// 		(error) => {
		// 			if (error) throw error
		// 		}
		// 	)

		const mchsStudents: { username: string; pk: string }[] = []

		const headers = JSON.parse(headersJSONString) as HeadersInit

		const followers = z
			.object({
				users: z
					.object({ username: z.string(), pk: z.string() })
					.array(),
			})
			.parse(fs.readFileSync("followers.json").toJSON())
	})()
})
