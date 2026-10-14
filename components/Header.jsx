// components/Header.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/lib/api';
import { buildCategoryTree } from '@/lib/categoryTree';
import { getCategoryRelativeUrl } from '@/utils/urlHelper';
import { useSearch } from '@/context/SearchContext';
import { useFloatingCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import CartDropdown from '@/components/CartDropdown';
import SearchAjax from '@/components/SearchAjax';
import MenuIcon from '@/components/Icons/MenuIcon';
import OutletsIcon from '@/components/Icons/OutletsIcon';
import CartIcon from '@/components/Icons/CartIcon';
import SearchIcon from '@/components/Icons/SearchIcon';
import SearchRedIcon from '@/components/Icons/SearchRedIcon';
import SearchRedLgIcon from '@/components/Icons/SearchRedLgIcon';
import ChevronRightIcon from '@/components/Icons/ChevronRightIcon';
import ChevronLeftIcon from '@/components/Icons/ChevronLeftIcon';

/**
 * The storefront header.
 *
 * The category menu is the one place every shopper passes through, so it is
 * built from the catalogue's own tree rather than a hard-coded list. The API
 * already returns the categories in parent-before-child order, so the tree is
 * assembled in a single pass with no recursive lookups — see `buildTree`.
 *
 * The four-column menu shows one level of the tree per column, hovering to
 * descend. A column shows a node's own children, and the child that is currently
 * hovered is remembered, so the menu reads as a drill-down rather than a list
 * that has to be opened one level at a time.
 */
function Header() {
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [search, setSearch] = useState('');
    const [searchResultsVisible, setSearchResultsVisible] = useState(false);
    const { itemCount } = useFloatingCart();
    const searchRef = useRef(null);
    const { searchInputRef, headerRef } = useSearch();
    const categoryMenuRef = useRef(null);
    const categoryTriggerRef = useRef(null);
    const router = useRouter();
    const pathname = usePathname();

    const { user, isAuthenticated, logout, loading: authLoading } = useAuth();

    // Sticky header state
    const [isSticky, setSticky] = useState(false);

    // Mega menu states
    const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
    const [hoveredIds, setHoveredIds] = useState([]);

    const excludedPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

    // Close search results on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchResultsVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Prevent body scrolling when mobile search is open
    useEffect(() => {
        if (showMobileSearch) {
            document.body.classList.add('search-modal-open');
            // Focus search input when modal opens
            if (searchInputRef.current) {
                setTimeout(() => searchInputRef.current.focus(), 100);
            }
        } else {
            document.body.classList.remove('search-modal-open');
        }

        return () => {
            document.body.classList.remove('search-modal-open');
        };
    }, [showMobileSearch]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
                if (categoryTriggerRef.current && !categoryTriggerRef.current.contains(event.target)) {
                    setIsCategoryMenuOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Single scroll handler for sticky header
    useEffect(() => {
        const handleScroll = () => {
            const shouldBeSticky = window.scrollY > 0;

            // Exit early if current route should be excluded
            if (excludedPaths.includes(pathname)) {
                document.body.style.paddingTop = '0';
                return;
            }

            if (shouldBeSticky !== isSticky) {
                setSticky(shouldBeSticky);

                if (shouldBeSticky) {
                    const headerHeight = headerRef.current?.offsetHeight || 0;
                    document.body.style.paddingTop = `${headerHeight}px`;
                    headerRef.current?.classList.add('sticky-header');
                } else {
                    document.body.style.paddingTop = '0';
                    headerRef.current?.classList.remove('sticky-header');
                }
            }
        };

        // Initial call to apply correct state
        handleScroll();

        window.addEventListener('scroll', handleScroll);

    }, [isSticky, headerRef, pathname]);

    const { data: categoriesData, isLoading: categoriesLoading, isError: categoriesError } = useQuery({
        queryKey: ['categories'],
        queryFn: () => catalogApi.getCategories(),
        staleTime: 1000 * 60 * 30, // 30 minutes
        retry: 1,
    });

    const categoryTree = buildCategoryTree(categoriesData?.data ?? []);

    // The chain of hovered nodes, one per column. Reset whenever the menu closes
    // so it reopens at the top level rather than remembering the last category
    // the shopper happened to be looking at.
    useEffect(() => {
        if (!isCategoryMenuOpen) setHoveredIds([]);
    }, [isCategoryMenuOpen]);

    const descend = (depth, id) => {
        setHoveredIds((current) => {
            const next = current.slice(0, depth);

            // Hovering the same row twice should collapse it, not toggle — a
            // menu that re-opens a column on a second pass feels broken.
            if (next[depth] === id) return next.slice(0, depth);

            next[depth] = id;
            return next;
        });
    };

    /**
     * The columns, each containing the children of the node hovered in the previous column.
     * Stops descending once a leaf node (with no children) is reached to prevent empty trailing columns.
     */
    const columns = (() => {
        const result = [categoryTree];
        let level = categoryTree;

        for (const id of hoveredIds) {
            const parent = level.find((node) => node.id === id);

            if (!parent || !Array.isArray(parent.children) || parent.children.length === 0) break;

            level = parent.children;
            result.push(level);
        }

        return result;
    })();

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <div ref={headerRef} className="sticky top-0 z-30 mb-2 w-full bg-white shadow-sm sm:shadow-xs lg:mb-3">
            <div className="container mx-auto flex items-center justify-between gap-5 px-5 py-1 sm:py-2 md:gap-12 md:px-7 md:py-4 lg:px-12">
                <div className="lg:basis-1/4">
                    <div className="flex items-center">
                        <Link href="/">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/resources/images/logo.png"
                                alt="Yi Moon"
                                style={{ width: 160, height: 45, borderRadius: 7 }}
                            />
                        </Link>
                    </div>
                </div>

                <div className="hidden w-full sm:block lg:basis-2/4" ref={searchRef}>
                    <SearchForm
                        id="search-input"
                        value={search}
                        onChange={(value) => {
                            setSearch(value);
                            setSearchResultsVisible(true);
                        }}
                        inputRef={searchInputRef}
                        icon={<SearchRedLgIcon />}
                    >
                        {search && searchResultsVisible && <SearchAjax query={search} />}
                    </SearchForm>
                </div>

                <div className="flex items-center gap-5">
                    {/* Mobile search modal */}
                    {showMobileSearch && (
                        <div className="md:hidden fixed inset-0 z-50 bg-white">
                            <div className="container mx-auto px-5 pb-2 min-h-screen w-full">
                                <div className="my-3 w-full">
                                    <button type="button" className="flex items-center mb-5 text-primary" onClick={() => setShowMobileSearch(false)}>
                                        <ChevronLeftIcon/>
                                        Back
                                    </button>

                                    <div className="relative" ref={searchRef}>
                                        <SearchForm
                                            id="mobile-search-input"
                                            value={search}
                                            onChange={(value) => {
                                                setSearch(value);
                                                setSearchResultsVisible(true);
                                            }}
                                            inputRef={searchInputRef}
                                            icon={<SearchRedIcon />}
                                            autoFocus
                                        >
                                            {search && searchResultsVisible && (
                                                <div
                                                    className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-b-md z-50 mt-1"
                                                    style={{ maxHeight: '60vh' }}
                                                >
                                                    <SearchAjax
                                                        query={search}
                                                        isMobile={true}
                                                        onProductSelect={() => setShowMobileSearch(false)}
                                                    />
                                                </div>
                                            )}
                                        </SearchForm>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile search button on the right */}
                <div className="flex items-center justify-end lg:basis-1/4">
                    <button
                        type="button"
                        aria-label="search"
                        onClick={() => setShowMobileSearch(true)}
                        className="md:hidden mr-4"
                    >
                        <SearchIcon />
                    </button>

                    {/* Desktop cart and login section */}
                    <div className="hidden lg:flex items-center gap-8 ml-auto">
                        <div className="relative group">
                            <Link href="/cart" aria-label="View your cart">
                                <CartIcon />
                                {itemCount > 0 && (
                                    <p className="bg-blue-primary absolute -top-2 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white">
                                        {itemCount}
                                    </p>
                                )}
                            </Link>

                            {/* Invisible hover bridge */}
                            <div className="absolute top-full right-0 h-4 w-[515px] group-hover:block hidden z-40"></div>

                            {/* Dropdown */}
                            <div className="absolute top-full mt-3 right-0 hidden w-[515px] bg-white shadow-2xl group-hover:block z-50">
                                <CartDropdown />
                            </div>
                        </div>

                        <AccountMenu
                            user={user}
                            isAuthenticated={isAuthenticated}
                            authLoading={authLoading}
                            onLogout={handleLogout}
                        />
                    </div>
                </div>
            </div>

            <div className="border-light-white container mx-auto flex items-center justify-between gap-5 border-y-2 px-5 py-1.5 md:gap-12 md:px-7 md:py-3 lg:h-[59.5px] lg:px-12">
                {/* Category Menu with Hover Functionality */}
                <div className="relative hidden lg:block" ref={categoryTriggerRef}>
                    <div
                        className="text-primary flex cursor-pointer list-none items-center text-base font-bold"
                        onMouseEnter={() => setIsCategoryMenuOpen(true)}
                        onMouseLeave={() => setTimeout(() => {
                            if (!categoryMenuRef.current?.matches(':hover')) {
                                setIsCategoryMenuOpen(false);
                            }
                        }, 100)}
                    >
                        <MenuIcon />
                        <span className="whitespace-nowrap">Shop By Category</span>
                    </div>

                    {/* Add a small invisible gap between trigger and menu */}
                    <div className="absolute top-full left-0 h-2 w-full"></div>

                    {/* Mega menu */}
                    <div
                        ref={categoryMenuRef}
                        className={`absolute top-full left-0 bg-white shadow-lg z-50 ${isCategoryMenuOpen ? 'block' : 'hidden'}`}
                        onMouseEnter={() => setIsCategoryMenuOpen(true)}
                        onMouseLeave={() => setTimeout(() => {
                            if (!categoryMenuRef.current?.matches(':hover')) {
                                setIsCategoryMenuOpen(false);
                            }
                        }, 100)}
                    >
                        {categoriesLoading && (
                            <p className="text-gray p-4 text-sm">Loading categories…</p>
                        )}

                        {!categoriesLoading && categoriesError && (
                            <p className="text-gray p-4 text-sm">
                                Categories could not be loaded. Browse the{' '}
                                <Link href="/catalog" className="text-primary hover:underline">
                                    full catalogue
                                </Link>{' '}
                                instead.
                            </p>
                        )}

                        {!categoriesLoading && !categoriesError && columns.every((column) => column.length === 0) && (
                            <p className="text-gray p-4 text-sm">No categories yet.</p>
                        )}

                        <div className="flex">
                            {columns.filter((column) => column && column.length > 0).map((column, depth) => (
                                <div key={depth} className="w-64 bg-white shadow-md">
                                    <ul className="p-2">
                                        {column.map((category) => {
                                            const isLast = !category.children || category.children.length === 0;

                                            return (
                                                <li
                                                    key={category.id}
                                                    className="group h-[22.5px] overflow-hidden"
                                                    onMouseEnter={() => {
                                                        if (category.children && category.children.length > 0) {
                                                            descend(depth, category.id);
                                                        } else {
                                                            setHoveredIds((current) => current.slice(0, depth));
                                                        }
                                                    }}
                                                >
                                                    <Link
                                                        href={getCategoryRelativeUrl(category)}
                                                        className="flex justify-between items-center px-4 py-1 hover:bg-gray-50 rounded-md w-full h-full group-hover:text-primary"
                                                    >
                                                        <span className="text-gray-900 group-hover:text-primary truncate text-sm leading-tight">
                                                            {category.name}
                                                        </span>
                                                        {!isLast && <ChevronRightIcon />}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="hidden lg:block">
                    <Link href="/outlets" className="text-primary group hover:text-light-warning flex gap-1.5 font-semibold">
                        <OutletsIcon />
                        <span className="whitespace-nowrap">Outlets</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

/** The search box, shared by the desktop bar and the mobile overlay. */
function SearchForm({ id, value, onChange, inputRef, icon, autoFocus, children }) {
    return (
        <form
            autoComplete="off"
            className="text-dark relative flex w-full items-center gap-3 rounded-md border border-primary"
            // A real GET, so the results page is a working URL: a shopper can
            // reload it, bookmark it, or send it to someone else.
            action="/catalog"
            method="get"
        >
            <label htmlFor={id} className="sr-only">Search</label>
            <input
                id={id}
                type="search"
                placeholder="I'm shopping for ..."
                className="mx-3 w-full shrink bg-white py-1 text-sm outline-none lg:py-1.5"
                name="q"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                ref={inputRef}
                autoFocus={autoFocus}
            />
            <button
                aria-label="search"
                className="bg-primary m-0.5 flex-none rounded-md text-lg text-white"
                type="submit"
                title="search"
            >
                {icon}
            </button>
            {children}
        </form>
    );
}

/** The signed-in / signed-out account dropdown. */
function AccountMenu({ user, isAuthenticated, authLoading, onLogout }) {
    return (
        <div className="flex items-center gap-2 group relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                alt="Your account"
                src="/resources/media/default_user.svg"
                className="rounded-full aspect-square"
                width="40"
                height="40"
                loading="lazy"
            />

            {!authLoading && !isAuthenticated ? (
                <div className="flex flex-col">
                    <Link href="/login" className="text-primary text-sm font-bold">Login</Link>
                    <Link href="/register" className="text-primary text-sm font-bold">Register</Link>
                </div>
            ) : (
                isAuthenticated && (
                    <>
                        <div className="flex flex-col items-start">
                            <span className="text-primary w-[110px] truncate text-sm font-bold capitalize">
                                {user?.name ?? 'Your account'}
                            </span>
                        </div>
                        {/* Invisible hover bridge */}
                        <div className="absolute top-full right-0 h-4 min-w-[200px] group-hover:block hidden z-40"></div>
                        <div>
                            <ul className="text-light-ash absolute top-12 right-0 min-w-[200px] space-y-3 rounded-md bg-white p-4 text-sm font-medium whitespace-nowrap shadow-md hidden group-hover:block">
                                <li><Link href="/dashboard" className="hover:text-primary hover:underline">Dashboard</Link></li>
                                <li><Link href="/dashboard?section=orders" className="hover:text-primary hover:underline">My Orders</Link></li>
                                <li><Link href="/dashboard?section=tracking" className="hover:text-primary hover:underline">Order Tracking</Link></li>
                                <li><Link href="/dashboard?section=profile" className="hover:text-primary hover:underline">Account Information</Link></li>
                                <li><hr className="text-light-white mt-3" /></li>
                                <li><button className="text-danger ring-inset" onClick={onLogout}>Logout</button></li>
                            </ul>
                        </div>
                    </>
                )
            )}
        </div>
    );
}

export default Header;
