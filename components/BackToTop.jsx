// components/BackToTop.jsx
'use client';

import { useEffect, useState } from 'react';

const BackToTop = () => {
  const [visible, setVisible] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false); // Default to false, will be updated in useEffect

  useEffect(() => {
    // Set initial values on client side
    setIsLargeScreen(window.innerWidth >= 1024);
    
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setVisible(scrollY > 700);
    };

    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    handleScroll(); // Run scroll check on mount
    handleResize(); // Run resize check on mount

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed right-4 bottom-10 z-20 h-11 w-11 rounded-full bg-white shadow-custom1 flex items-center justify-center transition-opacity duration-300 ${
        visible && isLargeScreen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } lg:block hidden`}
      aria-label="Back to top"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="#CB1E2A"
        viewBox="0 0 512 512"
        width="24"
        height="24"
      >
        <path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" />
      </svg>
    </button>
  );
};

export default BackToTop;