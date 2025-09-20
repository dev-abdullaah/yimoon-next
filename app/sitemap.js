// app/sitemap.js
export default function sitemap() {
    return [
        {
            url: `${process.env.NEXT_PUBLIC_WEBSITE_URL}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/catalog`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/featured`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/sitemap-products.xml`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
    ];
}