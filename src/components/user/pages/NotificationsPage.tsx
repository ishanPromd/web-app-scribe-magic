import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faFileText, faRss, faBell, faUser, faSignOutAlt,
  faStar, faCheck, faExclamationCircle, faInfoCircle, faCheckCircle,
  faTrophy, faGraduationCap, faBookOpen, faAward, faBrain
} from '@fortawesome/free-solid-svg-icons';
import { useData } from '../../../hooks/useData';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import toast from 'react-hot-toast';

interface NotificationsPageProps {
  onNavigate: (tab: string) => void;
  activeTab: string;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate, activeTab }) => {
  const { notifications, markNotificationRead, fetchUserNotifications } = useData();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notifications when component mounts
  useEffect(() => {
    if (user?.id) {
      setRefreshing(true);
      fetchUserNotifications(user.id).finally(() => {
        setRefreshing(false);
      });
    }
  }, [user?.id, fetchUserNotifications]);

  // Filter notifications for current user - fixed logic
  const userNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Include notifications specifically for this user OR broadcast notifications (user_id is null)
      return n.userId === user?.id || n.userId === null;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, user?.id]);

  // Memoize unread notifications
  const unreadNotifications = useMemo(() => 
    userNotifications.filter(n => !n.readStatus),
    [userNotifications]
  );

  // Memoize bottom nav items
  const bottomNavItems = useMemo(() => [
    { id: 'home', name: 'Home', icon: faHome },
    { id: 'recent', name: 'Recent', icon: faFileText },
    { id: 'lessons', name: 'Lessons', icon: faRss },
    { id: 'my-lessons', name: 'My Lessons', icon: faBookOpen },
    { id: 'notifications', name: 'Notifications', icon: faBell },
  ], []);

  const handleNotificationClick = useCallback(async (notification: any) => {
    if (!notification.readStatus) {
      await markNotificationRead(notification.id);
    }
  }, [markNotificationRead]);

  const markAllAsRead = useCallback(async () => {
    if (unreadNotifications.length === 0) return;
    
    setLoading(true);
    try {
      for (const notification of unreadNotifications) {
        await markNotificationRead(notification.id);
      }
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    } finally {
      setLoading(false);
    }
  }, [unreadNotifications, markNotificationRead]);

  const refreshNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    setRefreshing(true);
    try {
      await fetchUserNotifications(user.id);
      toast.success('Notifications refreshed');
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      toast.error('Failed to refresh notifications');
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, fetchUserNotifications]);

  const getNotificationIcon = (notification: any) => {
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
        return faBell;
    }
  };

  const getNotificationColor = (notification: any) => {
    // Special styling for lesson approval notifications
    if (notification.type === 'broadcast' && notification.data?.icon === 'check-circle') {
      return 'text-green-600 bg-green-100 border-green-200';
    }
    
    if (notification.priority === 'high') return 'text-red-600 bg-red-100 border-red-200';
    if (notification.priority === 'medium') return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    
    switch (notification.type) {
      case 'quiz_result':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'achievement':
        return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'reminder':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'broadcast':
        return 'text-indigo-600 bg-indigo-100 border-indigo-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="error" size="sm">High Priority</Badge>;
      case 'medium':
        return <Badge variant="warning" size="sm">Medium</Badge>;
      case 'low':
        return <Badge variant="gray" size="sm">Low</Badge>;
      default:
        return null;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'quiz_result':
        return 'Quiz Result';
      case 'achievement':
        return 'Achievement';
      case 'reminder':
        return 'Reminder';
      case 'broadcast':
        return 'Announcement';
      default:
        return 'Notification';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Professional Container with Side Gaps */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 pb-24">
        {/* Enhanced Professional Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          
        >
        
          
         
            {/* Professional Stats */}
            
        </motion.div>

        {/* Enhanced Action Bar */}
        <div className="flex items-center justify-between mb-6 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20">
          <div className="flex items-center space-x-4">
            <Button
              size="sm"
              variant="outline"
              onClick={refreshNotifications}
              loading={refreshing}
              className="border-blue-300 text-blue-600 hover:bg-blue-50 rounded-full"
            >
              <FontAwesomeIcon icon={faBell} className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {unreadNotifications.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600 font-medium">
                  {unreadNotifications.length} unread notification{unreadNotifications.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          {unreadNotifications.length > 0 && (
            <Button
              size="sm"
              onClick={markAllAsRead}
              loading={loading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg rounded-full"
            >
              <FontAwesomeIcon icon={faCheck} className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Enhanced Professional Notifications List with PC Layout */}
        {userNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <FontAwesomeIcon icon={faBell} className="w-12 h-12 text-blue-600" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">All Caught Up!</h3>
            <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
              You're all up to date. New notifications about your learning progress, achievements, and important updates will appear here.
            </p>
            <div className="mt-6">
              <Button
                onClick={() => navigate('/home')}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg rounded-full"
              >
                <FontAwesomeIcon icon={faHome} className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence>
              {userNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{ 
                    delay: index * 0.05,
                    duration: 0.4,
                    type: "spring",
                    stiffness: 100
                  }}
                  className={`group relative bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-lg border transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.02] overflow-hidden ${
                    notification.readStatus 
                      ? 'border-gray-200 hover:border-gray-300' 
                      : 'border-blue-300 hover:border-blue-400 ring-2 ring-blue-100'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Premium glow effect for unread notifications */}
                  {!notification.readStatus && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-blue-400/5 via-purple-400/5 to-pink-400/5 rounded-2xl"
                      animate={{
                        background: [
                          'linear-gradient(45deg, rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05), rgba(236, 72, 153, 0.05))',
                          'linear-gradient(45deg, rgba(236, 72, 153, 0.05), rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05))',
                          'linear-gradient(45deg, rgba(147, 51, 234, 0.05), rgba(236, 72, 153, 0.05), rgba(59, 130, 246, 0.05))',
                        ]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                  
                  <div className="flex items-start space-x-4 relative z-10">
                    {/* Enhanced Icon */}
                    <div className="relative flex-shrink-0">
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border-2 ${getNotificationColor(notification)}`}
                      >
                        <FontAwesomeIcon icon={getNotificationIcon(notification)} className="w-6 h-6" />
                      </motion.div>
                      
                      {/* Floating decorative elements */}
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full opacity-30"
                      />
                      <motion.div
                        animate={{ 
                          scale: [1, 1.3, 1],
                          opacity: [0.2, 0.5, 0.2]
                        }}
                        transition={{ 
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.5
                        }}
                        className="absolute -bottom-1 -left-1 w-3 h-3 bg-purple-400 rounded-full opacity-20"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-base leading-tight mb-1 group-hover:text-blue-600 transition-colors">
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge 
                              variant={notification.type === 'broadcast' ? 'primary' : 'gray'} 
                              size="sm"
                              className="text-xs"
                            >
                              {getNotificationTypeLabel(notification.type)}
                            </Badge>
                            {getPriorityBadge(notification.priority)}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 ml-4">
                          {!notification.readStatus && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="relative"
                            >
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <motion.div
                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 w-3 h-3 bg-blue-400 rounded-full"
                              />
                            </motion.div>
                          )}
                          <div className="text-right">
                            <div className="text-xs text-gray-500 font-medium">
                              {new Date(notification.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(notification.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Message */}
                      <p className="text-sm text-gray-700 leading-relaxed mb-3">
                        {notification.message}
                      </p>
                      
                      {/* Additional data if available */}
                      {notification.data?.lesson_title && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                          <div className="flex items-center space-x-2">
                            <FontAwesomeIcon icon={faBookOpen} className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              Lesson: {notification.data.lesson_title}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 rounded-2xl transition-all duration-300 pointer-events-none" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Enhanced Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200/50 z-50">
        <div className="w-full px-4">
          <nav className="flex justify-around py-2">
            {bottomNavItems.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/${item.id}`)}
                className={`relative flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id
                    ? 'text-blue-600 bg-blue-50 shadow-lg scale-105' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="relative">
                  <FontAwesomeIcon icon={item.icon} className="w-5 h-5 mb-1" />
                  {item.id === 'notifications' && unreadNotifications.length > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                    >
                      {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                    </motion.div>
                  )}
                </div>
                <span className="text-xs font-medium">{item.name}</span>
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTabMobile"
                    className="absolute inset-0 bg-blue-100 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};