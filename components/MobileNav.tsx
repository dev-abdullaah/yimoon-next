// components/MobileNav.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { catalogApi } from '@/lib/api';
import { buildCategoryTree, CategoryNode } from '@/lib/categoryTree';
import { getCategoryRelativeUrl } from '@/utils/urlHelper';
import UserIconMD from '@/components/Icons/UserIconMD';

interface NavLinkProps {
    href: string;
    children: React.ReactNode;
    className: (args: { isActive: boolean }) => string;
    onClick?: () => void;
    'aria-label'?: string;
}

const MobileNav: React.FC = () => {
    const [isAccountOpen, setIsAccountOpen] = useState<boolean>(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
    const [openCategories, setOpenCategories] = useState<Record<string | number, boolean>>({});
    const accountDrawerRef = useRef<HTMLDivElement | null>(null);
    const categoryDrawerRef = useRef<HTMLDivElement | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    const { user, isAuthenticated, logout } = useAuth();

    const { data: categoriesData, isLoading, isError } = useQuery({
        queryKey: ['categories'],
        queryFn: () => catalogApi.getCategories(),
        staleTime: 1000 * 60 * 30, // 30 minutes
        retry: 1,
    });

    const categoryTree: CategoryNode[] = buildCategoryTree((categoriesData as any)?.data ?? []);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (
                isAccountOpen &&
                accountDrawerRef.current &&
                !accountDrawerRef.current.contains(event.target as Node)
            ) {
                setIsAccountOpen(false);
            }

            if (
                isCategoryOpen &&
                categoryDrawerRef.current &&
                !categoryDrawerRef.current.contains(event.target as Node)
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
        if (isCategoryOpen) {
            setOpenCategories({});
        }
    };
    const closeCategoryMenu = () => setIsCategoryOpen(false);

    const toggleCategory = (categoryId: number | string) => {
        setOpenCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            closeAccountMenu();
            router.push('/');
        }
    };

    const renderCategoryTree = (categories: CategoryNode[]): React.ReactNode => {
        if (!categories || categories.length === 0) return null;

        return categories.map((category) => {
            const hasChildren = category.children && category.children.length > 0;
            const isOpen = Boolean(openCategories[category.id]);

            return (
                <ul key={category.id}>
                    <li className="flex items-stretch">
                        <Link
                            href={getCategoryRelativeUrl(category)}
                            onClick={closeCategoryMenu}
                            className="hover:text-primary flex-1 flex items-center px-5 py-3"
                        >
                            <span>{category.name}</span>
                        </Link>

                        {hasChildren && (
                            <button
                                type="button"
                                aria-expanded={isOpen}
                                aria-label={isOpen ? `Collapse ${category.name}` : `Expand ${category.name}`}
                                onClick={() => toggleCategory(category.id)}
                                className="hover:text-primary flex items-center px-4"
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                                    fill="none"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                        )}
                    </li>

                    {hasChildren && (
                        <div className={`space-y-1 h-auto ml-5 mt-1 ${isOpen ? 'block' : 'hidden'}`}>
                            {renderCategoryTree(category.children)}
                        </div>
                    )}
                </ul>
            );
        });
    };

    const NavLink: React.FC<NavLinkProps> = ({ href, children, className, onClick, 'aria-label': ariaLabel }) => {
        const isActive = pathname === href;
        const combinedClassName = className({ isActive });

        return (
            <Link href={href} className={combinedClassName} onClick={onClick} aria-label={ariaLabel}>
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
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                            <path d="M3 6h18" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
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
                        <UserIconMD className="h-[22px] w-[22px]" />
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
                className={`z-[100] fixed inset-0 w-screen bg-black/70 transition-all duration-700 ${isAccountOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
            >
                {isAuthenticated ? (
                    <div
                        ref={accountDrawerRef}
                        className={`absolute top-0 left-0 bg-white shadow-md sm:w-96 transition-all duration-700 transform ${isAccountOpen ? 'translate-x-0' : '-translate-x-full'}`}
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
                                    <div className="border border-gray-200 bg-gray-50 rounded-full p-3 flex items-center justify-center">
                                        <UserIconMD className="h-9 w-9 text-primary" />
                                    </div>
                                    <p className="mt-1 md:text-lg font-semibold text-dark capitalize w-[150px] truncate">
                                        {user?.name ?? 'Your account'}
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
                                        <Link className="flex items-center gap-2" href="/dashboard?section=orders" onClick={closeAccountMenu}>
                                            My Orders
                                        </Link>
                                    </li>
                                    <li className="py-2 hover:bg-[#FAFAFA] px-5 border-l-4 border-transparent hover:border-primary text-dark-ash hover:text-dark group">
                                        <Link className="flex items-center gap-2" href="/dashboard?section=tracking" onClick={closeAccountMenu}>
                                            Order Tracking
                                        </Link>
                                    </li>
                                    <li className="py-2 hover:bg-[#FAFAFA] px-5 border-l-4 border-transparent hover:border-primary text-dark-ash hover:text-dark group">
                                        <Link className="flex items-center gap-2" href="/dashboard?section=profile" onClick={closeAccountMenu}>
                                            Account Info
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
                    <div
                        ref={accountDrawerRef}
                        className={`absolute top-0 left-0 bg-white shadow-md sm:w-96 transition-all duration-700 transform ${isAccountOpen ? 'translate-x-0' : '-translate-x-full'}`}
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
                                    <div className="border border-gray-200 bg-gray-50 rounded-full p-3 flex items-center justify-center">
                                        <UserIconMD className="h-9 w-9 text-primary" />
                                    </div>
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
