// app/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Spinner from '@/components/Spinner';
import Hero from '@/components/Home/Category/Hero';
import PopCategory from '@/components/Home/Category/PopCategory';
import BestDeals from '@/components/Home/Products/BestDeals';
import Fashion from '@/components/Home/Category/Fashion';
import GenderWise from '@/components/Home/Category/GenderWise';
import NewCollection from '@/components/Home/Products/NewCollection';
import Gadgets from '@/components/Home/Products/Gadgets';
import ShopNow from '@/components/Home/Category/ShopNow';
import Trending from '@/components/Home/Products/Trending';
import ExtraDiscount from '@/components/Home/Products/ExtraDiscount';
import Offers from '@/components/Home/Category/Offers';
import { hasClaimedDiscount, isModalDismissed } from '@/utils/cryptoHelper';

export default function HomePage() {
    const [showSpinner, setShowSpinner] = useState(false);

    useEffect(() => {
        // Check if user has already claimed a discount or dismissed the modal
        const alreadyClaimed = hasClaimedDiscount();
        const alreadyDismissed = isModalDismissed();

        // Only show spinner if not claimed and not dismissed
        if (!alreadyClaimed && !alreadyDismissed) {
            setShowSpinner(true);
        }
    }, []);

    // Add this function to handle when the spinner is closed
    const handleSpinnerClose = () => {
        setShowSpinner(false);
    };

    return (
        <>
            {/* Show spinner only on homepage, if not already claimed, and if not dismissed */}
            {showSpinner && <Spinner onClose={handleSpinnerClose} />}

            <main className="container mx-auto px-5 md:px-7 lg:px-12">
                <section>
                    <div className="mb-4 space-y-2.5 md:space-y-4">
                        <Hero />
                        <PopCategory />
                        <BestDeals />
                        <Fashion />
                        <GenderWise />
                        <NewCollection />
                        <Gadgets />
                        <ShopNow />
                        <Trending />
                        <ExtraDiscount />
                        <Offers />
                    </div>
                </section>
            </main>
        </>
    );
}