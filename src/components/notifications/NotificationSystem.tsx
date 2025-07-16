import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, BookOpen } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTrophy, faBrain, faInfoCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { Notification } from '../../types';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  index: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose, index }) => {
  const [isVisible, setIsVisible] = useState(true);

  const getIcon = () => {
    // Check for special notification types based on data
    if (notification.type === 'broadcast' && notification.data?.icon === 'check-circle') {
      return faCheckCircle;
    }
    
    switch (notification.type) {
      case 'quiz_result':
        return faBrain;
      case 'achievement':
        return faTrophy;
      case 'reminder':
        return faExclamationCircle;
      case 'broadcast':
        return faInfoCircle;
      default:
        return faInfoCircle;
    }
  };

  const getNotificationStyle = () => {
    // Special styling for lesson approval notifications
    if (notification.type === 'broadcast' && notification.data?.icon === 'check-circle') {
      return {
        bgColor: 'bg-white',
        borderColor: 'border-green-200',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        titleColor: 'text-gray-900',
        messageColor: 'text-gray-600',
        shadow: 'shadow-lg shadow-green-500/10',
        progressColor: 'bg-green-500'
      };
    }
    
    switch (notification.priority) {
      case 'high':
        return {
          bgColor: 'bg-white',
          borderColor: 'border-red-200',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          titleColor: 'text-gray-900',
          messageColor: 'text-gray-600',
          shadow: 'shadow-lg shadow-red-500/10',
          progressColor: 'bg-red-500'
        };
      case 'medium':
        return {
          bgColor: 'bg-white',
          borderColor: 'border-amber-200',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          titleColor: 'text-gray-900',
          messageColor: 'text-gray-600',
          shadow: 'shadow-lg shadow-amber-500/10',
          progressColor: 'bg-amber-500'
        };
      default:
        return {
          bgColor: 'bg-white',
          borderColor: 'border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          titleColor: 'text-gray-900',
          messageColor: 'text-gray-600',
          shadow: 'shadow-lg shadow-blue-500/10',
          progressColor: 'bg-blue-500'
        };
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const icon = getIcon();
  const style = getNotificationStyle();

  return (
    <motion.div
      layout
      initial={{ 
        opacity: 0, 
        x: window.innerWidth < 768 ? 0 : 300, 
        y: window.innerWidth < 768 ? -50 : 0,
        scale: 0.9 
      }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        x: 0, 
        y: 0, 
        scale: isVisible ? 1 : 0.9 
      }}
      exit={{ 
        opacity: 0, 
        x: window.innerWidth < 768 ? 0 : 300,
        y: window.innerWidth < 768 ? -50 : 0,
        scale: 0.9,
        transition: { duration: 0.3, ease: 'easeInOut' }
      }}
      transition={{ 
        duration: 0.4, 
        type: 'spring', 
        stiffness: 300,
        damping: 25,
        delay: index * 0.1
      }}
      className={`${style.bgColor} ${style.shadow} rounded-2xl border-2 ${style.borderColor} p-3 sm:p-4 w-full backdrop-blur-sm overflow-hidden group hover:scale-[1.02] transition-transform duration-200 relative`}
    > 
      {/* Main content */}
      <div className="flex items-start space-x-2 sm:space-x-3">
        {/* Icon */}
        <div className={`w-8 h-8 sm:w-10 sm:h-10 ${style.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <FontAwesomeIcon icon={icon} className={`w-4 h-4 sm:w-5 sm:h-5 ${style.iconColor}`} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-2">
              <h4 className={`font-semibold ${style.titleColor} text-xs sm:text-sm leading-tight mb-1`}>
                {notification.title}
              </h4>
              <p className={`${style.messageColor} text-xs leading-relaxed line-clamp-2`}>
                {notification.message}
              </p>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-3 h-3" />
            </motion.button>
          </div>

          {/* Lesson info if available */}
          {notification.data?.lesson_title && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2"
            >
              <div className="flex items-center space-x-2">
                <BookOpen className="w-3 h-3 text-green-600 flex-shrink-0" />
                <span className="text-xs font-medium text-green-800 truncate">
                  {notification.data.lesson_title}
                </span>
              </div>
            </motion.div>
          )}
          
          {/* Timestamp and status */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {new Date(notification.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            
            {/* Success indicator for access granted */}
            {notification.type === 'broadcast' && notification.data?.icon === 'check-circle' && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                className="flex items-center space-x-1"
              >
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-xs font-medium text-green-600 hidden sm:inline">Access Granted</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar for auto-dismiss */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 5, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-0.5 ${style.progressColor} rounded-full`}
      />
    </motion.div>
  );
};

export const NotificationSystem: React.FC = () => {
  const { notifications, markNotificationRead, fetchUserNotifications } = useData();
  const { user } = useAuth();
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);
  const [processedNotificationIds, setProcessedNotificationIds] = useState<Set<string>>(new Set());
  const lastNotificationCountRef = useRef(0);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clear all timeouts when component unmounts
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setVisibleNotifications([]);
      setProcessedNotificationIds(new Set());
      return;
    }

    // Filter notifications for current user - include both user-specific and broadcast notifications
    const userNotifications = notifications.filter(
      n => (n.userId === user.id || n.userId === null) && !n.readStatus
    );

    // Only show new notifications that haven't been processed yet
    const newNotifications = userNotifications.filter(
      n => !processedNotificationIds.has(n.id) && 
           !visibleNotifications.some(vn => vn.id === n.id)
    );

    if (newNotifications.length > 0) {
      console.log('New notifications to show:', newNotifications.length);
      
      // Add new notifications to processed set
      setProcessedNotificationIds(prev => {
        const newSet = new Set(prev);
        newNotifications.forEach(n => newSet.add(n.id));
        return newSet;
      });

      // Show only the latest 3 notifications
      setVisibleNotifications(prev => {
        const updated = [...prev, ...newNotifications].slice(-3);
        return updated;
      });

      // Set auto-dismiss timers for new notifications
      newNotifications.forEach(notification => {
        const timeoutId = setTimeout(() => {
          handleClose(notification.id);
        }, 5000);
        timeoutRefs.current.set(notification.id, timeoutId);
      });
    }

    lastNotificationCountRef.current = userNotifications.length;
  }, [notifications, user, processedNotificationIds, visibleNotifications]);

  const handleClose = (notificationId: string) => {
    // Clear the timeout for this notification
    const timeoutId = timeoutRefs.current.get(notificationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(notificationId);
    }

    // Mark as read and remove from visible notifications
    markNotificationRead(notificationId);
    setVisibleNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Responsive positioning
  const isMobile = window.innerWidth < 768;

  return (
    <div className={`fixed z-50 pointer-events-none ${
      isMobile 
        ? 'top-4 left-4 right-4' 
        : 'top-4 right-4 max-w-sm w-full'
    }`}>
      <div className="space-y-2 sm:space-y-3">
        <AnimatePresence mode="popLayout">
          {visibleNotifications.map((notification, index) => (
            <motion.div 
              key={notification.id} 
              className="pointer-events-auto"
              layout
            >
              <NotificationToast
                notification={notification}
                onClose={() => handleClose(notification.id)}
                index={index}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};