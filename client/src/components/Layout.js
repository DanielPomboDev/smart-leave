import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from '../services/api';
import NotificationDropdown from './NotificationDropdown';

const Layout = ({ children, title = "Dashboard" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState({
    first_name: "John",
    last_name: "Doe",
    user_type: "employee",
    profile_image: null
  });

  // Fetch user profile on component mount and when location changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('/api/auth/profile', {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data.success) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // If there's an error, redirect to login
        localStorage.removeItem('token');
        navigate('/login');
      }
    };

    fetchUserProfile();
    
    // Listen for profile updates
    const handleProfileUpdate = (event) => {
      if (event.detail && event.detail.user) {
        setUser(prevUser => ({
          ...prevUser,
          ...event.detail.user
        }));
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [navigate, location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    handleLogout();
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Navigation items based on user type
  const getNavItems = () => {
    switch (user.user_type) {
      case 'department_admin':
        return [
          { label: "Dashboard", icon: "fas fa-home", route: "/department/dashboard" },
          { label: "Leave Requests", icon: "fas fa-history", route: "/department/leave-requests" },
          { label: "Profile", icon: "fas fa-user", route: "/employee/profile" },
          { label: "Settings", icon: "fas fa-cog", route: "/employee/settings" }
        ];
      case 'hr':
        return [
          { label: "Dashboard", icon: "fas fa-home", route: "/hr/dashboard" },
          { label: "Employees", icon: "fas fa-users", route: "/hr/employees" },
          { label: "Leave Records", icon: "fas fa-file-alt", route: "/hr/leave-records" },
          { label: "Leave Requests", icon: "fas fa-history", route: "/hr/leave-requests" },
          { label: "Profile", icon: "fas fa-user", route: "/employee/profile" },
          { label: "Settings", icon: "fas fa-cog", route: "/employee/settings" }
        ];
      case 'mayor':
        return [
          { label: "Dashboard", icon: "fas fa-home", route: "/mayor/dashboard" },
          { label: "Leave Requests", icon: "fas fa-history", route: "/mayor/leave-requests" },
          { label: "Profile", icon: "fas fa-user", route: "/employee/profile" },
          { label: "Settings", icon: "fas fa-cog", route: "/employee/settings" }
        ];
      default: // employee
        return [
          { label: "Dashboard", icon: "fas fa-home", route: "/employee/dashboard" },
          { label: "Leave History", icon: "fas fa-history", route: "/employee/leave-history" },
          { label: "Request Leave", icon: "fas fa-calendar-plus", route: "/employee/request-leave" },
          { label: "Profile", icon: "fas fa-user", route: "/employee/profile" },
          { label: "Settings", icon: "fas fa-cog", route: "/employee/settings" }
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen bg-base-200">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static z-50 inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out w-72 bg-white shadow-md flex flex-col h-screen`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="avatar">
                <div className="w-12 rounded-full">
                  <img src="/images/sj-logo.jpg" alt="Logo" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-bold text-blue-500">SmartLeave</h1>
                <h3 className="text-sm font-semibold text-gray-500">LGU San Julian, Eastern Samar</h3>
              </div>
            </div>
            <button 
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <nav className="flex-grow py-4">
          {navItems.map((item, index) => (
            <Link
              key={index}
              to={item.route}
              className={`flex items-center px-6 py-3 text-gray-600 font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 ${
                location.pathname === item.route ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <i className={`${item.icon} mr-3 text-lg`}></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout button at bottom */}
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogoutClick}
            className="flex items-center px-6 py-3 text-gray-600 font-medium hover:bg-blue-50 transition-colors duration-200 w-full text-left"
          >
            <i className="fas fa-sign-out-alt mr-3 text-lg"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-grow overflow-y-auto">
        {/* Mobile top bar */}
        <div className="lg:hidden bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
            <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
            <div className="w-8"></div> {/* Spacer for alignment */}
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-800 hidden lg:block">{title}</h1>

            <div className="flex items-center space-x-4">
              <NotificationDropdown userId={user._id} userType={user.user_type} />

              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-gray-600">
                  {user.first_name} {user.last_name}
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {user.user_type === 'department_admin' ? 'Department Admin' : 
                   user.user_type === 'hr' ? 'HR Officer' : 
                   user.user_type === 'mayor' ? 'Mayor' : 
                   'Employee'}
                </span>
              </div>

              <div className="avatar placeholder">
                {user?.profile_image ? (
                  <div className="w-10 md:w-12 rounded-full">
                    <img 
                      src={user.profile_image} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-neutral text-neutral-content w-10 md:w-12 rounded-full">
                    <span className="text-lg md:text-xl">
                      {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main content */}
          {children}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={cancelLogout}
          ></div>
          
          {/* Modal */}
          <div className="bg-white rounded-lg shadow-xl p-4 md:p-6 w-full max-w-md z-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <i className="fas fa-sign-out-alt text-red-600 text-2xl"></i>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Logout</h3>
              
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to logout? You will need to log back in to access your account.
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-md"
                  onClick={cancelLogout}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md"
                  onClick={confirmLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;