import React from 'react';

const ChevronRightIconSM: React.FC<React.SVGProps<SVGSVGElement>> = ({
    className = 'header-cat-link__arrow',
    ...props
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="15"
        height="15"
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
        <path d="m9 18 6-6-6-6" />
    </svg>
);

export default ChevronRightIconSM;
