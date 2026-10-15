import { redirect } from 'next/navigation';

export default async function CategoryRedirectPage({ params }) {
    const { slug } = await params;
    const resolvedSlug = slug === 'fragrances' ? 'fragrance' : slug;
    redirect(`/catalog?category=${encodeURIComponent(resolvedSlug)}`);
}
