// components/Home/TrustBar.tsx
'use client';

import React from 'react';
import ShieldIconMD from '@/components/Icons/ShieldIconMD';
import ShippedIconMD from '@/components/Icons/ShippedIconMD';
import ReturnMoneyIconMD from '@/components/Icons/ReturnMoneyIconMD';
import TakaIconSM from '@/components/Icons/TakaIconSM';

export interface TrustItem {
    icon: React.ReactNode;
    title: string;
    text: string;
}

export default function TrustBar(): React.JSX.Element {
    const items: TrustItem[] = [
        {
            icon: <ShieldIconMD />,
            title: 'Curated Quality',
            text: 'Thoughtfully selected styles & essentials',
        },
        {
            icon: <ShippedIconMD />,
            title: 'Nationwide Delivery',
            text: 'Fast shipping across Bangladesh',
        },
        {
            icon: <ReturnMoneyIconMD />,
            title: 'Easy 7-Day Returns',
            text: 'Simple, hassle-free return support',
        },
        {
            icon: <TakaIconSM />,
            title: 'Cash on Delivery',
            text: 'Convenient payment at your doorstep',
        },
    ];

    return (
        <section className="hp-trust" aria-label="Why Shop With Us">
            {items.map((item, idx) => (
                <div key={idx} className="hp-trust__item">
                    <div className="hp-trust__icon" aria-hidden="true">
                        {item.icon}
                    </div>
                    <div>
                        <div className="hp-trust__title">{item.title}</div>
                        <div className="hp-trust__text">{item.text}</div>
                    </div>
                </div>
            ))}
        </section>
    );
}
