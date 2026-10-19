// context/SearchContext.tsx
"use client";

import React, { createContext, useContext, useRef, ReactNode, RefObject } from 'react';

export interface SearchContextType {
    searchInputRef: RefObject<HTMLInputElement | null>;
    headerRef: RefObject<HTMLElement | null>;
    focusSearch: () => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const headerRef = useRef<HTMLElement | null>(null);

    const focusSearch = () => {
        if (headerRef.current && searchInputRef.current) {
            headerRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            setTimeout(() => {
                searchInputRef.current?.focus();
                searchInputRef.current?.classList.add('search-highlight');
                setTimeout(() => {
                    searchInputRef.current?.classList.remove('search-highlight');
                }, 1000);
            }, 500);
        }
    };

    return (
        <SearchContext.Provider value={{
            searchInputRef,
            headerRef,
            focusSearch
        }}>
            {children}
        </SearchContext.Provider>
    );
};

export const useSearch = (): SearchContextType => {
    const ctx = useContext(SearchContext);
    if (!ctx) {
        return {
            searchInputRef: { current: null },
            headerRef: { current: null },
            focusSearch: () => {},
        };
    }
    return ctx;
};
