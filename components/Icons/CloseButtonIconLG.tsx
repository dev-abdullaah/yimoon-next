import React from 'react';

const CloseButtonIconLG: React.FC<React.SVGProps<SVGSVGElement>> = ({
    className = 'w-7 h-7 text-primary',
    ...props
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <rect width="18" height="18" x="3" y="3" rx="4" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
    </svg>
);

export default CloseButtonIconLG;
