// app/sitemap-products/route.js
import { BASE_URL } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';

export async function GET() {
    try {
        const token = await getOrFetchToken();
        if (!token) throw new Error("Authentication token not found");

        const timestamp = Math.floor(Date.now() / 1000);
        const formData = new FormData();
        formData.append('timestamp', timestamp.toString());
        formData.append('token', token);
        formData.append('com', 'Appstore');
        formData.append('action', 'searchItem');
        formData.append('fields', 'i.id,i.name');
        formData.append('storeid', '1');
        formData.append('limit', '0,1000'); // Adjust as needed

        const response = await fetch(`${BASE_URL}/exchange`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        const products = data?.data || [];

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
            <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            ${products.map(product => {
            const slug = product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            return `
            <url>
                <loc>${process.env.NEXT_PUBLIC_WEBSITE_URL}/product/${product.itemid}/${slug}</loc>
                <lastmod>${new Date().toISOString()}</lastmod>
                <changefreq>weekly</changefreq>
                <priority>0.8</priority>
            </url>`;
        }).join('')}
            </urlset>`;

        return new Response(sitemap, {
            headers: {
                'Content-Type': 'application/xml',
            },
        });
    } catch (error) {
        console.error('Error generating sitemap:', error);
        return new Response('Error generating sitemap', { status: 500 });
    }
}