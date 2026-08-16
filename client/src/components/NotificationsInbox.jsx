import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from './Layout';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../services/notificationService';

const PAGE_SIZE = 10;

const notificationBasePath = (pathname) => {
  if (pathname.startsWith('/department')) return '/department';
  if (pathname.startsWith('/hr')) return '/hr';
  if (pathname.startsWith('/mayor')) return '/mayor';
  return '/employee';
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const diffInHours = Math.floor((Date.now() - date) / (1000 * 60 * 60));
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}d ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const NotificationsInbox = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const base = notificationBasePath(location.pathname);

  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
      if (filter === 'unread') params.read = 'false';
      if (filter === 'read') params.read = 'true';
      const data = await getNotifications(params);
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  // Fetch the unread + grand totals for the summary cards
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [unreadData, allData] = await Promise.all([
          getNotifications({ read: 'false', limit: 1 }),
          getNotifications({ limit: 1 })
        ]);
        setUnreadTotal(unreadData.total || 0);
        setGrandTotal(allData.total || 0);
      } catch (error) {
        console.error('Error fetching notification counts:', error);
      }
    };
    loadCounts();
  }, [notifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const notifyChanged = () => {
    window.dispatchEvent(new Event('notificationsChanged'));
  };

  const handleOpen = (notification) => {
    if (!notification.readAt) {
      markNotificationAsRead(notification._id).catch((error) =>
        console.error('Error marking notification as read:', error)
      );
    }
    const requestId = notification.data && notification.data.leave_request_id;
    if (requestId) {
      const path =
        base === '/mayor'
          ? `/mayor/leave-requests/${requestId}`
          : `${base}/leave-request/${requestId}`;
      navigate(path);
    } else {
      // Legacy notification without a request link — just refresh the list.
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      notifyChanged();
    }
  };

  const handleMarkRead = async (notification) => {
    try {
      await markNotificationAsRead(notification._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      notifyChanged();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (notification) => {
    try {
      await deleteNotification(notification._id);
      setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
      setTotal((t) => Math.max(0, t - 1));
      setGrandTotal((t) => Math.max(0, t - 1));
      notifyChanged();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadTotal(0);
      notifyChanged();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Layout title="Notifications">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Unread Notifications</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{unreadTotal}</p>
              </div>
              <i className="fas fa-bell text-3xl text-blue-200"></i>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Notifications</p>
                <p className="text-3xl font-bold text-gray-700 mt-1">{grandTotal}</p>
              </div>
              <i className="fas fa-envelope-open-text text-3xl text-gray-200"></i>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              {['all', 'unread', 'read'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFilter(f);
                    setPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Read'}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              {unreadTotal > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50 border border-blue-200"
                >
                  Mark all as read
                </button>
              )}
              <button
                type="button"
                onClick={loadNotifications}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200"
              >
                <i className="fas fa-sync-alt mr-1"></i>Refresh
              </button>
            </div>
          </div>

          {/* List */}
          <div>
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <span className="loading loading-spinner loading-md"></span>
                <span className="ml-2 text-gray-500">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-16">
                <i className="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                <p className="text-gray-500">No notifications found</p>
                {filter !== 'all' && (
                  <button
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                    onClick={() => setFilter('all')}
                  >
                    Show all notifications
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <li
                    key={notification._id}
                    className={`px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.readAt ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => handleOpen(notification)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {!notification.readAt && (
                          <span className="h-2 w-2 bg-blue-500 rounded-full shrink-0"></span>
                        )}
                        <p
                          className={`text-sm ${
                            notification.readAt ? 'text-gray-600' : 'text-gray-900 font-medium'
                          }`}
                        >
                          {notification.data && notification.data.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400">{formatDate(notification.createdAt)}</span>
                        {notification.data && notification.data.leave_type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {notification.data.leave_type}
                          </span>
                        )}
                        {notification.data && notification.data.leave_request_id && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <i className="fas fa-arrow-right mr-1"></i>Open request
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      {!notification.readAt && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(notification);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                          aria-label="Mark as read"
                          title="Mark as read"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50"
                        aria-label="Delete notification"
                        title="Delete notification"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages} · {total} notification{total === 1 ? '' : 's'}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-left mr-1"></i>Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next<i className="fas fa-chevron-right ml-1"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default NotificationsInbox;
