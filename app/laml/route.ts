export async function POST(request: Request) {
	console.log(await request.text())
}
