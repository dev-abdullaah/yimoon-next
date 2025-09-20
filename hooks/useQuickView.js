// src/hooks/useQuickView.js
import { useState } from 'react';

export default function useQuickView() {
    
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showQuickView, setShowQuickView] = useState(false);

    const getScrollbarWidth = () => {
        // Create a temporary div to measure scrollbar width
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll';
        outer.style.msOverflowStyle = 'scrollbar';
        document.body.appendChild(outer);

        const inner = document.createElement('div');
        outer.appendChild(inner);

        const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
        outer.parentNode.removeChild(outer);

        return scrollbarWidth;
    };

    const handleQuickViewOpen = (product) => {
        setSelectedProduct(product);
        setShowQuickView(true);

        // Get scrollbar width before hiding it
        const scrollbarWidth = getScrollbarWidth();

        // Prevent body scroll and compensate for scrollbar width
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${scrollbarWidth}px`;
    };

    const handleQuickViewClose = () => {
        setShowQuickView(false);

        // Restore body scroll and remove padding
        document.body.style.overflow = 'auto';
        document.body.style.paddingRight = '0px';
    };

    return {
        selectedProduct,
        showQuickView,
        handleQuickViewOpen,
        handleQuickViewClose,
    };
}
