import React, { createContext, useContext, useEffect, useState } from 'react';
import { FiBell, FiCheck, FiX, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

// Create a context for notifications
const NotificationContext = createContext();

/**
 * Notification types and their styles
 */
const NOTIFICATION_TYPES = {
  SUCCESS: {
    icon: <FiCheck className="text-green-500" />,
    colors: {
      light: 'bg-green-50 border-green-200 text-green-800',
      dark: 'bg-green-800/30 border-green-700 text-green-300'
    }
  },
  ERROR: {
    icon: <FiX className="text-red-500" />,
    colors: {
      light: 'bg-red-50 border-red-200 text-red-800',
      dark: 'bg-red-800/30 border-red-700 text-red-300'
    }
  },
  INFO: {
    icon: <FiInfo className="text-blue-500" />,
    colors: {
      light: 'bg-blue-50 border-blue-200 text-blue-800',
      dark: 'bg-blue-800/30 border-blue-700 text-blue-300'
    }
  },
  WARNING: {
    icon: <FiAlertTriangle className="text-amber-500" />,
    colors: {
      light: 'bg-amber-50 border-amber-200 text-amber-800',
      dark: 'bg-amber-800/30 border-amber-700 text-amber-300'
    }
  },
  ATTENDANCE: {
    icon: <FiBell className="text-indigo-500" />,
    colors: {
      light: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      dark: 'bg-indigo-800/30 border-indigo-700 text-indigo-300'
    }
  }
};

/**
 * Provider component for notifications
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const { isDarkMode } = useTheme();

  // Add a new notification
  const addNotification = (message, type = 'INFO', autoClose = true, duration = 5000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, timestamp: new Date().toISOString() }]);

    // Auto-close notification after duration
    if (autoClose) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id; // Return ID so it can be removed manually if needed
  };

  // Remove a notification by ID
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(note => note.id !== id));
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Value to be provided to consumers
  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Render the notification UI here */}
      <div className="fixed bottom-20 right-4 z-50 w-80 max-w-full space-y-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(notification => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 50, scale: 0.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className={`${
                NOTIFICATION_TYPES[notification.type]?.colors[isDarkMode ? 'dark' : 'light'] ||
                NOTIFICATION_TYPES.INFO.colors[isDarkMode ? 'dark' : 'light']
              } pointer-events-auto border rounded-lg shadow-lg overflow-hidden`}
            >
              <div className="flex p-4">
                <div className="flex-shrink-0">
                  {NOTIFICATION_TYPES[notification.type]?.icon || NOTIFICATION_TYPES.INFO.icon}
                </div>
                <div className="ml-3 w-0 flex-1">
                  <p className="text-sm font-medium">{notification.message}</p>
                  <p className="mt-1 text-xs opacity-75">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className={`rounded-md inline-flex text-sm font-medium transition-colors ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800'
                        : 'text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                    }`}
                    onClick={() => removeNotification(notification.id)}
                  >
                    <span className="sr-only">Close</span>
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

/**
 * Hook to use the notification context
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Export the types for easy use
export const NOTIFICATION_TYPE = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ATTENDANCE: 'ATTENDANCE'
}; 