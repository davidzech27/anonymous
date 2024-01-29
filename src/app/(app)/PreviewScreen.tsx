"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

useState

interface Props {
	launchDate: Date
}

export default function PreviewScreen({ launchDate }: Props) {
	const [date, setDate] = useState(new Date())

	const router = useRouter()

	useEffect(() => {
		const intervalId = setInterval(() => {
			if (new Date() > date) {
				router.refresh()
			} else {
				setDate(new Date())
			}
		}, 1000)

		return () => {
			clearInterval(intervalId)
		}
	}, [])

	const now = date.getTime()
	const launchTime = launchDate.getTime()
	const difference = launchTime - now

	const days = Math.floor(difference / (1000 * 60 * 60 * 24))
	const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
	const minutes = Math.floor((difference / 1000 / 60) % 60)
	const seconds = Math.floor((difference / 1000) % 60)

	return (
		<main className="flex h-[100dvh] w-full items-center justify-center bg-primary">
			<div className="space-y-2">
				<h1 className="text-2xl font-bold text-secondary">
					mchsanonymous
				</h1>

				<p className="text-2xl font-bold text-secondary">{days} days</p>

				<p className="text-2xl font-bold text-secondary">
					{hours} hours
				</p>

				<p className="text-2xl font-bold text-secondary">
					{minutes} minutes
				</p>

				<p className="text-2xl font-bold text-secondary">
					{seconds} seconds
				</p>

				<p className="text-2xl font-bold text-secondary">
					until launch
				</p>
			</div>
		</main>
	)
}
