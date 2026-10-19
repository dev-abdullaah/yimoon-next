// app/(shop)/[slug]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

interface CmsPageData {
    id: number | string;
    title: string;
    slug: string;
    content?: string;
    is_active?: boolean;
    meta_title?: string;
    meta_description?: string;
    [key: string]: any;
}

async function getPageData(slug: string): Promise<CmsPageData | null> {
    try {
        const res = await fetch(`${API_BASE}/storefront/pages/${slug}`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            return null;
        }

        const json = await res.json();
        return json?.data ?? null;
    } catch {
        return null;
    }
}

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const page = await getPageData(slug);

    if (!page) {
        return {
            title: 'Page Not Found - King Queen',
        };
    }

    return {
        title: page.meta_title || `${page.title} - King Queen`,
        description: page.meta_description || `${page.title} on King Queen Bangladesh.`,
    };
}

export default async function CmsPage({ params }: PageProps) {
    const { slug } = await params;
    const page = await getPageData(slug);

    if (!page || !page.is_active) {
        notFound();
    }

    return (
        <main className="container mx-auto px-5 md:px-7 lg:px-12 py-6 md:py-10">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-2 text-xs md:text-sm text-gray-500">
                <Link href="/" className="hover:text-primary transition-colors">
                    Home
                </Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">{page.title}</span>
            </nav>

            <article className="max-w-4xl mx-auto bg-white rounded-lg p-6 md:p-10 shadow-sm border border-gray-100">
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">
                    {page.title}
                </h1>

                <div
                    className="space-y-4 text-gray-700 leading-relaxed text-sm md:text-base [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-gray-900"
                    dangerouslySetInnerHTML={{ __html: page.content || '' }}
                />
            </article>
        </main>
    );
}
