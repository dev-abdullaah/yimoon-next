// components/Header.jsx
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BASE_URL } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';
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

function Header() {
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [search, setSearch] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchResultsVisible, setSearchResultsVisible] = useState(false);
    const { itemCount, total, formatCurrency } = useFloatingCart();
    const searchRef = useRef(null);
    const { searchInputRef, headerRef } = useSearch();
    const categoryMenuRef = useRef(null);
    const categoryTriggerRef = useRef(null);
    const router = useRouter();
    const pathname = usePathname();
    const excludedPaths = ['/login', '/register'];

    // Use auth context to get user state
    const { user, isAuthenticated, logout, loading: authLoading } = useAuth();

    // Sticky header state
    const [isSticky, setSticky] = useState(false);

    // Mega menu states
    const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
    const [hoveredMainCategory, setHoveredMainCategory] = useState(null);
    const [hoveredSubCategory, setHoveredSubCategory] = useState(null);
    const [hoveredSubSubCategory, setHoveredSubSubCategory] = useState(null);

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

    // Search input change handler
    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setSearchResultsVisible(true);
    };

    const toTitleCase = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

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
            const scrollY = window.scrollY;
            const shouldBeSticky = scrollY > 0;

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

    // Fetch categories data with React Query caching
    const { data: categoriesData, isLoading, isError } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            // Use central token service to get or fetch token
            const token = await getOrFetchToken();
            if (!token) throw new Error("Authentication token not found");

            const timestamp = Math.floor(Date.now() / 1000);
            const formData = new FormData();
            formData.append('timestamp', timestamp.toString());
            formData.append('token', token);
            formData.append('com', 'DataExpert');
            formData.append('action', 'fetchFromCategorySet');
            formData.append('sourcename', 'invitemcat');
            formData.append('method', 'findAll');

            const response = await fetch(`${BASE_URL}/exchange`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            return await response.json();
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
        cacheTime: 1000 * 60 * 60, // 1 hour
        retry: 2, // Retry twice on failure
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    // Process categories data to build a tree structure
    const buildCategoryTree = (categories) => {
        if (!categories?.data?.data) return [];

        const categoryMap = {};
        const rootCategories = [];

        // First pass: create a map of all categories
        categories.data.data.forEach(category => {
            if (category && category.id) {
                categoryMap[category.id] = {
                    ...category,
                    children: []
                };
            }
        });

        // Second pass: build the tree structure
        categories.data.data.forEach(category => {
            if (!category) return;

            if (category.parentid === "0" || category.parentid === 0 || !category.parentid) {
                if (categoryMap[category.id]) {
                    rootCategories.push(categoryMap[category.id]);
                }
            } else {
                const parent = categoryMap[category.parentid];
                if (parent && categoryMap[category.id]) {
                    parent.children.push(categoryMap[category.id]);
                }
            }
        });

        return rootCategories;
    };

    // Handle category click
    const handleCategoryClick = (categoryId, categoryName) => {
        // In Next.js, we use router.push instead of navigate
        router.push(`/catalog?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}`);
    };

    const categoryTree = buildCategoryTree(categoriesData || []);

    const renderVerticalMenu = () => {
        return (
            <div
                ref={categoryMenuRef}
                className={`absolute top-full left-0 bg-white shadow-lg z-50 ${isCategoryMenuOpen ? 'block' : 'hidden'}`}
                onMouseEnter={() => setIsCategoryMenuOpen(true)}
                onMouseLeave={() => setIsCategoryMenuOpen(false)}
            >
                <div className="flex">
                    {/* Column 1: Main Categories */}
                    <div className="w-64 bg-white">
                        <ul className="p-2">
                            {categoryTree.map((mainCategory) => (
                                <li
                                    key={mainCategory.id}
                                    className="group h-[22.5px] overflow-hidden"
                                    onMouseEnter={() => {
                                        if (mainCategory.children.length > 0) {
                                            setHoveredMainCategory(mainCategory.id);
                                            setHoveredSubCategory(null);
                                            setHoveredSubSubCategory(null);
                                        } else {
                                            setHoveredMainCategory(null);
                                            setHoveredSubCategory(null);
                                            setHoveredSubSubCategory(null);
                                        }
                                    }}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleCategoryClick(mainCategory.id, mainCategory.title);
                                        }}
                                        className="flex justify-between items-center px-4 py-1 hover:bg-gray-50 rounded-md w-full h-full group-hover:text-primary"
                                    >
                                        <span className="text-gray-900 group-hover:text-primary truncate text-sm leading-tight">
                                            {toTitleCase(mainCategory.title)}
                                        </span>
                                        {mainCategory.children.length > 0 && (
                                            <ChevronRightIcon />
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 2: Subcategories */}
                    {hoveredMainCategory && categoryTree.find(cat => cat.id === hoveredMainCategory)?.children.length > 0 && (
                        <div className="w-64 bg-white shadow-md">
                            <ul className="p-2">
                                {categoryTree
                                    .find(cat => cat.id === hoveredMainCategory)
                                    ?.children
                                    .map((subCategory) => (
                                        <li
                                            key={subCategory.id}
                                            className="group h-[22.5px] overflow-hidden"
                                            onMouseEnter={() => {
                                                if (subCategory.children.length > 0) {
                                                    setHoveredSubCategory(subCategory.id);
                                                    setHoveredSubSubCategory(null);
                                                } else {
                                                    setHoveredSubCategory(null);
                                                    setHoveredSubSubCategory(null);
                                                }
                                            }}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleCategoryClick(subCategory.id, subCategory.title);
                                                }}
                                                className="flex justify-between items-center px-4 py-1 hover:bg-gray-50 rounded-md w-full h-full group-hover:text-primary"
                                            >
                                                <span className="text-gray-800 group-hover:text-primary truncate text-sm leading-tight">
                                                    {toTitleCase(subCategory.title)}
                                                </span>
                                                {subCategory.children.length > 0 && (
                                                    <ChevronRightIcon />
                                                )}
                                            </button>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    )}

                    {/* Column 3: Sub-subcategories */}
                    {hoveredSubCategory && categoryTree
                        .find(cat => cat.id === hoveredMainCategory)
                        ?.children
                        .find(subCat => subCat.id === hoveredSubCategory)
                        ?.children.length > 0 && (
                            <div className="w-64 bg-white shadow-md">
                                <ul className="p-2">
                                    {categoryTree
                                        .find(cat => cat.id === hoveredMainCategory)
                                        ?.children
                                        .find(subCat => subCat.id === hoveredSubCategory)
                                        ?.children
                                        .map((subSubCategory) => (
                                            <li
                                                key={subSubCategory.id}
                                                className="group h-[22.5px] overflow-hidden"
                                                onMouseEnter={() => {
                                                    if (subSubCategory.children.length > 0) {
                                                        setHoveredSubSubCategory(subSubCategory.id);
                                                    } else {
                                                        setHoveredSubSubCategory(null);
                                                    }
                                                }}
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleCategoryClick(subSubCategory.id, subSubCategory.title);
                                                    }}
                                                    className="flex justify-between items-center px-4 py-1 hover:bg-gray-50 rounded-md w-full h-full group-hover:text-primary"
                                                >
                                                    <span className="text-gray-700 group-hover:text-primary truncate text-sm leading-tight">
                                                        {toTitleCase(subSubCategory.title)}
                                                    </span>
                                                    {subSubCategory.children.length > 0 && (
                                                        <ChevronRightIcon />
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        )}

                    {/* Column 4: Leaf categories */}
                    {hoveredSubSubCategory && categoryTree
                        .find(cat => cat.id === hoveredMainCategory)
                        ?.children
                        .find(subCat => subCat.id === hoveredSubCategory)
                        ?.children
                        .find(subSubCat => subSubCat.id === hoveredSubSubCategory)
                        ?.children.length > 0 && (
                            <div className="w-64 bg-white shadow-md">
                                <ul className="p-2">
                                    {categoryTree
                                        .find(cat => cat.id === hoveredMainCategory)
                                        ?.children
                                        .find(subCat => subCat.id === hoveredSubCategory)
                                        ?.children
                                        .find(subSubCat => subSubCat.id === hoveredSubSubCategory)
                                        ?.children
                                        .map((leafCategory) => (
                                            <li key={leafCategory.id} className="h-[22.5px] overflow-hidden">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleCategoryClick(leafCategory.id, leafCategory.title);
                                                    }}
                                                    className="flex justify-between items-center px-4 py-1 hover:bg-gray-50 hover:text-primary rounded-md w-full h-full text-sm leading-tight"
                                                >
                                                    <span className="hover:text-primary">
                                                        {toTitleCase(leafCategory.title)}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        )}
                </div>
            </div>
        );
    };

    // Handle logout
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
                            <img
                                src="/resources/images/logo.png"
                                alt="Logo"
                                style={{ width: 160, height: 45, borderRadius: 7 }}
                            />
                        </Link>
                    </div>
                </div>

                <div className="hidden w-full sm:block lg:basis-2/4" ref={searchRef}>
                    <form autoComplete="off" className="text-dark relative flex w-full items-center gap-3 rounded-md border border-primary">
                        <label htmlFor="search-input" className="sr-only">Search</label>
                        <input
                            id="search-input"
                            type="search"
                            placeholder="I'm shopping for ..."
                            className="mx-3 w-full shrink bg-white py-1 text-sm outline-none lg:py-1.5"
                            name="search"
                            value={search}
                            onChange={handleSearchChange}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            ref={searchInputRef}
                        />
                        <button
                            aria-label="search"
                            className="bg-primary m-0.5 flex-none rounded-md text-lg text-white"
                            type="submit"
                            title="search"
                        >
                            <SearchRedLgIcon />
                        </button>
                        {search && searchResultsVisible && (
                            <SearchAjax query={search} />
                        )}
                    </form>
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
                                        <form autoComplete="off" className="text-dark relative flex w-full items-center gap-3 rounded-md border border-primary">
                                            <label htmlFor="mobile-search-input" className="sr-only">Search</label>
                                            <input
                                                id="mobile-search-input"
                                                placeholder="I'm shopping for ..."
                                                className="mx-3 w-full shrink bg-white py-1 text-sm outline-none"
                                                type="search"
                                                name="search"
                                                value={search}
                                                onChange={handleSearchChange}
                                                onFocus={() => setSearchFocused(true)}
                                                onBlur={() => setSearchFocused(false)}
                                                ref={searchInputRef}
                                                autoFocus
                                            />
                                            <button aria-label="search" className="bg-primary m-0.5 flex-none rounded-md text-lg text-white" type="submit">
                                                <SearchRedIcon />
                                            </button>
                                        </form>

                                        {search && searchResultsVisible && (
                                            <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-b-md z-50 mt-1" style={{ maxHeight: '60vh' }}>
                                                <SearchAjax
                                                    query={search}
                                                    isMobile={true}
                                                    onProductSelect={() => setShowMobileSearch(false)}
                                                />
                                            </div>
                                        )}
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

                        <div className="flex items-center gap-2 group relative">
                            <img
                                alt="User Avatar"
                                src={isAuthenticated && user ? "/resources/media/default_user.svg" : "/resources/media/default_user.svg"}
                                className="rounded-full aspect-square"
                                width="40"
                                height="40"
                                loading="lazy"
                            />

                            {!isAuthenticated ? (
                                <div className="flex flex-col">
                                    <Link href="/login" className="text-primary text-sm font-bold">Login</Link>
                                    <Link href="/register" className="text-primary text-sm font-bold">Register</Link>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col items-start">
                                        <span className="text-primary w-[110px] truncate text-sm font-bold capitalize">
                                            {user ? `${user.fname} ${user.lname}` : 'User'}
                                        </span>
                                    </div>
                                    {/* Invisible hover bridge */}
                                    <div className="absolute top-full right-0 h-4 min-w-[200px] group-hover:block hidden z-40"></div>
                                    <div>
                                        <ul className="text-light-ash absolute top-12 right-0 min-w-[200px] space-y-3 rounded-md bg-white p-4 text-sm font-medium whitespace-nowrap shadow-md hidden group-hover:block">
                                            <li><Link href="/dashboard" className="hover:text-primary hover:underline">Dashboard</Link></li>
                                            <li><Link href="javascript:void()" className="hover:text-primary hover:underline">My Orders</Link></li>
                                            <li><Link href="javascript:void()" className="hover:text-primary hover:underline">Order Tracking</Link></li>
                                            <li><Link href="javascript:void()" className="hover:text-primary hover:underline">Account Information</Link></li>
                                            <li><hr className="text-light-white mt-3" /></li>
                                            <li><button className="text-danger ring-inset" onClick={handleLogout}>Logout</button></li>
                                        </ul>
                                    </div>
                                </>
                            )}
                        </div>

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
                    {renderVerticalMenu()}
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

export default Header;