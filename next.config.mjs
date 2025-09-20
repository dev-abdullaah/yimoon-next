// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'https://izoldi.apprain.com/ethical/:path*',
            },
        ];
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin-allow-popups',
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'unsafe-none',
                    },
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'cross-origin',
                    },
                    {
                        key: 'Origin-Agent-Cluster',
                        value: '?1',
                    },
                ],
            },
        ];
    },
    images: {
        domains: ['izoldi.apprain.com'],
    },
};

export default nextConfig;