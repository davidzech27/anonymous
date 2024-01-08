/** @type {import('tailwindcss').Config} */
const config = {
	content: ["./src/**/*.tsx"],
	theme: {
		extend: {
			colors: {
				primary: "#4A7460",
				secondary: "#EBCC7A",
			},
			screens: {
				mobile: { max: "1024px" },
			},
		},
	},
	plugins: [],
}

export default config
