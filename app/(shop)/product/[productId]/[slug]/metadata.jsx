// app/(shop)/product/[productId]/[slug]/metadata.jsx
import { BASE_URL, IMAGE_BASE_URL, WEBSITE_URL } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';
import { generateSlug } from '@/utils/urlHelper';

export async function generateMetadata({ params }) {
    const productId = params.productId;
    const slug = params.slug;

    try {
        // Fetch product data using the same logic as your page component
        const token = await getOrFetchToken();
        const timestamp = Math.floor(Date.now() / 1000);
        const formData = new FormData();
        formData.append('timestamp', timestamp.toString());
        formData.append('token', token);
        formData.append('com', 'Appstore');
        formData.append('action', 'searchItem');
        formData.append('fields', 'i.featured,p.features,i.category as category_id,c.title as category_name,p.shortdesc,i.setup,i.image,i.moreimages');
        formData.append('storeid', '1');
        formData.append('condition', `i.id=${productId}`);

        const response = await fetch(`${BASE_URL}/exchange`, {
            method: 'POST',
            body: formData,
            cache: 'no-store' // Ensure fresh data
        });

        if (!response.ok) {
            return getDefaultMetadata(productId);
        }

        const data = await response.json();
        const product = data?.data?.[0];

        if (!product) {
            return getDefaultMetadata(productId);
        }

        const setup = product.setup ? JSON.parse(product.setup) : {};
        const discount = setup.discount || 0;
        const originalPrice = parseFloat(product.unitsalesprice);
        const discountedPrice = originalPrice - parseFloat(discount);

        // Generate proper slug from product name
        const properSlug = generateSlug(product.name);
        const productUrl = `${WEBSITE_URL}/product/${productId}/${properSlug}`;

        // Use the dynamic OG image endpoint
        const ogImageUrl = `${WEBSITE_URL}/api/og?id=${productId}`;

        const title = `${product.name} | Yi Moon`;
        const description = product.shortdesc
            ? product.shortdesc.substring(0, 160)
            : `Buy ${product.name} at ৳${discountedPrice} from Yi Moon - A Mini China Store in Bangladesh. Shop quality products with fast delivery across Bangladesh.`;

        return {
            title,
            description,
            keywords: `${product.name}, Yi Moon, Bangladesh, online shopping, ${product.category_name || ''}`,

            // Canonical URL
            alternates: {
                canonical: productUrl,
            },

            // Open Graph
            openGraph: {
                title,
                description,
                url: productUrl,
                siteName: 'Yi Moon',
                locale: 'en_US',
                type: 'product',
                images: [
                    {
                        url: ogImageUrl,
                        width: 1200,
                        height: 630,
                        alt: product.name,
                        type: 'image/png'
                    }
                ],
                // Product-specific OG tags
                'product:price:amount': discountedPrice.toString(),
                'product:price:currency': 'BDT',
                'product:availability': 'in stock',
                'product:brand': 'Yi Moon',
                'product:condition': 'new'
            },

            // Twitter
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: [ogImageUrl],
                creator: '@yimoonbd'
            },

            // Additional meta tags
            other: {
                'product:price:amount': discountedPrice.toString(),
                'product:price:currency': 'BDT',
                'product:availability': 'in stock',
                'product:brand': 'Yi Moon',
                'product:condition': 'new',
                'og:image:width': '1200',
                'og:image:height': '630',
                'og:image:type': 'image/png'
            },

            // Robots
            robots: {
                index: true,
                follow: true,
                googleBot: {
                    index: true,
                    follow: true,
                    'max-video-preview': -1,
                    'max-image-preview': 'large',
                    'max-snippet': -1,
                },
            }
        };

    } catch (error) {
        console.error('Error generating metadata:', error);
        return getDefaultMetadata(productId);
    }
}

function getDefaultMetadata(productId) {
    const ogImageUrl = `${WEBSITE_URL}/api/og?id=${productId}`;

    return {
        title: 'Product | Yi Moon',
        description: 'Discover amazing products at Yi Moon - A Mini China Store in Bangladesh.',
        openGraph: {
            title: 'Product | Yi Moon',
            description: 'Discover amazing products at Yi Moon - A Mini China Store in Bangladesh.',
            url: `${WEBSITE_URL}/product/${productId}`,
            siteName: 'Yi Moon',
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: 'Yi Moon Product',
                    type: 'image/png'
                }
            ],
            locale: 'en_US',
            type: 'product'
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Product | Yi Moon',
            description: 'Discover amazing products at Yi Moon - A Mini China Store in Bangladesh.',
            images: [ogImageUrl]
        }
    };
}