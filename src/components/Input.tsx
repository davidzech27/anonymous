import cn from "~/util/cn"

interface Props {
	type:
		| "button"
		| "checkbox"
		| "color"
		| "date"
		| "datetime-local"
		| "email"
		| "file"
		| "hidden"
		| "image"
		| "month"
		| "number"
		| "password"
		| "radio"
		| "range"
		| "reset"
		| "search"
		| "submit"
		| "tel"
		| "text"
		| "time"
		| "url"
		| "week"
	value: string
	onChangeValue: (value: string) => void
	placeholder: string
	"aria-required"?: boolean
	"aria-label"?: string
	autoComplete?: string
	className?: string
}

export default function TextInput({
	type,
	value,
	onChangeValue,
	placeholder,
	"aria-required": ariaRequired,
	"aria-label": ariaLabel,
	autoComplete,
	className,
}: Props) {
	return (
		<input
			type={type}
			value={value}
			onChange={(e) => onChangeValue(e.target.value)}
			placeholder={placeholder}
			aria-required={ariaRequired}
			aria-label={ariaLabel}
			autoComplete={autoComplete}
			className={cn(
				"rounded-lg border border-white bg-white/20 px-3 py-2 text-lg font-medium text-white outline-0 transition placeholder:select-none placeholder:font-light placeholder:text-white/50 focus:bg-white/30 focus:placeholder:text-white/60",
				className
			)}
		/>
	)
}
