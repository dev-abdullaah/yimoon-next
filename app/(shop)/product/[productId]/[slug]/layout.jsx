// app/(shop)/product/[productId]/[slug]/layout.jsx
import { Suspense } from 'react';
import Loading from '@/components/Loading';

export default function ProductLayout({ children, params }) {
    return (
        <Suspense fallback={<Loading />}>
            {children}
        </Suspense>
    );
}