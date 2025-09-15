import React, { useState, useEffect, useRef } from 'react';
import Layout from './Layout';
import axios from '../services/api';
import { requestForToken } from '../firebase';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [savingToken, setSavingToken] = useState(false);
  const [tokenSaveError, setTokenSaveError] = useState('');
  const fileInputRef = useRef(null);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/auth/profile', {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data.success) {
          setUser(response.data.user);
        } else {
          setError(response.data.message || 'Failed to fetch profile data');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError(error.response?.data?.message || 'Failed to fetch profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <Layout>
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              No profile data available
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return 'US';
    const firstInitial = user.first_name ? user.first_name.charAt(0).toUpperCase() : 'U';
    const lastInitial = user.last_name ? user.last_name.charAt(0).toUpperCase() : 'S';
    return `${firstInitial}${lastInitial}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format salary
  const formatSalary = (salary) => {
    if (!salary) return '₱0.00';
    return `₱${parseFloat(salary).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Request notification permission and get FCM token
  const requestNotificationPermission = async () => {
    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      await getAndSaveToken();
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        await getAndSaveToken();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Get FCM token and save it to the server
  const getAndSaveToken = async () => {
    try {
      setSavingToken(true);
      setTokenSaveError('');
      
      const token = await requestForToken();
      if (token) {
        // Send token to server
        const response = await axios.post('/api/auth/save-fcm-token', { fcmToken: token });
        if (response.data.success) {
          console.log('FCM token saved successfully');
        } else {
          setTokenSaveError(response.data.message || 'Failed to save notification token');
        }
      } else {
        setTokenSaveError('Failed to get notification token');
      }
    } catch (error) {
      console.error('Error saving FCM token:', error);
      setTokenSaveError(error.response?.data?.message || 'Failed to save notification token');
    } finally {
      setSavingToken(false);
    }
  };

  // Handle image change
  const handleImageChange = (e) => {
    setUploadError('');
    // Reset file input if no file selected
    if (e.target.files.length === 0) {
      setPreviewImage(null);
      return;
    }
    
    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (jpg, png, gif)');
      setPreviewImage(null);
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit');
      setPreviewImage(null);
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle upload click
  const handleUploadClick = async () => {
    if (!fileInputRef.current || !fileInputRef.current.files.length) {
      setUploadError('Please select an image file first');
      return;
    }

    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      setUploading(true);
      setUploadError('');

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/auth/profile/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Update user state with new profile image
        setUser(prevUser => ({
          ...prevUser,
          profile_image: response.data.profile_image
        }));
        
        // Dispatch event to update profile in Layout
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: {
            user: {
              profile_image: response.data.profile_image
            }
          }
        }));
        
        // Reset file input and preview
        fileInputRef.current.value = '';
        setPreviewImage(null);
        
        // Show success modal
        setShowSuccessModal(true);
      } else {
        setUploadError(response.data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      setUploadError(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Picture Card */}
            <div className="card bg-white shadow-md">
              <div className="card-body flex flex-col items-center">
                <h2 className="card-title text-xl font-bold text-gray-800 mb-6 self-start">
                  <i className="fas fa-user text-blue-500 mr-2"></i>
                  Profile Picture
                </h2>
                
                <div className="avatar mb-6">
                  <div className="w-40 h-40 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 bg-blue-500 flex items-center justify-center overflow-hidden">
                    {previewImage ? (
                      <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : user?.profile_image ? (
                      <img 
                        src={user.profile_image} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-bold text-white flex items-center justify-center w-full h-full">
                        {getUserInitials()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4 w-full">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Update Profile Picture</span>
                    </label>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="file-input file-input-bordered w-full" 
                      accept="image/*" 
                      onChange={handleImageChange}
                      disabled={uploading}
                    />
                  </div>
                  
                  {uploadError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                      {uploadError}
                    </div>
                  )}
                  
                  <button 
                    className={`btn btn-primary w-full flex items-center justify-center ${uploading ? 'opacity-90' : ''}`}
                    onClick={handleUploadClick}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <span className="loading loading-spinner loading-sm mr-2"></span>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload mr-2"></i>
                        Upload New Picture
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Personal Information Card */}
            <div className="card bg-white shadow-md lg:col-span-2">
              <div className="card-body">
                <h2 className="card-title text-xl font-bold text-gray-800 mb-6">
                  <i className="fas fa-info-circle text-blue-500 mr-2"></i>
                  Personal Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                      <p className="text-lg font-semibold text-gray-800">
                        {user.first_name} {user.middle_initial ? user.middle_initial + '.' : ''} {user.last_name}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Employee ID</h3>
                      <p className="text-lg font-semibold text-gray-800">
                        {user.user_id || 'Not available'}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Position</h3>
                      <p className="text-lg font-semibold text-gray-800">
                        {user.position || 'Not available'}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Office/Agency</h3>
                      <p className="text-lg font-semibold text-gray-800">
                        {user.department_id?.name || 'Not assigned'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Right Column */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Date Hired</h3>
                      <p className="text-lg font-semibold text-gray-800">
                        {formatDate(user.start_date)}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Salary</h3>
                      <p className="text-lg font-semibold text-gray-800">
                        {formatSalary(user.salary)}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Email Address</h3>
                      <p className="text-lg font-semibold text-gray-800">
                        {user.email || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Notification Settings Card */}
            <div className="card bg-white shadow-md">
              <div className="card-body">
                <h2 className="card-title text-xl font-bold text-gray-800 mb-6">
                  <i className="fas fa-bell text-blue-500 mr-2"></i>
                  Notification Settings
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Push Notifications</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Enable push notifications to receive updates about your leave requests and other important events.
                    </p>
                    
                    {tokenSaveError && (
                      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
                        {tokenSaveError}
                      </div>
                    )}
                    
                    <div className="mt-4">
                      {notificationPermission === 'granted' ? (
                        <div className="flex items-center">
                          <div className="badge badge-success gap-2 mr-4">
                            <i className="fas fa-check"></i> Enabled
                          </div>
                          <button 
                            className="btn btn-sm btn-outline"
                            onClick={getAndSaveToken}
                            disabled={savingToken}
                          >
                            {savingToken ? (
                              <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Updating...
                              </>
                            ) : (
                              'Refresh Token'
                            )}
                          </button>
                        </div>
                      ) : (
                        <button 
                          className={`btn btn-primary ${savingToken ? 'opacity-90' : ''}`}
                          onClick={requestNotificationPermission}
                          disabled={savingToken}
                        >
                          {savingToken ? (
                            <>
                              <span className="loading loading-spinner loading-sm mr-2"></span>
                              Enabling...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-bell mr-2"></i>
                              Enable Notifications
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setShowSuccessModal(false)}
            ></div>
            
            {/* Modal */}
            <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-md z-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <i className="fas fa-check text-green-600 text-2xl"></i>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">Success!</h3>
                
                <p className="text-sm text-gray-500 mb-6">
                  Your profile picture has been updated successfully.
                </p>
                
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md"
                    onClick={() => setShowSuccessModal(false)}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
};

export default Profile;