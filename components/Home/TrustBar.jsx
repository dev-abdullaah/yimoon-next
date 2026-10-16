// components/Home/TrustBar.jsx
'use client';

import ShieldIconMD from '@/components/Icons/ShieldIconMD';
import ShippedIconMD from '@/components/Icons/ShippedIconMD';
import ReturnMoneyIconMD from '@/components/Icons/ReturnMoneyIconMD';
import TakaIconSM from '@/components/Icons/TakaIconSM';

export default function TrustBar() {
    const items = [
        {
            icon: <ShieldIconMD />,
            title: '100% Authentic',
            text: 'Directly sourced genuine products',
        },
        {
            icon: <ShippedIconMD />,
            title: 'Fast Country Wide Delivery',
            text: 'Across all 64 districts in Bangladesh',
        },
        {
            icon: <ReturnMoneyIconMD />,
            title: 'Easy Return Policy',
            text: 'Hassle-free 7 days return guarantee',
        },
        {
            icon: <TakaIconSM />,
            title: 'Cash on Delivery',
            text: 'Pay upon doorstep package arrival',
        },
    ];

    return (
        <section className="hp-trust" aria-label="Customer Guarantees and Services">
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
