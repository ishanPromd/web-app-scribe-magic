import { useEffect, useCallback, useRef } from 'react';

// Function to detect if device is mobile
const isMobileDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Check for mobile user agents
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());
  
  // Check for touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check screen size (mobile-like dimensions)
  const isMobileScreen = window.innerWidth <= 768 || window.innerHeight <= 768;
  
  // Check for mobile-specific features
  const hasMobileFeatures = 'orientation' in window || 'DeviceOrientationEvent' in window;
  
  return isMobileUserAgent || (isTouchDevice && (isMobileScreen || hasMobileFeatures));
};

export const useDeveloperToolsProtection = () => {
  const lastCheckTimeRef = useRef(0);
  const devToolsDetectedRef = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useRef(isMobileDevice());

  // Enhanced function to detect if developer tools are open
  const detectDevTools = useCallback(() => {
    // Skip detection on mobile devices
    if (isMobile.current) {
      return false;
    }

    const now = Date.now();
    
    // Throttle checks to avoid excessive redirects
    if (now - lastCheckTimeRef.current < 500) {
      return false;
    }
    
    lastCheckTimeRef.current = now;
    
    // Multiple detection methods
    const threshold = 160;
    const heightDiff = window.outerHeight - window.innerHeight;
    const widthDiff = window.outerWidth - window.innerWidth;
    
    // Method 1: Window size difference (most reliable)
    const devToolsOpen = heightDiff > threshold || widthDiff > threshold;
    
    // Method 2: Console detection (detects when console tab is active)
    let consoleOpen = false;
    try {
      const devtools = {
        open: false,
        orientation: null
      };
      
      const element = new Image();
      Object.defineProperty(element, 'id', {
        get: function() {
          consoleOpen = true;
          return 'devtools-detector';
        }
      });
      
      console.log(element);
    } catch (e) {
      // Ignore errors
    }
    
    // Method 3: Performance timing detection
    let performanceDetection = false;
    try {
      const start = performance.now();
      debugger; // This will pause if dev tools are open
      const end = performance.now();
      performanceDetection = (end - start) > 100;
    } catch (e) {
      // Ignore errors
    }
    
    const detected = devToolsOpen || consoleOpen || performanceDetection;
    
    if (detected && !devToolsDetectedRef.current) {
      devToolsDetectedRef.current = true;
      
      // Clear any existing timeout
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      
      // Immediate redirect with slight delay to ensure detection is accurate
      redirectTimeoutRef.current = setTimeout(() => {
        // Only redirect if we're not already on the developer tools page
        if (!window.location.pathname.includes('/developer-tools-detected')) {
          window.location.href = '/developer-tools-detected';
        }
      }, 100);
      
      return true;
    }
    
    if (!detected) {
      devToolsDetectedRef.current = false;
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    }
    
    return detected;
  }, []);

  // Function to check before page load
  const checkBeforePageLoad = useCallback(() => {
    // Skip on mobile devices
    if (isMobile.current) {
      return false;
    }
    return detectDevTools();
  }, [detectDevTools]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip on mobile devices
    if (isMobile.current) {
      return;
    }

    // Detect F12
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => {
        detectDevTools();
      }, 50);
      return false;
    }

    // Detect Ctrl+Shift+I (Developer Tools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => {
        detectDevTools();
      }, 50);
      return false;
    }

    // Detect Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => {
        detectDevTools();
      }, 50);
      return false;
    }

    // Detect Ctrl+Shift+K (Console in Firefox)
    if (e.ctrlKey && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => {
        detectDevTools();
      }, 50);
      return false;
    }

    // Detect Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Detect Ctrl+Shift+C (Element Inspector)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => {
        detectDevTools();
      }, 50);
      return false;
    }

    // Detect Ctrl+Shift+E (Network tab)
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => {
        detectDevTools();
      }, 50);
      return false;
    }
  }, [detectDevTools]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    // Skip on mobile devices
    if (isMobile.current) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    // Check for dev tools after context menu (in case user uses Inspect Element)
    setTimeout(() => {
      detectDevTools();
    }, 100);
    
    return false;
  }, [detectDevTools]);

  const handleSelectStart = useCallback((e: Event) => {
    // Allow text selection on mobile devices
    if (isMobile.current) {
      return;
    }
    e.preventDefault();
    return false;
  }, []);

  const handleDragStart = useCallback((e: DragEvent) => {
    // Allow drag on mobile devices for better UX
    if (isMobile.current) {
      return;
    }
    e.preventDefault();
    return false;
  }, []);

  const handleCopy = useCallback((e: ClipboardEvent) => {
    // Allow copy on mobile devices
    if (isMobile.current) {
      return;
    }
    e.preventDefault();
    return false;
  }, []);

  const handlePrint = useCallback((e: Event) => {
    e.preventDefault();
    return false;
  }, []);

  useEffect(() => {
    // Update mobile detection on resize
    const handleResize = () => {
      isMobile.current = isMobileDevice();
    };
    
    window.addEventListener('resize', handleResize);

    // Skip all protection on mobile devices
    if (isMobile.current) {
      console.log('Mobile device detected - developer tools protection disabled');
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    // Initial check when component mounts (only on desktop)
    setTimeout(() => {
      detectDevTools();
    }, 100);

    // Add event listeners with high priority (only on desktop)
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('copy', handleCopy, true);
    window.addEventListener('beforeprint', handlePrint, true);

    // Enhanced detection with multiple intervals for different scenarios
    
    // Fast detection for immediate response
    const fastInterval = setInterval(() => {
      detectDevTools();
    }, 500);
    
    // Regular detection
    const regularInterval = setInterval(() => {
      detectDevTools();
    }, 1000);
    
    // Slow detection for background monitoring
    const slowInterval = setInterval(() => {
      detectDevTools();
    }, 2000);

    // Monitor window resize events (when dev tools open/close)
    const handleDevToolsResize = () => {
      setTimeout(() => {
        detectDevTools();
      }, 100);
    };
    
    window.addEventListener('resize', handleDevToolsResize);

    // Monitor focus events (when switching between dev tools and page)
    const handleFocus = () => {
      setTimeout(() => {
        detectDevTools();
      }, 100);
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Monitor blur events (when dev tools gain focus)
    const handleBlur = () => {
      setTimeout(() => {
        detectDevTools();
      }, 100);
    };
    
    window.addEventListener('blur', handleBlur);

    // Monitor visibility change (when tab becomes hidden/visible)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => {
          detectDevTools();
        }, 200);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Monitor mouse events that might indicate dev tools usage
    const handleMouseDown = () => {
      setTimeout(() => {
        detectDevTools();
      }, 50);
    };
    
    document.addEventListener('mousedown', handleMouseDown);

    // Disable text selection via CSS (only on desktop)
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      
      input, textarea, [contenteditable="true"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      
      ::selection {
        background: transparent !important;
      }
      
      ::-moz-selection {
        background: transparent !important;
      }
      
      img {
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
        pointer-events: none !important;
      }
      
      button img, .interactive-image {
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);

    // Override console methods in production
    if (import.meta.env.PROD) {
      const noop = () => {};
      const originalConsole = { ...console };
      
      console.log = noop;
      console.error = noop;
      console.warn = noop;
      console.info = noop;
      console.debug = noop;
      console.trace = noop;
      console.dir = noop;
      console.dirxml = noop;
      console.table = noop;
      console.group = noop;
      console.groupCollapsed = noop;
      console.groupEnd = noop;
      console.time = noop;
      console.timeEnd = noop;
      console.count = noop;
      console.assert = noop;
      console.clear = noop;
    }

    // Clear console periodically and check for dev tools
    const clearConsoleInterval = setInterval(() => {
      if (import.meta.env.PROD) {
        try {
          console.clear();
        } catch (e) {
          // Ignore errors
        }
      }
      // Also check for dev tools during console clear
      detectDevTools();
    }, 3000);

    // Advanced detection: Monitor for debugger statements
    const debuggerInterval = setInterval(() => {
      try {
        const start = Date.now();
        debugger;
        const end = Date.now();
        if (end - start > 100) {
          detectDevTools();
        }
      } catch (e) {
        // Ignore errors
      }
    }, 5000);

    // Cleanup function
    return () => {
      clearInterval(fastInterval);
      clearInterval(regularInterval);
      clearInterval(slowInterval);
      clearInterval(clearConsoleInterval);
      clearInterval(debuggerInterval);
      
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('beforeprint', handlePrint, true);
      window.removeEventListener('resize', handleDevToolsResize);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleMouseDown);
      
      // Remove style
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [handleKeyDown, handleContextMenu, handleSelectStart, handleDragStart, handleCopy, handlePrint, detectDevTools]);

  return { checkBeforePageLoad };
};