import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../services/notificationService';

const NotificationDropdown = ({ userId, userType, notificationCount, fetchNotificationCount }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch notifications when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, userId, userType, notificationCount]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications({ limit: 5 });
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.readAt) {
      try {
        await markNotificationAsRead(notification._id);
        fetchNotificationCount(); // Refetch notifications and update count
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    setIsOpen(false);

    // Open the related leave request when the notification carries its ID.
    const requestId = notification.data && notification.data.leave_request_id;
    if (requestId) {
      const base =
        userType === 'department_admin' ? '/department' :
        userType === 'hr' ? '/hr' :
        userType === 'mayor' ? '/mayor' :
        '/employee';
      const path = userType === 'mayor'
        ? `/mayor/leave-requests/${requestId}`
        : `${base}/leave-request/${requestId}`;
      navigate(path);
    }
  };

  const handleDeleteNotification = async (e, notification) => {
    e.stopPropagation();
    try {
      await deleteNotification(notification._id);
      setNotifications(prev => prev.filter(n => n._id !== notification._id));
      fetchNotificationCount(); // Refetch notifications and update count
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      fetchNotificationCount(); // Refetch notifications and update count
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className="text-gray-600 hover:text-blue-500 focus:outline-none relative"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <i className="fas fa-bell text-xl"></i>
        {notificationCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {notificationCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-64 md:w-80 bg-white rounded-md shadow-lg z-50 border border-gray-200 transform origin-top-right transition-all duration-200 ease-in-out"
        >
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
              {notificationCount > 0 && (
                <button 
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification._id}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    !notification.readAt ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.data.message}
                    </p>
                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      {!notification.readAt && (
                        <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                      )}
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-500 text-xs leading-none p-0.5"
                        onClick={(e) => handleDeleteNotification(e, notification)}
                        aria-label="Delete notification"
                        title="Delete notification"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(notification.createdAt)}
                  </p>
                  {notification.data.leave_type && (
                    <div className="mt-2 text-xs">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {notification.data.leave_type}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                const inboxPath =
                  userType === 'department_admin' ? '/department_admin/notifications' :
                  userType === 'hr' ? '/hr/notifications' :
                  userType === 'mayor' ? '/mayor/notifications' :
                  '/employee/notifications';
                navigate(inboxPath);
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-1.5 rounded-md hover:bg-blue-50"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;