import React from 'react';

const ReturnMoneyIconMD: React.FC<React.SVGProps<SVGSVGElement>> = ({
    className = 'w-6 h-6',
    ...props
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
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
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

export default ReturnMoneyIconMD;
