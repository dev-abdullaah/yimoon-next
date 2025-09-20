// components/MobileNav.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { BASE_URL } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';

const MobileNav = () => {
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [openCategories, setOpenCategories] = useState({});
    const accountDrawerRef = useRef(null);
    const categoryDrawerRef = useRef(null);
    const router = useRouter();
    const pathname = usePathname();

    // Use auth context to get user state
    const { user, isAuthenticated, logout } = useAuth();

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

    const categoryTree = buildCategoryTree(categoriesData || []);

    // Close on outside click for both drawers
    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                isAccountOpen &&
                accountDrawerRef.current &&
                !accountDrawerRef.current.contains(event.target)
            ) {
                setIsAccountOpen(false);
            }

            if (
                isCategoryOpen &&
                categoryDrawerRef.current &&
                !categoryDrawerRef.current.contains(event.target)
            ) {
                setIsCategoryOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isAccountOpen, isCategoryOpen]);

    useEffect(() => {
        if (isAccountOpen || isCategoryOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isAccountOpen, isCategoryOpen]);

    const toggleAccountMenu = () => setIsAccountOpen(prev => !prev);
    const closeAccountMenu = () => setIsAccountOpen(false);

    const toggleCategoryMenu = () => {
        setIsCategoryOpen(prev => !prev);
        // Reset open categories when closing the menu
        if (isCategoryOpen) {
            setOpenCategories({});
        }
    };
    const closeCategoryMenu = () => setIsCategoryOpen(false);

    // Toggle category open/closed state
    const toggleCategory = (categoryId) => {
        setOpenCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    // Handle category click
    const handleCategoryClick = (categoryId, categoryName) => {
        router.push(`/catalog?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}`);
        closeCategoryMenu();
    };

    // Handle logout
    const handleLogout = () => {
        logout();
        closeAccountMenu();
    };

    const toTitleCase = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Recursive function to render category tree
    const renderCategoryTree = (categories, level = 0) => {
        if (!categories || categories.length === 0) return null;

        return categories.map((category) => (
            <ul key={category.id}>
                <button
                    type="button"
                    className="w-full hover:text-primary flex justify-between items-center px-5"
                    onClick={() => {
                        if (category.children && category.children.length > 0) {
                            toggleCategory(category.id);
                        } else {
                            handleCategoryClick(category.id, category.title);
                        }
                    }}
                >
                    <span>{toTitleCase(category.title)}</span>
                    {category.children && category.children.length > 0 && (
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            className={`w-3.5 h-3.5 transition-transform duration-300 ${openCategories[category.id] ? 'rotate-0' : '-rotate-90'}`}
                            fill="none"
                            strokeWidth="2"
                            stroke="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    )}
                </button>
                {category.children && category.children.length > 0 && (
                    <div className={`space-y-4 h-auto ml-5 mt-4 ${openCategories[category.id] ? 'block' : 'hidden'}`}>
                        {renderCategoryTree(category.children, level + 1)}
                    </div>
                )}
            </ul>
        ));
    };

    // Custom NavLink component for Next.js
    const NavLink = ({ href, children, className, onClick }) => {
        const isActive = pathname === href;
        const combinedClassName = className(isActive);

        return (
            <Link href={href} className={combinedClassName} onClick={onClick}>
                {children}
            </Link>
        );
    };

    return (
        <div className="lg:hidden">
            <ul
                className="bg-white z-30 capitalize whitespace-nowrap fixed bottom-0 w-full h-16 px-5 sm:px-8 md:px-12 flex justify-between xs:justify-evenly text-xs font-semibold text-light-ash"
                style={{ boxShadow: 'rgba(0, 0, 0, 0.2) 5px 0px 10px 0px' }}
            >
                <li className="my-2 md:my-3">
                    <NavLink
                        href="/"
                        aria-label="Go To Home Page"
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-1 transition-all duration-300 ease-in-out ${isActive ? 'text-primary' : 'hover:text-primary'
                            }`
                        }
                    >
                        {/* SVG for Home */}
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 22 22"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M0.916748 10.322C0.916748 11.7587 2.31234 11.5125 3.46167 11.5125V20.0093C3.46167 20.3787 3.87207 20.5839 4.28254 20.5839H8.96201C9.15069 20.6308 9.34793 20.6308 9.53661 20.5839C9.6732 20.4702 9.7614 20.3088 9.78301 20.1324V14.8373H12.7794V20.0503C12.7794 20.4197 13.1488 20.625 13.5593 20.625H18.2388C18.6903 20.625 19.0596 20.6249 19.0596 20.0503V11.5535H20.5374C20.8068 11.5543 21.0665 11.4532 21.2645 11.2704C21.4624 11.0877 21.5838 10.8369 21.6046 10.5683C21.6046 9.78842 21.2352 9.66534 20.5374 8.96753L12.3279 1.62001C11.0144 0.306492 10.604 1.08642 9.65987 1.90737L1.45038 9.2549C1.40934 9.46013 0.916748 9.91157 0.916748 10.322Z"
                            />
                        </svg>
                        Home
                    </NavLink>
                </li>
                <li className="my-2 md:my-3">
                    <button
                        onClick={toggleCategoryMenu}
                        className="hover:text-primary flex flex-col items-center gap-1 transition-all duration-300 ease-in-out"
                        aria-label="Categories Menu Open"
                    >
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 22 22"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M3.53999 1H6.91997C8.32996 1 9.45996 2.14999 9.45996 3.56099V6.96997C9.45996 8.38997 8.32996 9.52996 6.91997 9.52996H3.53999C2.13999 9.52996 1 8.38997 1 6.96997V3.56099C1 2.14999 2.13999 1 3.53999 1ZM3.53999 12.4696H6.91997C8.32996 12.4696 9.45996 13.6106 9.45996 15.0306V18.4396C9.45996 19.8496 8.32996 20.9996 6.91997 20.9996H3.53999C2.13999 20.9996 1 19.8496 1 18.4396V15.0306C1 13.6106 2.13999 12.4696 3.53999 12.4696ZM18.4601 1H15.0802C13.6702 1 12.5402 2.14999 12.5402 3.56099V6.96997C12.5402 8.38997 13.6702 9.52996 15.0802 9.52996H18.4601C19.8601 9.52996 21.0001 8.38997 21.0001 6.96997V3.56099C21.0001 2.14999 19.8601 1 18.4601 1ZM15.0802 12.4696H18.4601C19.8601 12.4696 21.0001 13.6106 21.0001 15.0306V18.4396C21.0001 19.8496 19.8601 20.9996 18.4601 20.9996H15.0802C13.6702 20.9996 12.5402 19.8496 12.5402 18.4396V15.0306C12.5402 13.6106 13.6702 12.4696 15.0802 12.4696Z"
                            />
                        </svg>
                        Category
                    </button>
                </li>
                <li className="my-2 md:my-3">
                    <NavLink
                        href="/cart"
                        aria-label="Go To Cart Page"
                        className={({ isActive }) =>
                            `relative flex flex-col items-center gap-1 transition-all duration-300 ease-in-out ${isActive ? 'text-primary' : 'hover:text-primary'
                            }`
                        }
                    >
                        {/* SVG for Cart */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="23"
                            height="22"
                            viewBox="0 0 23 22"
                            fill="currentColor"
                        >
                            <path
                                d="M21.4863 2.88162C21.648 2.96863 21.7907 3.0955 21.904 3.25302C22.0177 3.41027 22.0993 3.59426 22.1428 3.79173C22.1864 3.98919 22.1909 4.19518 22.1559 4.39484L20.7048 12.6448C20.6493 12.9564 20.5008 13.2366 20.2845 13.438C20.0681 13.6394 19.7973 13.7496 19.5177 13.75H7.34141L7.62559 15.5833H19.8482C20.062 15.5833 20.2671 15.6799 20.4183 15.8518C20.5695 16.0237 20.6544 16.2569 20.6544 16.5C20.6544 16.7431 20.5695 16.9763 20.4183 17.1482C20.2671 17.3201 20.062 17.4167 19.8482 17.4167H6.94941C6.75986 17.4167 6.57636 17.3408 6.43114 17.2023C6.28591 17.0638 6.18826 16.8715 6.15533 16.6593L3.8547 1.83333H1.30618C1.09236 1.83333 0.887311 1.73676 0.736124 1.56485C0.584936 1.39294 0.5 1.15978 0.5 0.916667C0.5 0.673552 0.584936 0.440394 0.736124 0.268486C0.887311 0.0965773 1.09236 2.02334e-08 1.30618 2.02334e-08H4.53088C4.72043 -4.52434e-05 4.90393 0.0758543 5.04915 0.214367C5.19438 0.352879 5.29203 0.545147 5.32496 0.757396L5.63383 2.75H20.9688C21.1478 2.74965 21.3245 2.79461 21.4863 2.88162ZM7.83333 22C8.84586 22 9.66667 21.1792 9.66667 20.1667C9.66667 19.1541 8.84586 18.3333 7.83333 18.3333C6.82081 18.3333 6 19.1541 6 20.1667C6 21.1792 6.82081 22 7.83333 22ZM18.8333 22C19.8459 22 20.6667 21.1792 20.6667 20.1667C20.6667 19.1541 19.8459 18.3333 18.8333 18.3333C17.8208 18.3333 17 19.1541 17 20.1667C17 21.1792 17.8208 22 18.8333 22Z"
                            />
                        </svg>
                        Cart
                    </NavLink>
                </li>
                <li className="my-2 md:my-3">
                    <button
                        onClick={toggleAccountMenu}
                        className="hover:text-primary flex flex-col items-center gap-1 transition-all duration-300 ease-in-out"
                        aria-label="User Account Menu Open"
                    >
                        <svg
                            width="23"
                            height="22"
                            viewBox="0 0 23 22"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M2.33325 20.159V20.5792C2.35049 20.7068 2.40908 20.8253 2.50013 20.9164C2.59117 21.0075 2.70962 21.0661 2.83721 21.0833H19.6366C19.7671 21.0736 19.8897 21.0174 19.9822 20.9249C20.0747 20.8323 20.1309 20.7097 20.1406 20.5792C20.1599 18.4966 19.3606 16.4899 17.9148 14.9914L16.9069 14.151C15.3016 13.224 13.4933 12.7049 11.6409 12.639C9.78851 12.5731 7.94825 12.9624 6.28113 13.7729C4.92833 14.5709 3.84581 15.7563 3.17327 17.1761C2.68217 18.0984 2.39562 19.1158 2.33325 20.159Z"
                            />
                            <path
                                d="M5.90345 5.95826C5.83417 7.00197 6.08306 8.04222 6.61735 8.94135C6.80138 9.26387 7.02723 9.56052 7.28921 9.82361C7.63599 10.2255 8.04785 10.5663 8.50734 10.8319C9.39634 11.3488 10.4149 11.5999 11.4422 11.5552C12.4694 11.5105 13.4624 11.1719 14.3032 10.5798L14.639 10.2857L14.975 9.9917L15.269 9.65552C15.9179 8.89957 16.3403 7.97584 16.4877 6.99041C16.6351 6.00498 16.5016 4.99788 16.1024 4.08502C15.7032 3.17216 15.0544 2.39057 14.2309 1.83007C13.4074 1.26958 12.4424 0.952987 11.447 0.916656H10.9013C9.595 0.997273 8.3638 1.55549 7.44225 2.48513C6.52069 3.41477 5.9731 4.65087 5.90345 5.95826Z"
                            />
                        </svg>
                        Account
                    </button>
                </li>
            </ul>

            {/* Category Menu Panel */}
            <div
                className={`z-[100] fixed inset-0 w-screen bg-black/70 transition-all duration-700 ${isCategoryOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
            >
                <div
                    ref={categoryDrawerRef}
                    className={`absolute top-0 left-0 bg-white shadow-md sm:w-96 transition-all duration-700 transform ${isCategoryOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <div className="flex justify-between bg-primary py-2.5 px-4">
                        <h3 className="text-white text-lg font-semibold">All Categories</h3>
                        <button
                            type="button"
                            aria-label="close-slide-menubar"
                            onClick={closeCategoryMenu}
                        >
                            <svg width="32" height="32" viewBox="0 0 32 32" className="fill-white" fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd"
                                    d="M10.2265 2.66553H21.7865C26.3065 2.66553 29.3332 5.83886 29.3332 10.5589V21.4535C29.3332 26.1602 26.3065 29.3322 21.7865 29.3322H10.2265C5.7065 29.3322 2.6665 26.1602 2.6665 21.4535V10.5589C2.6665 5.83886 5.7065 2.66553 10.2265 2.66553ZM20.0132 19.9989C20.4665 19.5469 20.4665 18.8135 20.0132 18.3602L17.6398 15.9869L20.0132 13.6122C20.4665 13.1602 20.4665 12.4135 20.0132 11.9602C19.5598 11.5055 18.8265 11.5055 18.3598 11.9602L15.9998 14.3322L13.6265 11.9602C13.1598 11.5055 12.4265 11.5055 11.9732 11.9602C11.5198 12.4135 11.5198 13.1602 11.9732 13.6122L14.3465 15.9869L11.9732 18.3469C11.5198 18.8135 11.5198 19.5469 11.9732 19.9989C12.1998 20.2255 12.5065 20.3469 12.7998 20.3469C13.1065 20.3469 13.3998 20.2255 13.6265 19.9989L15.9998 17.6402L18.3732 19.9989C18.5998 20.2402 18.8932 20.3469 19.1865 20.3469C19.4932 20.3469 19.7865 20.2255 20.0132 19.9989Z" />
                            </svg>
                        </button>
                    </div>
                    <div>
                        <div className="h-[calc(100vh-70px)] relative mt-4 text-[15px] space-y-2 w-72 sm:w-80">
                            {isLoading ? (
                                <div className="px-5 py-2">Loading categories...</div>
                            ) : isError ? (
                                <div className="px-5 py-2">Error loading categories</div>
                            ) : (
                                renderCategoryTree(categoryTree)
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Menu Panel */}
            <div
                className={`z-[100] fixed inset-0 w-screen bg-black/70 transition-all duration-700 ${isAccountOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                    }`}
            >
                {isAuthenticated ? (
                    // Logged-in user account drawer
                    <div
                        ref={accountDrawerRef}
                        className={`absolute top-0 left-0 bg-white shadow-md sm:w-96 transition-all duration-700 transform ${isAccountOpen ? 'translate-x-0' : '-translate-x-full'
                            }`}
                    >
                        <div className="flex justify-between bg-primary py-2.5 px-4">
                            <h3 className="text-white text-lg font-semibold">My Account</h3>
                            <button
                                type="button"
                                aria-label="close-slide-menubar"
                                onClick={closeAccountMenu}
                            >
                                <svg
                                    width="32"
                                    height="32"
                                    viewBox="0 0 32 32"
                                    className="fill-white"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                        d="M10.2265 2.66553H21.7865C26.3065 2.66553 29.3332 5.83886 29.3332 10.5589V21.4535C29.3332 26.1602 26.3065 29.3322 21.7865 29.3322H10.2265C5.7065 29.3322 2.6665 26.1602 2.6665 21.4535V10.5589C2.6665 5.83886 5.7065 2.66553 10.2265 2.66553ZM20.0132 19.9989C20.4665 19.5469 20.4665 18.8135 20.0132 18.3602L17.6398 15.9869L20.0132 13.6122C20.4665 13.1602 20.4665 12.4135 20.0132 11.9602C19.5598 11.5055 18.8265 11.5055 18.3598 11.9602L15.9998 14.3322L13.6265 11.9602C13.1598 11.5055 12.4265 11.5055 11.9732 11.9602C11.5198 12.4135 11.5198 13.1602 11.9732 13.6122L14.3465 15.9869L11.9732 18.3469C11.5198 18.8135 11.5198 19.5469 11.9732 19.9989C12.1998 20.2255 12.5065 20.3469 12.7998 20.3469C13.1065 20.3469 13.3998 20.2255 13.6265 19.9989L15.9998 17.6402L18.3732 19.9989C18.5998 20.2402 18.8932 20.3469 19.1865 20.3469C19.4932 20.3469 19.7865 20.2255 20.0132 19.9989Z"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div>
                            <div className="h-[calc(100vh-70px)] relative mt-4 text-[15px] space-y-4 w-72 sm:w-80">
                                <div className="flex flex-col justify-center text-center items-center px-4 py-4 rounded-full stroke-dark-ash">
                                    <div className="border border-dark-ash rounded-full">
                                        <img
                                            alt="User Profile"
                                            loading="lazy"
                                            width="55"
                                            height="55"
                                            decoding="async"
                                            className="rounded-full m-1"
                                            src="/resources/media/default_user.svg"
                                            style={{ color: 'transparent' }}
                                        />
                                    </div>
                                    <p className="mt-1 md:text-lg font-semibold text-dark capitalize w-[150px] truncate">
                                        {user ? `${user.fname} ${user.lname}` : 'User'}
                                    </p>
                                </div>
                                <hr />
                                <ul className="space-y-1 my-2.5 capitalize">
                                    <li className="py-2 hover:bg-[#FAFAFA] px-5 border-l-4 border-transparent hover:border-primary text-dark-ash hover:text-dark group">
                                        <Link className="flex items-center gap-2" href="/dashboard" onClick={closeAccountMenu}>
                                            Dashboard
                                        </Link>
                                    </li>
                                    <li className="py-2 hover:bg-[#FAFAFA] px-5 border-l-4 border-transparent hover:border-primary text-dark-ash hover:text-dark group">
                                        <Link className="flex items-center gap-2" href="/orders" onClick={closeAccountMenu}>
                                            My Orders
                                        </Link>
                                    </li>
                                    <li className="py-2 hover:bg-[#FAFAFA] px-5 border-l-4 border-transparent hover:border-primary text-dark-ash hover:text-dark group">
                                        <Link className="flex items-center gap-2" href="/tracking" onClick={closeAccountMenu}>
                                            Order Tracking
                                        </Link>
                                    </li>
                                    <li className="py-2 hover:bg-[#FAFAFA] px-5 border-l-4 border-transparent hover:border-primary text-dark-ash hover:text-dark group">
                                        <Link className="flex items-center gap-2" href="/account" onClick={closeAccountMenu}>
                                            Account Information
                                        </Link>
                                    </li>
                                </ul>
                                <div className="w-full px-5 py-4 absolute bottom-5 border-t">
                                    <button
                                        className="w-full rounded-md py-2 bg-danger text-white text-lg font-bold"
                                        type="button"
                                        onClick={handleLogout}
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Guest user account drawer
                    <div
                        ref={accountDrawerRef}
                        className={`absolute top-0 left-0 bg-white shadow-md sm:w-96 transition-all duration-700 transform ${isAccountOpen ? 'translate-x-0' : '-translate-x-full'
                            }`}
                    >
                        <div className="flex justify-between bg-primary py-2.5 px-4">
                            <h3 className="text-white text-lg font-semibold">My Account</h3>
                            <button
                                type="button"
                                aria-label="close-slide-menubar"
                                onClick={closeAccountMenu}
                            >
                                <svg
                                    width="32"
                                    height="32"
                                    viewBox="0 0 32 32"
                                    className="fill-white"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                        d="M10.2265 2.66553H21.7865C26.3065 2.66553 29.3332 5.83886 29.3332 10.5589V21.4535C29.3332 26.1602 26.3065 29.3322 21.7865 29.3322H10.2265C5.7065 29.3322 2.6665 26.1602 2.6665 21.4535V10.5589C2.6665 5.83886 5.7065 2.66553 10.2265 2.66553ZM20.0132 19.9989C20.4665 19.5469 20.4665 18.8135 20.0132 18.3602L17.6398 15.9869L20.0132 13.6122C20.4665 13.1602 20.4665 12.4135 20.0132 11.9602C19.5598 11.5055 18.8265 11.5055 18.3598 11.9602L15.9998 14.3322L13.6265 11.9602C13.1598 11.5055 12.4265 11.5055 11.9732 11.9602C11.5198 12.4135 11.5198 13.1602 11.9732 13.6122L14.3465 15.9869L11.9732 18.3469C11.5198 18.8135 11.5198 19.5469 11.9732 19.9989C12.1998 20.2255 12.5065 20.3469 12.7998 20.3469C13.1065 20.3469 13.3998 20.2255 13.6265 19.9989L15.9998 17.6402L18.3732 19.9989C18.5998 20.2402 18.8932 20.3469 19.1865 20.3469C19.4932 20.3469 19.7865 20.2255 20.0132 19.9989Z"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div>
                            <div className="h-[calc(100vh-70px)] relative mt-4 text-[15px] space-y-4 w-72 sm:w-80">
                                <div className="flex flex-col justify-center text-center items-center px-4 py-4 rounded-full stroke-dark-ash">
                                    <svg
                                        width="60"
                                        height="60"
                                        viewBox="0 0 60 60"
                                        className="stroke-dark-ash"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <circle cx="30" cy="30" r="30" fill="#ABABAB" />
                                        <g clipPath="url(#clip0_5901_20789)">
                                            <path
                                                d="M30 0C38.284 0 45.784 3.35801 51.213 8.78695C56.642 14.216 60 21.716 60 30C60 38.284 56.642 45.784 51.213 51.213C45.784 56.642 38.284 60 30 60C21.716 60 14.216 56.642 8.78695 51.213C3.35801 45.784 0 38.284 0 30C0 21.716 3.35801 14.216 8.78695 8.78695C14.216 3.35801 21.716 0 30 0ZM24.2143 37.0986C24.0981 36.9479 24.5183 35.9129 24.6178 35.7456C23.4785 34.7318 22.5783 33.709 22.3864 31.6042L22.2642 31.6068C21.982 31.603 21.71 31.5381 21.4553 31.3929C21.0473 31.161 20.7604 30.7625 20.5666 30.3134C20.1565 29.3708 18.8052 26.2425 20.8639 26.4898C19.7128 24.34 22.3181 20.6674 17.8247 19.3091C21.5114 14.6398 29.2902 7.44023 34.9907 14.6621C41.2303 15.2668 43.1766 22.6821 38.975 26.7434C39.2213 26.7523 39.4532 26.809 39.6585 26.9189C40.4395 27.3373 40.4652 28.2452 40.2599 29.0071C40.0568 29.6433 39.7989 30.0739 39.5556 30.6942C39.2598 31.5318 38.8273 31.6877 37.9917 31.5975C37.9493 33.6682 36.9923 34.6846 35.7045 35.9011L36.0568 37.0949C34.3298 40.7583 27.1556 40.9056 24.2143 37.0986ZM9.22875 46.1981C10.6439 40.1591 14.5791 42.2845 22.159 37.5418C24.8522 43.1612 35.798 43.5696 38.0426 37.5418C44.5289 41.6884 49.6403 39.9937 50.9283 45.9955C54.3226 41.561 56.3395 36.0161 56.3395 30C56.3395 22.7264 53.3913 16.1414 48.6251 11.3749C43.8586 6.60867 37.2736 3.66047 30 3.66047C22.7264 3.66047 16.1414 6.60867 11.3749 11.3749C6.60867 16.1414 3.66047 22.7264 3.66047 30C3.66047 36.1082 5.73984 41.7304 9.22875 46.1981Z"
                                                fill="white"
                                            />
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_5901_20789">
                                                <rect width="60" height="60" fill="white" />
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    <p className="mt-1 md:text-lg font-semibold text-dark">User Account</p>
                                </div>
                                <hr />
                                <ul className="space-y-1 my-2.5 capitalize">
                                    <li className="py-2 hover:bg-[#FAFAFA] px-5 border-l-4 border-transparent hover:border-primary text-dark-ash hover:text-dark group">
                                        <Link className="flex items-center gap-2" href="/login" onClick={closeAccountMenu}>
                                            login
                                        </Link>
                                    </li>
                                    <li className="py-2 hover:bg-[#FAFAFA] px-5 border-l-4 border-transparent hover:border-primary text-dark-ash hover:text-dark group">
                                        <Link className="flex items-center gap-2" href="/register" onClick={closeAccountMenu}>
                                            register
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileNav;