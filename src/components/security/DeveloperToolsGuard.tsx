import React, { useEffect, useState } from 'react';
import { useDeveloperToolsProtection } from '../../hooks/useDeveloperToolsProtection';

interface DeveloperToolsGuardProps {
  children: React.ReactNode;
}

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

export const DeveloperToolsGuard: React.FC<DeveloperToolsGuardProps> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [devToolsDetected, setDevToolsDetected] = useState(false);
  const [isMobile] = useState(isMobileDevice());
  const { checkBeforePageLoad } = useDeveloperToolsProtection();

  useEffect(() => {
    // Skip all checks on mobile devices
    if (isMobile) {
      console.log('Mobile device detected - skipping developer tools protection');
      setIsChecking(false);
      return;
    }

    // Enhanced check for developer tools before rendering the page
    const checkDevTools = () => {
      // Multiple detection methods
      const threshold = 160;
      const heightDiff = window.outerHeight - window.innerHeight;
      const widthDiff = window.outerWidth - window.innerWidth;
      
      // Method 1: Window size difference
      const sizeDetection = heightDiff > threshold || widthDiff > threshold;
      
      // Method 2: Console detection
      let consoleDetection = false;
      try {
        const element = new Image();
        Object.defineProperty(element, 'id', {
          get: function() {
            consoleDetection = true;
            return 'devtools-detector';
          }
        });
        console.log(element);
      } catch (e) {
        // Ignore errors
      }
      
      // Method 3: Performance timing
      let performanceDetection = false;
      try {
        const start = performance.now();
        debugger;
        const end = performance.now();
        performanceDetection = (end - start) > 100;
      } catch (e) {
        // Ignore errors
      }
      
      const detected = sizeDetection || consoleDetection || performanceDetection;
      
      if (detected) {
        setDevToolsDetected(true);
        // Immediate redirect to developer tools detected page
        window.location.href = '/developer-tools-detected';
        return;
      }
      
      setIsChecking(false);
    };

    // Initial check with multiple attempts
    const initialChecks = [100, 300, 500, 1000];
    
    initialChecks.forEach((delay, index) => {
      setTimeout(() => {
        if (index === 0) {
          checkDevTools();
        } else {
          // Additional checks to catch delayed dev tools opening
          const threshold = 160;
          const detected = window.outerHeight - window.innerHeight > threshold || 
                          window.outerWidth - window.innerWidth > threshold;
          
          if (detected) {
            setDevToolsDetected(true);
            window.location.href = '/developer-tools-detected';
            return;
          }
          
          if (index === initialChecks.length - 1) {
            setIsChecking(false);
          }
        }
      }, delay);
    });
    
    // Continuous monitoring while checking
    const checkInterval = setInterval(() => {
      if (isChecking) {
        checkDevTools();
      }
    }, 200);
    
    // Enhanced event listeners for immediate detection
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'K' || e.key === 'C'))) {
        setTimeout(() => {
          const threshold = 160;
          const detected = window.outerHeight - window.innerHeight > threshold || 
                          window.outerWidth - window.innerWidth > threshold;
          if (detected) {
            window.location.href = '/developer-tools-detected';
          }
        }, 100);
      }
    };
    
    const handleContextMenu = () => {
      setTimeout(() => {
        const threshold = 160;
        const detected = window.outerHeight - window.innerHeight > threshold || 
                        window.outerWidth - window.innerWidth > threshold;
        if (detected) {
          window.location.href = '/developer-tools-detected';
        }
      }, 200);
    };
    
    const handleResize = () => {
      setTimeout(() => {
        const threshold = 160;
        const detected = window.outerHeight - window.innerHeight > threshold || 
                        window.outerWidth - window.innerWidth > threshold;
        if (detected) {
          window.location.href = '/developer-tools-detected';
        }
      }, 50);
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      clearInterval(checkInterval);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [checkBeforePageLoad, isChecking, isMobile]);

  // Show loading while checking (only on desktop)
  if (isChecking && !isMobile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying security...</p>
        </div>
      </div>
    );
  }

  // Don't render children if dev tools detected (only on desktop)
  if (devToolsDetected && !isMobile) {
    return null;
  }

  return <>{children}</>;
};