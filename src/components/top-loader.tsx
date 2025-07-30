
"use client";

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TopLoaderWrapper() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Show loader on path change
    setIsLoading(true);

    // Hide loader after animation duration
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 750); // This duration should match the animation duration in CSS

    return () => {
      clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <div className={`top-loader-wrapper ${isLoading ? 'loading' : ''}`}>
      <div className="bar"></div>
    </div>
  );
}
