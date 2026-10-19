// app/(shop)/category/[slug]/page.tsx
import { redirect } from 'next/navigation';

interface CategoryRedirectPageProps {
    params: Promise<{ slug: string }>;
}

export default async function CategoryRedirectPage({ params }: CategoryRedirectPageProps) {
    const { slug } = await params;
    const resolvedSlug = slug === 'fragrances' ? 'fragrance' : slug;
    redirect(`/catalog?category=${encodeURIComponent(resolvedSlug)}`);
}
