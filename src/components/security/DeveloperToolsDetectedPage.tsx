import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Lock, Eye, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

export const DeveloperToolsDetectedPage: React.FC = () => {
  const [countdown, setCountdown] = useState(10);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          checkAndRedirect();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const checkAndRedirect = () => {
    setIsChecking(true);
    
    // Check if developer tools are still open
    const threshold = 160;
    const devToolsOpen = window.outerHeight - window.innerHeight > threshold || 
                        window.outerWidth - window.innerWidth > threshold;
    
    setTimeout(() => {
      if (!devToolsOpen) {
        // Developer tools are closed, redirect back
        window.location.href = '/home';
      } else {
        // Still open, reset countdown
        setIsChecking(false);
        setCountdown(10);
      }
    }, 2000);
  };

  const handleManualCheck = () => {
    checkAndRedirect();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
     
        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900">Access Restricted</h2>
            </div>
            
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              Our security system has detected that developer tools are currently open in your browser. 
              To protect our premium educational content and maintain platform security, access has been temporarily restricted.
            </p>
          </div>

     

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h3 className="font-bold text-blue-900 mb-3">To Continue Learning:</h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Close the developer tools in your browser</li>
              <li>Press <kbd className="bg-blue-200 px-2 py-1 rounded text-sm">F12</kbd> or right-click and close the developer panel</li>
              <li>Wait for automatic verification or click the check button below</li>
              <li>You'll be redirected back to your learning dashboard</li>
            </ol>
          </div>

          {/* Auto-check countdown */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center space-x-3 bg-gray-100 rounded-full px-6 py-3">
              <RefreshCw className={`w-5 h-5 text-gray-600 ${isChecking ? 'animate-spin' : ''}`} />
              <span className="text-gray-700 font-medium">
                {isChecking ? 'Checking...' : `Auto-check in ${countdown}s`}
              </span>
            </div>
          </div>

          {/* Manual check button */}
          <div className="text-center">
            <Button
              onClick={handleManualCheck}
              loading={isChecking}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg"
            >
              {isChecking ? 'Verifying...' : 'Check Now'}
            </Button>
          </div>

          {/* Footer note */}
    
        </div>
      </motion.div>
    </div>
  );
};