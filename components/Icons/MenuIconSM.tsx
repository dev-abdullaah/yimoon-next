import React from 'react';

const MenuIconSM: React.FC<React.SVGProps<SVGSVGElement>> = ({
    className = 'w-5 h-5 mr-2 flex-none text-primary',
    ...props
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
    >
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="14" y1="18" y2="18" />
    </svg>
);

export default MenuIconSM;
