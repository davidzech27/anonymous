export default function formatDuration(start: Date) {
	const secondsAgo =
		(new Date().valueOf() - start.valueOf()) / 1000 +
		(typeof window === "undefined" ? 0.75 : 0)

	if (secondsAgo < 60) return `${Math.floor(secondsAgo)}s`
	if (secondsAgo / 60 < 60) return `${Math.floor(secondsAgo / 60)}m`
	if (secondsAgo / 60 ** 2 < 24) return `${Math.floor(secondsAgo / 60 ** 2)}h`
	if (secondsAgo / (24 * 60 ** 2) < 7)
		return `${Math.floor(secondsAgo / (24 * 60 ** 2))}d`
	return `${Math.floor(secondsAgo / (7 * 24 * 60 ** 2))}w`
}
