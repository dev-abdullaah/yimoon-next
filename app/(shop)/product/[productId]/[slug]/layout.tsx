// app/(shop)/product/[productId]/[slug]/layout.tsx
import { ReactNode, Suspense } from 'react';
import Loading from '@/components/Loading';

interface ProductLayoutProps {
    children: ReactNode;
    params?: Promise<{ productId: string; slug: string }>;
}

export default function ProductLayout({ children }: ProductLayoutProps) {
    return (
        <Suspense fallback={<Loading />}>
            {children}
        </Suspense>
    );
}
