
"use client";

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// A simple top-loading bar component to indicate page transitions.
function TopLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // This component will be rendered on the server, but we want the loader to appear
    // only on client-side navigations. We use a timeout to delay the loader's
    // appearance slightly, preventing it from flashing on very fast page loads.
    const timer = setTimeout(() => {
       setIsLoading(true);
    }, 100); // Start loading after a short delay

    return () => {
      clearTimeout(timer);
      setIsLoading(false);
    };
  }, [pathname, searchParams]);


  return (
    <div className="top-loader-container">
      {isLoading && <div className="top-loader-bar" />}
    </div>
  );
}


// In a real app router scenario, you'd hook into router events.
// Since we can't directly access router events in a simple way in this context,
// we simulate the start/end behavior based on pathname/searchParams changes.
// The effect in TopLoader will re-run on navigation, simulating the loading process.
// For a full implementation, one might use a library like `next-nprogress-bar`.
// Here, we'll just use CSS to create a simple, repeating animation.
// The loader will appear on navigation and disappear when the new page component renders.
// We need to keep a reference to the original document.body.appendChild method.
const originalAppendChild = typeof document !== 'undefined' ? document.body.appendChild.bind(document.body) : null;

if (typeof window !== 'undefined' && originalAppendChild) {
    let activeRequests = 0;
    
    // Monkey-patch fetch to track loading state for API calls.
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        if (activeRequests === 0) {
            // This is a simplified way to trigger the loader; a more robust solution
            // would involve a state management library or context.
            // For now, we manually add/remove a class to show/hide the loader.
            document.body.classList.add('page-loading');
        }
        activeRequests++;

        try {
            const response = await originalFetch(...args);
            return response;
        } finally {
            activeRequests--;
            if (activeRequests === 0) {
                document.body.classList.remove('page-loading');
            }
        }
    };
}


export default function TopLoaderWrapper() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 750); // Automatically hide after a duration
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);
  
  return (
    <div className={`top-loader-wrapper ${visible ? 'loading' : ''}`}>
      <div className="bar"></div>
    </div>
  );
}

