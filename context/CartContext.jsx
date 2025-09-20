// context/CartContext.jsx
"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import CryptoJS from 'crypto-js';
import { IMAGE_BASE_URL } from '@/lib/config';

const CartContext = createContext();

function useFloatingCart() {
    return useContext(CartContext);
}

// Helper function to check if we're in the browser
const isBrowser = () => typeof window !== 'undefined';

// CryptoJS-based encryption/decryption utility with cookie support
const CartCrypto = {
    // Generate dynamic cookie name using CryptoJS
    getCookieName() {
        if (!isBrowser()) return 'server-cart-cookie';

        const baseKey = 'cart_data_cookie';
        const hash = CryptoJS.SHA256(baseKey).toString();
        return `session.usr_${hash.slice(0, 12)}`; // Use first 12 chars of SHA-256 hash
    },

    // Generate a secure key based on browser fingerprint
    getEncryptionKey() {
        if (!isBrowser()) return 'server-encryption-key';

        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.userAgentData?.platform || 'unknown',
            window.location.origin
        ].join('|');

        const hash = CryptoJS.SHA256(fingerprint).toString();
        return hash.substring(0, 32); // 256-bit key
    },

    // AES encryption with CryptoJS
    encrypt(text, key) {
        try {
            const encrypted = CryptoJS.AES.encrypt(text, key, {
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
            return encrypted.toString();
        } catch (e) {
            console.error('Encryption failed:', e);
            throw new Error('Failed to encrypt cart data');
        }
    },

    // AES decryption with CryptoJS
    decrypt(encryptedText, key) {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
            const plainText = decrypted.toString(CryptoJS.enc.Utf8);

            if (!plainText) {
                throw new Error('Decryption resulted in empty string');
            }

            return plainText;
        } catch (e) {
            console.error('Decryption failed:', e);
            return null;
        }
    },

    // Cookie utility functions
    setCookie(name, value, days = 30) {
        if (!isBrowser()) return;

        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure=${window.location.protocol === 'https:'}`;
    },

    getCookie(name) {
        if (!isBrowser()) return null;

        const nameEQ = name + "=";
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i];
            while (cookie.charAt(0) === ' ') cookie = cookie.substring(1, cookie.length);
            if (cookie.indexOf(nameEQ) === 0) return cookie.substring(nameEQ.length, cookie.length);
        }
        return null;
    },

    deleteCookie(name) {
        if (!isBrowser()) return;

        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`;
    }
};

function CartProviderComponent({ children, isAuthenticated = false }) {
    const [cartItems, setCartItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [evPointTotal, setEvPointTotal] = useState(0);
    const [encryptionKey, setEncryptionKey] = useState('server-encryption-key');
    const [cookieName, setCookieName] = useState('server-cart-cookie');
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const prevAuthStatus = useRef(isAuthenticated);

    // Initialize encryption key and cookie name only on the client side
    useEffect(() => {
        if (isBrowser()) {
            setEncryptionKey(CartCrypto.getEncryptionKey());
            setCookieName(CartCrypto.getCookieName());
        }
    }, []);

    const formatCurrency = (value) => {
        const number = Number(value);
        if (isNaN(number)) return "৳ 0";
        return "৳ " + number.toLocaleString("en-BD");
    };

    const groupItems = (items) => {
        const grouped = {};
        items.forEach(item => {
            if (grouped[item.id]) {
                grouped[item.id].qty += item.qty;
            } else {
                grouped[item.id] = { ...item };
            }
        });
        return Object.values(grouped);
    };

    const calculateTotal = (items) => {
        return items.reduce((sum, item) => {
            return sum + (item.qty * item.price);
        }, 0);
    };

    const calculateTotalDiscount = (items) => {
        return items.reduce((sum, item) => {
            return sum + (item.qty * (item.discount || 0));
        }, 0);
    };

    // New function to calculate evPoint total
    const calculateEvPointTotal = (items) => {
        if (!isAuthenticated) return 0; // Only calculate if user is authenticated
        return items.reduce((sum, item) => {
            return sum + (item.qty * (item.evPoint || 0));
        }, 0);
    };

    const saveCartToStorage = (items) => {
        if (!isBrowser()) return;

        try {
            const grouped = groupItems(items);
            const total = calculateTotal(grouped);
            const evPointTotal = calculateEvPointTotal(grouped); // Calculate evPoint total

            const cartData = {
                items: grouped,
                total,
                evPointTotal
            };

            // Encrypt the cart data with AES before saving to cookie
            const encryptedData = CartCrypto.encrypt(JSON.stringify(cartData), encryptionKey);

            // Save encrypted data to cookie with 30-day expiration
            CartCrypto.setCookie(cookieName, encryptedData, 30);
        } catch (e) {
            console.error("Failed to save encrypted cart:", e);
        }
    };

    const loadCartFromStorage = () => {
        if (!isBrowser()) return;

        const stored = CartCrypto.getCookie(cookieName);
        if (!stored) {
            // console.log('No cart data found in cookies');
            return;
        }

        try {
            // Try to decrypt the cookie data
            const decryptedData = CartCrypto.decrypt(stored, encryptionKey);

            if (!decryptedData) {
                console.log('Decryption failed - clearing corrupted cookie');
                CartCrypto.deleteCookie(cookieName);
                return;
            }

            const cartData = JSON.parse(decryptedData);
            // console.log('Loaded cart data:', cartData);

            if (cartData && cartData.items) {
                // Ensure all items have evPoint property
                const itemsWithEvPoint = cartData.items.map(item => ({
                    ...item,
                    evPoint: isAuthenticated ? (item.productData?.evPoint || item.evPoint || 0) : 0
                }));

                const grouped = groupItems(itemsWithEvPoint);
                const total = calculateTotal(grouped);
                const evPointTotal = calculateEvPointTotal(grouped);

                setCartItems(grouped);
                setTotal(total);
                setEvPointTotal(evPointTotal);
                // console.log('Cart loaded successfully');
            }
        } catch (e) {
            console.error("Failed to load cart data:", e);
            // Clear corrupted cookie
            CartCrypto.deleteCookie(cookieName);
        }
    };

    useEffect(() => {
        if (isBrowser()) {
            loadCartFromStorage();
            setIsInitialLoad(false);
        }
    }, [encryptionKey, cookieName]);

    // Update cart items when authentication status changes (but not on initial load)
    useEffect(() => {
        if (!isBrowser()) return;

        if (isInitialLoad) {
            prevAuthStatus.current = isAuthenticated;
            return;
        }

        // Only update if auth status actually changed
        if (prevAuthStatus.current !== isAuthenticated) {
            // console.log('Auth status changed from', prevAuthStatus.current, 'to', isAuthenticated);

            // Update evPoint for all items based on current auth status
            const updatedItems = cartItems.map(item => ({
                ...item,
                evPoint: isAuthenticated ? (item.productData?.evPoint || 0) : 0
            }));

            const grouped = groupItems(updatedItems);
            const newTotal = calculateTotal(grouped);
            const newEvPointTotal = calculateEvPointTotal(grouped);

            setCartItems(grouped);
            setTotal(newTotal);
            setEvPointTotal(newEvPointTotal);
            saveCartToStorage(grouped);

            prevAuthStatus.current = isAuthenticated;
        }
    }, [isAuthenticated, cartItems, isInitialLoad]);

    // Helper function to update cart state and storage
    const updateCart = (newItems) => {
        const grouped = groupItems(newItems);
        const newTotal = calculateTotal(grouped);
        const newEvPointTotal = calculateEvPointTotal(grouped);

        setCartItems(grouped);
        setTotal(newTotal);
        setEvPointTotal(newEvPointTotal);
        saveCartToStorage(grouped);

        return grouped;
    };

    const addToCart = (product, quantity = 1) => {
        if (!product) return;

        const existing = cartItems.find(item => item.id === product.id);
        let updatedItems;

        const finalPrice = Number(product.discountedPrice ?? product.originalPrice ?? 0);
        const discountAmount = Number(product.discount) || 0;
        const originalPrice = Number(product.originalPrice) || finalPrice + discountAmount;
        const evPointAmount = Number(product.evPoint) || 0;

        const itemToAdd = {
            id: product.id,
            name: product.name,
            price: finalPrice,
            originalPrice: originalPrice,
            discount: discountAmount,
            evPoint: isAuthenticated ? evPointAmount : 0, // Only include evPoint if authenticated
            qty: quantity,
            image: `${IMAGE_BASE_URL}/${product.photo}`,
            link: `/product/${product.id}`,
            category: product.category_name || 'Uncategorized',
            productData: { // Store only necessary product data
                id: product.id,
                name: product.name,
                evPoint: evPointAmount,
                discountedPrice: product.discountedPrice,
                originalPrice: product.originalPrice,
                discount: product.discount,
                photo: product.photo,
                category_name: product.category_name
            }
        };

        if (existing) {
            updatedItems = cartItems.map(item =>
                item.id === product.id
                    ? {
                        ...item,
                        qty: item.qty + quantity,
                        evPoint: isAuthenticated ? evPointAmount : 0 // Update evPoint based on current auth status
                    }
                    : item
            );
        } else {
            updatedItems = [...cartItems, itemToAdd];
        }

        updateCart(updatedItems);
        toast.success(`"${product.name}" added to cart`);
    };

    const removeItemById = (id, productName) => {
        const updatedItems = cartItems.filter(item => item.id !== id);
        updateCart(updatedItems);
        toast.success(`"${productName}" removed from cart`);
    };

    const increaseQty = (id) => {
        const updatedItems = cartItems.map(item =>
            item.id === id ? { ...item, qty: item.qty + 1 } : item
        );
        updateCart(updatedItems);
    };

    const decreaseQty = (id) => {
        const updatedItems = cartItems
            .map(item => {
                if (item.id === id) {
                    const newQty = item.qty - 1;
                    return newQty > 0 ? { ...item, qty: newQty } : null;
                }
                return item;
            })
            .filter(item => item !== null);

        updateCart(updatedItems);
    };

    const itemCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

    const clearCart = () => {
        setCartItems([]);
        setTotal(0);
        setEvPointTotal(0);
        if (isBrowser()) {
            CartCrypto.deleteCookie(cookieName);
        }
    };

    const triggerViewCart = () => {
        // No longer used, since tracking is removed
    };

    const value = {
        cartItems,
        total,
        evPointTotal,
        itemCount,
        increaseQty,
        decreaseQty,
        formatCurrency,
        addToCart,
        removeItemById,
        clearCart,
        triggerViewCart,
        calculateTotalDiscount
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

CartProviderComponent.displayName = 'CartProvider';

export { CartProviderComponent as CartProvider, useFloatingCart };