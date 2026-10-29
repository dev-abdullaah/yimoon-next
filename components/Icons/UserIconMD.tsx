import React from 'react';

const UserIconMD: React.FC<React.SVGProps<SVGSVGElement>> = ({
    className = 'h-7 w-7 text-primary cursor-pointer transition-transform duration-200 group-hover:scale-105',
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
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

export default UserIconMD;
