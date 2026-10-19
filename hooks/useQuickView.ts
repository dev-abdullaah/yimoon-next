// hooks/useQuickView.ts
import { useState } from 'react';
import { Product, ProductView } from '@/types/product';

export interface UseQuickViewReturn {
    selectedProduct: Product | ProductView | null;
    showQuickView: boolean;
    handleQuickViewOpen: (product: any) => void;
    handleQuickViewClose: () => void;
}

export default function useQuickView(): UseQuickViewReturn {
    const [selectedProduct, setSelectedProduct] = useState<Product | ProductView | null>(null);
    const [showQuickView, setShowQuickView] = useState<boolean>(false);

    const getScrollbarWidth = (): number => {
        if (typeof document === 'undefined') return 0;
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll';
        (outer.style as any).msOverflowStyle = 'scrollbar';
        document.body.appendChild(outer);

        const inner = document.createElement('div');
        outer.appendChild(inner);

        const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
        outer.parentNode?.removeChild(outer);

        return scrollbarWidth;
    };

    const handleQuickViewOpen = (product: any): void => {
        setSelectedProduct(product);
        setShowQuickView(true);

        const scrollbarWidth = getScrollbarWidth();
        if (typeof document !== 'undefined') {
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
    };

    const handleQuickViewClose = (): void => {
        setShowQuickView(false);
        if (typeof document !== 'undefined') {
            document.body.style.overflow = 'auto';
            document.body.style.paddingRight = '0px';
        }
    };

    return {
        selectedProduct,
        showQuickView,
        handleQuickViewOpen,
        handleQuickViewClose,
    };
}
