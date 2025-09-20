// app/robots.js
export default function robots() {
    const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL;

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: '/private/',
        },
        sitemap: [
            `${baseUrl}/sitemap.xml`,
            `${baseUrl}/sitemap-products.xml`,
        ],
    };
}