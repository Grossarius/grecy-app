/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/WooliesApi.py",
        destination: "http://127.0.0.1:5000/get_product"
      },
    ]
  },
}

module.exports = nextConfig
