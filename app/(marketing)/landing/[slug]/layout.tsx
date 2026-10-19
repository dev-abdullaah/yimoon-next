// app/(marketing)/landing/[slug]/layout.tsx
import React, { ReactNode, Suspense } from 'react';
import type { Metadata } from 'next';
import { catalogApi } from '@/lib/api';
import { toProductView } from '@/lib/productView';
import { WEBSITE_URL } from '@/lib/config';
import Loading from '@/components/Loading';

interface LandingLayoutProps {
    children: ReactNode;
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;

    try {
        const response = await catalogApi.getProduct(slug);
        const product = toProductView(response?.data ?? response);

        if (!product) {
            return {
                title: 'স্পেশাল অফার - প্রিমিয়াম প্রোডাক্ট | King Queen',
                description: 'সীমিত সময়ের জন্য বিশেষ ছাড়ে সেরা পণ্য অর্ডার করুন। দ্রুত হোম ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা।',
            };
        }

        const title = `${product.name} - স্পেশাল অফার | King Queen`;
        const description = product.description
            ? product.description.slice(0, 180)
            : `অর্ডার করুন ${product.name}। ১০০% অরিজিনাল কোয়ালিটি, ক্যাশ অন ডেলিভারি ও সারাদেশে দ্রুত ডেলিভারি সুবিধা।`;

        const image = product.image && !product.image.endsWith('placeholder.jpg')
            ? product.image
            : `${WEBSITE_URL}/api/og?slug=${encodeURIComponent(product.slug)}`;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                url: `${WEBSITE_URL}/landing/${product.slug}`,
                siteName: 'King Queen',
                images: [
                    {
                        url: image,
                        width: 1200,
                        height: 630,
                        alt: product.name,
                    },
                ],
                locale: 'bn_BD',
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: [image],
            },
        };
    } catch {
        return {
            title: 'স্পেশাল অফার - প্রিমিয়াম প্রোডাক্ট | King Queen',
            description: 'সীমিত সময়ের জন্য বিশেষ ছাড়ে সেরা পণ্য অর্ডার করুন।',
        };
    }
}

export default function LandingLayout({ children }: { children: ReactNode }) {
    return (
        <Suspense fallback={<Loading />}>
            {children}
        </Suspense>
    );
}
