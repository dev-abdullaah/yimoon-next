// components/Home/Category/ShopNow.jsx
'use client';

import React from 'react';
import Link from 'next/link';

const ShopNow = () => {
    return (
        <div className="rounded-default flex flex-col items-center justify-center gap-3.5 bg-primary px-5 py-6 text-white lg:flex-row lg:gap-8">
            <h4 className="text-xl whitespace-nowrap md:text-2xl xl:text-3xl">
                <span className="font-bold">30% Sale!</span>
            </h4>
            <p className="text-center text-sm capitalize md:text-base">
                Enjoy <span className="font-semibold">30%</span> Discount on{' '}selected items!
            </p>
            <Link
                href="/catalog"
                className="rounded-[5px] border px-3 py-1 font-semibold whitespace-nowrap hover:bg-white hover:text-[#D50B42] md:text-base md:font-bold xl:px-4"
                aria-label="Shop 30 percent sale"
            >
                SHOP NOW
            </Link>
        </div>
    );
};

export default ShopNow;