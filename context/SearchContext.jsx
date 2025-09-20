"use client";

import { createContext, useContext, useRef } from 'react';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
    const searchInputRef = useRef(null);
    const headerRef = useRef(null);

    const focusSearch = () => {
        if (headerRef.current && searchInputRef.current) {
            // Scroll to header smoothly
            headerRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            // Focus the search input after a small delay to allow scrolling
            setTimeout(() => {
                searchInputRef.current.focus();
                // Add highlight effect
                searchInputRef.current.classList.add('search-highlight');
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

export const useSearch = () => useContext(SearchContext);