const os = require("os")

/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		serverActions: true,
		serverComponentsExternalPackages: ["libsql"],
	},

}

module.exports = nextConfig
