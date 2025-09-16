import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';
import { useNavigate } from 'react-router-dom';
import { requestForToken } from '../firebase';

const Settings = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    password_confirmation: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [savingToken, setSavingToken] = useState(false);
  const [tokenSaveError, setTokenSaveError] = useState('');

  useEffect(() => {
    // Check current notification permission status
    setNotificationPermission(Notification.permission);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else if (field === 'password_confirmation') {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;
    let feedback = [];

    // Length check
    if (password.length >= 8) {
      strength += 25;
    } else {
      feedback.push('At least 8 characters');
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      strength += 25;
    } else {
      feedback.push('Uppercase letter');
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      strength += 25;
    } else {
      feedback.push('Lowercase letter');
    }

    // Number check
    if (/[0-9]/.test(password)) {
      strength += 25;
    } else {
      feedback.push('Number');
    }

    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) {
      strength += 25;
    } else {
      feedback.push('Special character');
    }

    return {
      strength: Math.min(strength, 100),
      feedback
    };
  };

  const getPasswordStrengthColor = (strength) => {
    if (strength <= 25) return 'bg-red-500';
    if (strength <= 50) return 'bg-orange-500';
    if (strength <= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (strength) => {
    if (strength <= 25) return 'Weak';
    if (strength <= 50) return 'Fair';
    if (strength <= 75) return 'Good';
    return 'Strong';
  };

  const getPasswordStrengthTextColor = (strength) => {
    if (strength <= 25) return 'text-red-500';
    if (strength <= 50) return 'text-orange-500';
    if (strength <= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.password_confirmation) {
      newErrors.password_confirmation = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Passwords do not match';
    }
    
    const { strength } = checkPasswordStrength(formData.password);
    if (strength < 75) {
      newErrors.password = 'Please choose a stronger password';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    setMessageType('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/settings/password', formData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setMessageType('success');
        setMessage('Password changed successfully. You will be logged out shortly.');
        
        // Clear form
        setFormData({
          password: '',
          password_confirmation: ''
        });
        
        // Log out user after 3 seconds
        setTimeout(() => {
          localStorage.removeItem('token');
          navigate('/login');
        }, 3000);
      } else {
        setMessageType('error');
        setMessage(response.data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessageType('error');
      setMessage(error.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1); // Go back to previous page
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
      console.log('FCM Token retrieved:', token);
      
      if (token) {
        // Send token to server
        console.log('Sending FCM token to server...');
        const response = await axios.post('/api/auth/save-fcm-token', { fcmToken: token });
        console.log('Server response:', response.data);
        
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
      console.error('Error response:', error.response?.data);
      setTokenSaveError(error.response?.data?.message || 'Failed to save notification token');
    } finally {
      setSavingToken(false);
    }
  };

  const { strength, feedback } = checkPasswordStrength(formData.password);
  const strengthText = formData.password ? 
    (strength < 100 ? `Add ${feedback.join(', ')}` : getPasswordStrengthText(strength)) : 
    'Enter a new password';

  return (
    <Layout>
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Password Change Card */}
            <div className="card bg-white shadow-md">
              <div className="card-body">
                <h2 className="card-title text-xl font-bold text-gray-800 mb-6">
                  <i className="fas fa-lock text-blue-500 mr-2"></i>
                  Change Your Password
                </h2>

                {/* Message Display */}
                {message && (
                  <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-error'} shadow-lg mb-6`}>
                    <div>
                      <i className={`fas ${messageType === 'success' ? 'fa-check' : 'fa-exclamation-circle'}`}></i>
                      <span>{message}</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* New Password */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">New Password</span>
                    </label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        name="password" 
                        id="newPassword" 
                        className={`input input-bordered w-full pr-10 ${errors.password ? 'input-error' : ''}`} 
                        placeholder="Enter your new password" 
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                      <button 
                        type="button" 
                        className="absolute inset-y-0 right-0 px-3 flex items-center" 
                        onClick={() => togglePasswordVisibility('password')}
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400`}></i>
                      </button>
                    </div>
                    {errors.password && (
                      <label className="label">
                        <span className="label-text-alt text-red-500">{errors.password}</span>
                      </label>
                    )}
                    <label className="label">
                      <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                        Must be 8+ characters with letters, numbers, and symbols
                      </p>
                    </label>
                  </div>

                  {/* Confirm New Password */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Confirm New Password</span>
                    </label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        name="password_confirmation" 
                        id="confirmPassword" 
                        className={`input input-bordered w-full pr-10 ${errors.password_confirmation ? 'input-error' : ''}`} 
                        placeholder="Confirm your new password" 
                        value={formData.password_confirmation}
                        onChange={handleInputChange}
                        required
                      />
                      <button 
                        type="button" 
                        className="absolute inset-y-0 right-0 px-3 flex items-center" 
                        onClick={() => togglePasswordVisibility('password_confirmation')}
                      >
                        <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400`}></i>
                      </button>
                    </div>
                    {errors.password_confirmation && (
                      <label className="label">
                        <span className="label-text-alt text-red-500">{errors.password_confirmation}</span>
                      </label>
                    )}
                  </div>

                  {/* Password Strength Indicator */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="block text-sm font-medium text-gray-700">Password Strength</span>
                      <span className={`text-xs font-medium ${getPasswordStrengthTextColor(strength)}`} id="strengthText">
                        {strengthText}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ease-out ${getPasswordStrengthColor(strength)}`} 
                        id="passwordStrength" 
                        style={{ width: `${formData.password ? strength : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Informational Alert */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mt-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <i className="fas fa-info-circle text-blue-500 text-lg"></i>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          For security reasons, you'll be logged out after changing your password.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-6">
                    <button 
                      type="button" 
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 flex items-center"
                      id="submitButton"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="loading loading-spinner loading-sm mr-2"></span>
                          Changing...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-key mr-2"></i>
                          Change Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
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
                  
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <i className="fas fa-info-circle text-blue-500 text-lg"></i>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          You'll receive notifications for important events like leave request approvals, status updates, and other system notifications.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default Settings;