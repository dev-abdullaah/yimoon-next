// components/Home/TrustBar.jsx
'use client';

import ShippedIcon from '@/components/Icons/ShippedIcon';
import ShieldMdIcon from '@/components/Icons/ShieldMdIcon';
import ReadyToShipIcon from '@/components/Icons/ReadyToShipIcon';
import TakaIcon from '@/components/Icons/TakaIcon';

export default function TrustBar() {
    const items = [
        {
            icon: <ShieldMdIcon />,
            title: '100% Authentic',
            text: 'Directly sourced genuine products',
        },
        {
            icon: <ShippedIcon />,
            title: 'Fast Country Delivery',
            text: 'Across all 64 districts in Bangladesh',
        },
        {
            icon: <ReadyToShipIcon />,
            title: 'Easy Return Policy',
            text: 'Hassle-free 7 days return guarantee',
        },
        {
            icon: <TakaIcon />,
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
