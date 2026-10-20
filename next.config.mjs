// next.config.mjs
const isProd = process.env.NODE_ENV === 'production';
const backendOrigin = (
    process.env.NEXT_PUBLIC_API_IMAGE_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, '') ||
    (isProd ? 'https://handle.kingqueenbd.com' : 'http://127.0.0.1:8000')
).replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                destination: `${backendOrigin}/api/v1/:path*`,
            },
            {
                source: '/api/:path*',
                destination: `${backendOrigin}/api/v1/:path*`,
            },
            {
                source: '/img/:path*',
                destination: `${backendOrigin}/img/:path*`,
            },
        ];
    },
    async redirects() {
        return [
            {
                source: '/category/fragrances',
                destination: '/catalog?category=fragrance',
                permanent: false,
            },
            {
                source: '/category/:slug',
                destination: '/catalog?category=:slug',
                permanent: false,
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
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'handle.kingqueenbd.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'kingqueenbd.com',
                pathname: '/**',
            },
            {
                protocol: 'http',
                hostname: '127.0.0.1',
                port: '8000',
                pathname: '/storage/**',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8000',
                pathname: '/storage/**',
            },
            {
                protocol: 'http',
                hostname: '127.0.0.1',
                port: '8000',
                pathname: '/img/**',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8000',
                pathname: '/img/**',
            },
        ],
    },
};

export default nextConfig;