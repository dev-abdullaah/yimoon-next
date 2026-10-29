import React from 'react';

interface EmptyCartIconProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
}

const EmptyCartIcon: React.FC<EmptyCartIconProps> = ({
    size = 96,
    className = 'mx-auto',
    ...props
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 96 96"
        fill="none"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <rect x="8" y="8" width="80" height="80" rx="40" fill="#FEF2F2" />
        <g
            transform="translate(26, 24)"
            stroke="var(--color-primary, #C20000)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M11 3.5L5.5 11v25.5a3.5 3.5 0 0 0 3.5 3.5h26a3.5 3.5 0 0 0 3.5-3.5V11L33 3.5Z" fill="#FFFFFF" />
            <path d="M5.5 11h33" />
            <path d="M29.5 18a7.5 7.5 0 0 1-15 0" />
        </g>
    </svg>
);

export default EmptyCartIcon;
