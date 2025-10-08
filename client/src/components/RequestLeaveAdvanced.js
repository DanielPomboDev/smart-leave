import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import axios from '../services/api';
import SuccessModal from './SuccessModal';
import ConfirmationModal from './ConfirmationModal';

const RequestLeaveAdvanced = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const [formData, setFormData] = useState({
    leaveType: '',
    otherSpecify: '',
    startDate: '',
    endDate: '',
    numberOfDays: 1,
    locationType: '',
    locationSpecify: '',
    commutation: ''
  });

  const [reviewData, setReviewData] = useState({
    leaveType: '',
    dateRange: '',
    numberOfDays: 1,
    location: '',
    commutation: ''
  });

  // State for leave credits
  const [vacationBalance, setVacationBalance] = useState(0);
  const [sickBalance, setSickBalance] = useState(0);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [userRole, setUserRole] = useState('');

  // Set minimum start date based on today
  useEffect(() => {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      startDate: formattedToday,
      endDate: formattedToday
    }));
  }, []);

  // Fetch current user role and leave credits
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get user info from the profile endpoint
      const response = await axios.get('/api/auth/profile');
      
      console.log('Profile response:', response.data); // Debug log
      
      if (response.data && response.data.success && response.data.user) {
        setUserRole(response.data.user.user_type || 'employee');
      } else {
        // Fallback to 'employee' if no user data is available
        setUserRole('employee');
      }

      // Fetch leave credits
      const creditsResponse = await axios.get('/api/leave-records/current');
      
      if (creditsResponse.data) {
        setVacationBalance(creditsResponse.data.vacationBalance || 0);
        setSickBalance(creditsResponse.data.sickBalance || 0);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Default to employee if we cannot determine role
      setUserRole('employee');
      // Set default values in case of error
      setVacationBalance(0);
      setSickBalance(0);
    } finally {
      setLoadingCredits(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Handle start date changes
  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setFormData(prev => ({
      ...prev,
      startDate: newStartDate
    }));
    
    // Update end date if it's before the new start date
    if (formData.endDate && newStartDate > formData.endDate) {
      setFormData(prev => ({
        ...prev,
        startDate: newStartDate,
        endDate: newStartDate
      }));
    }
  };

  // Calculate number of days between start and end dates
  const calculateDays = (start, end) => {
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
        const timeDiff = Math.abs(endDate.getTime() - startDate.getTime());
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
        return daysDiff;
      }
    }
    return 1;
  };

  // Calculate adjusted end date based on start date and number of days
  const calculateAdjustedEndDate = (startDate, numberOfDays) => {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(startDateObj.getDate() + numberOfDays - 1);
    return endDateObj.toISOString().split('T')[0];
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => {
      const updatedData = {
        ...prev,
        [name]: newValue
      };

      // Recalculate days when dates change
      if (name === 'startDate' || name === 'endDate') {
        const startDate = name === 'startDate' ? newValue : updatedData.startDate;
        const endDate = name === 'endDate' ? newValue : updatedData.endDate;
        updatedData.numberOfDays = calculateDays(startDate, endDate);
      }
      
      // Clear other specify field when changing leave type
      if (name === 'leaveType' && newValue !== 'others') {
        updatedData.otherSpecify = '';
      }
      
      // Clear location specify field when changing location type
      if (name === 'locationType' && newValue !== 'abroad' && newValue !== 'outpatient') {
        updatedData.locationSpecify = '';
      }
      
      return updatedData;
    });
  };

  // Validate current step
  const validateStep = (step) => {
    let isValid = true;
    setError('');

    // Step 1: Leave Type validation
    if (step === 1) {
      if (!formData.leaveType) {
        setError('Please select a leave type');
        isValid = false;
      } else if (formData.leaveType === 'others_specify' && !formData.otherSpecify.trim()) {
        setError('Please specify the leave purpose');
        isValid = false;
      }
    }
    
    // Step 2: Date Selection validation
    else if (step === 2) {
      if (!formData.startDate) {
        setError('Please select a start date');
        isValid = false;
      }
      if (!formData.endDate) {
        setError('Please select an end date');
        isValid = false;
      }
      
      if (formData.startDate && formData.endDate) {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (end < start) {
          setError('End date cannot be earlier than start date');
          isValid = false;
        }
        
        // Vacation leave specific validation - requires 5 days advance notice
        if (formData.leaveType === 'vacation') {
          const daysDifference = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
          if (daysDifference < 5) {
            setError('This type of leave must be applied at least 5 days before the start date');
            isValid = false;
          }
        }
      }
    }
    
    // Step 3: Details validation
    else if (step === 3) {
      // Only require location information for specific leave types
      const requiresLocationInfo = 
        formData.leaveType === 'vacation' || 
        formData.leaveType === 'special_privilege_leave' || 
        formData.leaveType === 'others_specify' || 
        formData.leaveType === 'study_leave' || 
        formData.leaveType === 'special_leave_benefits_women' ||
        formData.leaveType === 'sick';

      if (requiresLocationInfo) {
        if (!formData.locationType) {
          setError('Please select where the leave will be spent');
          isValid = false;
        }
        
        if ((formData.locationType === 'abroad' || formData.locationType === 'outpatient' || 
             formData.locationType === 'hospital') && !formData.locationSpecify.trim()) {
          setError('Please specify the location');
          isValid = false;
        }
      }
      
      if (!formData.commutation) {
        setError('Please select a commutation option');
        isValid = false;
      }
    }

    return isValid;
  };

  // Navigate to next step
  const nextStep = (currentStep) => {
    if (validateStep(currentStep)) {
      // If moving to the confirmation step (step 4), update the review
      if (currentStep === 3) {
        updateReviewSection();
      }
      
      setCurrentStep(prev => prev + 1);
    }
  };

  // Navigate to previous step
  const prevStep = (currentStep) => {
    setCurrentStep(prev => prev - 1);
  };

  // Update review section
  const updateReviewSection = () => {
    let leaveTypeText = '';
    
    // Map the leave type to its proper display name
    const leaveTypeMap = {
      'vacation': 'Vacation Leave',
      'sick': 'Sick Leave',
      'mandatory_forced_leave': 'Mandatory/Forced Leave',
      'maternity_leave': 'Maternity Leave',
      'paternity_leave': 'Paternity Leave',
      'special_privilege_leave': 'Special Privilege Leave',
      'solo_parent_leave': 'Solo Parent Leave',
      'study_leave': 'Study Leave',
      'vawc_leave': '10-Day VAWC Leave',
      'rehabilitation_privilege': 'Rehabilitation Privilege',
      'special_leave_benefits_women': 'Special Leave Benefits for Women',
      'special_emergency': 'Special Emergency (Calamity)',
      'adoption_leave': 'Adoption Leave',
      'others_specify': 'Others (Specify)'
    };
    
    if (formData.leaveType === 'others_specify') {
      leaveTypeText = 'Others (Specify)';
      // We'll show the specific text in the subtype field below
    } else {
      leaveTypeText = leaveTypeMap[formData.leaveType] || formData.leaveType;
    }
    
    const formatDate = (dateString) => {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('en-US', options);
    };
    
    let subtypeText = '';
    if (formData.leaveType === 'others_specify') {
      subtypeText = `(${formData.otherSpecify})`;
    }
    
    let locationText = '';
    if (formData.locationType === 'abroad' && formData.locationSpecify) {
      locationText = `Abroad: ${formData.locationSpecify}`;
    } else if (formData.locationType === 'outpatient' && formData.locationSpecify) {
      locationText = `Outpatient: ${formData.locationSpecify}`;
    } else if (formData.locationType === 'hospital' && formData.locationSpecify) {
      locationText = `In Hospital: ${formData.locationSpecify}`;
    } else {
      locationText = formData.locationType === 'philippines' ? 'Within the Philippines' : 
                    formData.locationType === 'hospital' ? 'In Hospital' : 
                    formData.locationType === 'masteral' ? 'Completion of Master\'s Degree' :
                    formData.locationType === 'board_review' ? 'BAR/Board Examination Review' :
                    formData.locationType;
    }
    
    const commutationText = formData.commutation === '1' ? 'Requested' : 'Not Requested';
    
    setReviewData({
      leaveType: leaveTypeText,
      dateRange: `${formatDate(formData.startDate)} to ${formatDate(formData.endDate)}`,
      numberOfDays: `${formData.numberOfDays} day${formData.numberOfDays === 1 ? '' : 's'}`,
      location: locationText,
      commutation: commutationText
    });
  };

  // Submit leave request with role-based approval logic
  const submitLeaveRequest = async () => {
    // Close confirmation modal
    setShowConfirmModal(false);
    setLoading(true);
    setError('');
    
    try {
      // Client-side validation for insufficient credits BEFORE submitting
      const numberOfDaysFloat = parseFloat(formData.numberOfDays);
      const availableCredits = formData.leaveType === 'vacation' ? vacationBalance : sickBalance;
      
      // Check if user has insufficient credits
      if (numberOfDaysFloat > availableCredits) {
        // If employee has less than 1 credit, show without pay warning
        if (availableCredits < 1) {
          const leaveType = formData.leaveType === 'vacation' ? 'Vacation' : 'Sick';
          const warningMsg = `You have no ${leaveType.toLowerCase()} leave credits available. This leave will be considered without pay. Do you want to proceed?`;
          setWarningMessage(warningMsg);
          setShowWarningModal(true);
          setLoading(false);
          return;
        } else {
          // Partial credits - show adjustment warning and calculate adjusted values
          const wholeDays = Math.floor(availableCredits);
          const adjustedEndDate = calculateAdjustedEndDate(formData.startDate, wholeDays);
          const warningMsg = `You only have ${availableCredits.toFixed(3)} ${formData.leaveType} leave credits available. Your leave request will be adjusted to ${wholeDays} day${wholeDays === 1 ? '' : 's'} ending on ${adjustedEndDate}. Do you want to proceed?`;
          setWarningMessage(warningMsg);
          
          // Store the adjusted values for use when user confirms
          const adjustedData = {
            ...formData,
            numberOfDays: wholeDays,
            endDate: adjustedEndDate
          };
          
          // Store adjusted data in state so we can use it in the warning modal
          setFormData(prev => ({
            ...prev,
            _adjustedData: adjustedData
          }));
          
          setShowWarningModal(true);
          setLoading(false);
          return;
        }
      }
      
      // Prepare data for submission (use adjusted data if available)
      const isAdjusted = formData._adjustedData !== undefined;
      const submitData = isAdjusted ? formData._adjustedData : formData;
      
      // Determine where_spent based on leave type requirements
      let whereSpentValue = submitData.locationType;
      const requiresLocationInfo = 
        submitData.leaveType === 'vacation' || 
        (submitData.leaveType === 'others' && 
         formData.otherLeaveType === 'special_privilege_leave' || 
         formData.otherLeaveType === 'study_leave' || 
         formData.otherLeaveType === 'others_specify') ||
        submitData.leaveType === 'sick' ||
        submitData.leaveType === 'special_privilege_leave' ||
        submitData.leaveType === 'study_leave' ||
        submitData.leaveType === 'special_leave_benefits_women';

      if (!requiresLocationInfo) {
        whereSpentValue = 'not_applicable'; // Use a default value for leave types that don't require location
      }

      // For the new structure, we will use leave_type directly with the correct value
      // If leaveType is 'others_specify', we use the otherSpecify value
      const actualLeaveType = submitData.leaveType === 'others_specify' 
        ? submitData.otherSpecify 
        : submitData.leaveType;

      // Prepare the request data based on role
      const requestData = {
        leave_type: actualLeaveType,
        start_date: submitData.startDate,
        end_date: submitData.endDate,
        number_of_days: submitData.numberOfDays,
        where_spent: whereSpentValue,
        commutation: submitData.commutation,
        location_specify: submitData.locationSpecify
      };

      // Add a special field to indicate role-based handling
      if (userRole === 'department_admin' || userRole === 'hr' || userRole === 'mayor') {
        requestData.role_based_approval = true;
        requestData.requester_role = userRole;
      }

      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      // Make API call
      const response = await axios.post('/api/leave-requests', requestData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Show success modal
        setShowSuccessModal(true);
        
        // Clean up adjusted data if it was used
        if (isAdjusted) {
          setFormData(prev => {
            const newData = { ...prev._adjustedData };
            delete newData._adjustedData;
            return newData;
          });
        }
        
        // Determine where to navigate based on role
        setTimeout(() => {
          setShowSuccessModal(false);
          // All roles will go to their own leave history
          // Handle special case for department_admin
          const basePath = userRole === 'department_admin' ? '/department_admin' : `/${userRole}`;
          navigate(`${basePath}/leave-history`);
        }, 3000);
      } else {
        setError(response.data.message || 'Failed to submit leave request');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to submit leave request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show leave type options
  const showSubtype = (leaveType) => {
    setFormData(prev => ({
      ...prev,
      leaveType: leaveType,
      otherSpecify: ''
    }));
  };

  // Get minimum start date based on leave type
  const getMinStartDate = () => {
    if (formData.leaveType === 'vacation') {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 5);
      return minDate.toISOString().split('T')[0];
    }
    // For sick leave and other leave types, allow immediate selection
    return new Date().toISOString().split('T')[0];
  };

  // Show different message based on role
  const getRoleMessage = () => {
    if (userRole === 'department_admin') {
      return "As a Department Admin, your leave request will be sent directly to HR for approval.";
    } else if (userRole === 'hr') {
      return "As an HR Manager, your leave request will be sent directly to the Mayor for approval.";
    } else if (userRole === 'mayor') {
      return "As the Mayor, your leave request will be automatically approved and recorded.";
    } else {
      return "New Leave Request";
    }
  };

  // Show different message based on role
  const getRoleBasedMessage = (role) => {
    switch (role) {
      case 'department_admin':
        return "It will be forwarded directly to HR for approval.";
      case 'hr':
        return "It will be forwarded directly to the Mayor for approval.";
      case 'mayor':
        return "It has been automatically approved and recorded.";
      default:
        return "It is pending approval.";
    }
  };

  // Show loading state while fetching user data
  if (loadingCredits) {
    return (
      <Layout>
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Request Leave</h1>
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

  return (
    <Layout>
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Request Leave</h1>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          
          <div className="card bg-white shadow-md mb-6">
            <div className="card-body">
              <h2 className="card-title text-xl font-bold text-gray-800 mb-4">
                <i className="fas fa-calendar-plus text-blue-500 mr-2"></i>
                {getRoleMessage()}
              </h2>
              
              {/* User Role specific information */}
              {userRole && (
                <div className="alert bg-info text-info-content mb-4">
                  <div>
                    <i className="fas fa-info-circle mr-2"></i>
                    <span>Role: {userRole.toLowerCase().replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  </div>
                </div>
              )}
              
              {/* Leave Credits Display */}
              {!loadingCredits && (vacationBalance !== 0 || sickBalance !== 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="mr-3 flex-shrink-0">
                        <i className="fas fa-sun text-blue-500 text-xl"></i>
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Vacation Leave</p>
                        <p className="text-2xl font-bold text-gray-800">{vacationBalance.toFixed(3)} days</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="mr-3 flex-shrink-0">
                        <i className="fas fa-heart text-green-500 text-xl"></i>
                      </div>
                      <div>
                        <p className="text-sm text-green-600 font-medium">Sick Leave</p>
                        <p className="text-2xl font-bold text-gray-800">{sickBalance.toFixed(3)} days</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Loading state for credits */}
              {loadingCredits && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="mr-3 flex-shrink-0">
                        <i className="fas fa-sun text-blue-500 text-xl"></i>
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Vacation Leave</p>
                        <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="mr-3 flex-shrink-0">
                        <i className="fas fa-heart text-green-500 text-xl"></i>
                      </div>
                      <div>
                        <p className="text-sm text-green-600 font-medium">Sick Leave</p>
                        <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step Indicator */}
              <div className="w-full py-4">
                <ul className="steps steps-horizontal w-full">
                  <li className={`step ${currentStep >= 1 ? 'step-primary' : ''}`}>Leave Type</li>
                  <li className={`step ${currentStep >= 2 ? 'step-primary' : ''}`}>Date Selection</li>
                  <li className={`step ${currentStep >= 3 ? 'step-primary' : ''}`}>Details</li>
                  <li className={`step ${currentStep >= 4 ? 'step-primary' : ''}`}>Confirmation</li>
                </ul>
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="alert alert-error shadow-lg mb-6">
                  <div>
                    <i className="fas fa-exclamation-circle text-error"></i>
                    <span>{error}</span>
                  </div>
                </div>
              )}
              
              {/* Step 1: Leave Type */}
              {currentStep === 1 && (
                <div id="step1" className="space-y-6">
                  <h3 className="font-medium text-lg text-gray-800">Select Leave Type</h3>
                  
                  <div className="space-y-4">
                    {/* Vacation Leave */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'vacation', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="vacationLeave" 
                          value="vacation" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'vacation'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="vacationLeave" className="ml-2 font-medium text-gray-800">Vacation Leave</label>
                      </div>
                      {formData.leaveType === 'vacation' && (
                        <div className="alert bg-blue-100 border border-blue-300 text-blue-700 px-4 py-2 rounded mt-2">
                          <i className="fas fa-info-circle mr-2"></i>
                          <span className="text-xs">Vacation leave must be applied at least 5 days before the start date</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Sick Leave */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'sick', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="sickLeave" 
                          value="sick" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'sick'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="sickLeave" className="ml-2 font-medium text-gray-800">Sick Leave</label>
                      </div>
                      {formData.leaveType === 'sick' && (
                        <div className="alert bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded mt-2">
                          <i className="fas fa-check-circle mr-2"></i>
                          <span className="text-xs">Sick leave can be applied after the leave period</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Mandatory/Forced Leave */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'mandatory_forced_leave', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="mandatoryForcedLeave" 
                          value="mandatory_forced_leave" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'mandatory_forced_leave'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="mandatoryForcedLeave" className="ml-2 font-medium text-gray-800">Mandatory/Forced Leave</label>
                      </div>
                    </div>
                    
                    {/* Maternity Leave */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'maternity_leave', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="maternityLeave" 
                          value="maternity_leave" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'maternity_leave'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="maternityLeave" className="ml-2 font-medium text-gray-800">Maternity Leave</label>
                      </div>
                    </div>
                    
                    {/* Paternity Leave */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'paternity_leave', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="paternityLeave" 
                          value="paternity_leave" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'paternity_leave'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="paternityLeave" className="ml-2 font-medium text-gray-800">Paternity Leave</label>
                      </div>
                    </div>
                    
                    {/* Special Privilege Leave */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'special_privilege_leave', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="specialPrivilegeLeave" 
                          value="special_privilege_leave" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'special_privilege_leave'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="specialPrivilegeLeave" className="ml-2 font-medium text-gray-800">Special Privilege Leave</label>
                      </div>
                    </div>
                    
                    {/* Solo Parent Leave */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'solo_parent_leave', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="soloParentLeave" 
                          value="solo_parent_leave" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'solo_parent_leave'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="soloParentLeave" className="ml-2 font-medium text-gray-800">Solo Parent Leave</label>
                      </div>
                    </div>
                    
                    {/* Study Leave */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'study_leave', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="studyLeave" 
                          value="study_leave" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'study_leave'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="studyLeave" className="ml-2 font-medium text-gray-800">Study Leave</label>
                      </div>
                    </div>
                    
                    {/* 10-Day VAWC Leave */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'vawc_leave', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="vawcLeave" 
                          value="vawc_leave" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'vawc_leave'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="vawcLeave" className="ml-2 font-medium text-gray-800">10-Day VAWC Leave</label>
                      </div>
                    </div>
                    
                    {/* Rehabilitation Privilege */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'rehabilitation_privilege', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="rehabilitationPrivilege" 
                          value="rehabilitation_privilege" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'rehabilitation_privilege'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="rehabilitationPrivilege" className="ml-2 font-medium text-gray-800">Rehabilitation Privilege</label>
                      </div>
                    </div>
                    
                    {/* Special Leave Benefits for Women */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'special_leave_benefits_women', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="specialLeaveBenefitsWomen" 
                          value="special_leave_benefits_women" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'special_leave_benefits_women'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="specialLeaveBenefitsWomen" className="ml-2 font-medium text-gray-800">Special Leave Benefits for Women</label>
                      </div>
                    </div>
                    
                    {/* Special Emergency (Calamity) */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'special_emergency', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="specialEmergency" 
                          value="special_emergency" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'special_emergency'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="specialEmergency" className="ml-2 font-medium text-gray-800">Special Emergency (Calamity)</label>
                      </div>
                    </div>
                    
                    {/* Adoption Leave */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'adoption_leave', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="adoptionLeave" 
                          value="adoption_leave" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'adoption_leave'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="adoptionLeave" className="ml-2 font-medium text-gray-800">Adoption Leave</label>
                      </div>
                    </div>
                    
                    {/* Others (Specify) */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => setFormData(prev => ({...prev, leaveType: 'others_specify', otherSpecify: ''}))}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="othersSpecify" 
                          value="others_specify" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'others_specify'}
                          onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                        />
                        <label htmlFor="othersSpecify" className="ml-2 font-medium text-gray-800">Others (specify)</label>
                      </div>
                      
                      {formData.leaveType === 'others_specify' && (
                        <div className="pl-6 mt-3">
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text text-gray-700">Please specify the purpose of your leave</span>
                            </label>
                            <input 
                              type="text" 
                              id="otherSpecify" 
                              name="otherSpecify" 
                              value={formData.otherSpecify}
                              onChange={handleInputChange}
                              placeholder="Please specify" 
                              className="input input-bordered border-gray-300 focus:border-blue-500 w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <button 
                      type="button" 
                      className="btn bg-blue-500 hover:bg-blue-600 text-white" 
                      onClick={() => nextStep(1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              
              {/* Step 2: Date Selection */}
              {currentStep === 2 && (
                <div id="step2" className="space-y-6">
                  <h3 className="font-medium text-lg text-gray-800">Date Selection</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium text-gray-700">Start Date</span>
                      </label>
                      <input 
                        type="date" 
                        name="startDate" 
                        className="input input-bordered border-gray-300 focus:border-blue-500 w-full" 
                        value={formData.startDate}
                        onChange={handleStartDateChange}
                        min={getMinStartDate()}
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium text-gray-700">End Date</span>
                      </label>
                      <input 
                        type="date" 
                        name="endDate" 
                        className="input input-bordered border-gray-300 focus:border-blue-500 w-full" 
                        value={formData.endDate}
                        onChange={handleInputChange}
                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium text-gray-700">Number of Days</span>
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      step="1" 
                      name="numberOfDays" 
                      className="input input-bordered border-gray-300 focus:border-blue-500 w-full" 
                      value={formData.numberOfDays}
                      readOnly
                    />
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-700 flex items-center">
                      <i className="fas fa-info-circle mr-2"></i>
                      <span>The number of days will be automatically calculated based on your selected dates.</span>
                    </p>
                  </div>
                  
                  <div className="flex justify-between mt-6">
                    <button 
                      type="button" 
                      className="btn btn-outline border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white" 
                      onClick={() => prevStep(2)}
                    >
                      Previous
                    </button>
                    <button 
                      type="button" 
                      className="btn bg-blue-500 hover:bg-blue-600 text-white" 
                      onClick={() => nextStep(2)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              
              {/* Step 3: Details */}
              {currentStep === 3 && (
                <div id="step3" className="space-y-6">
                  <h3 className="font-medium text-lg text-gray-800">Leave Details</h3>
                  
                  {/* Where Leave Will Be Spent */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">Where Leave Will Be Spent</h4>
                    
                    {/* For Vacation Leave */}
                    {(formData.leaveType === 'vacation' || 
                      formData.leaveType === 'special_privilege_leave' || 
                      formData.leaveType === 'study_leave' || 
                      formData.leaveType === 'others_specify') && (
                      <div id="vacationLocation" className="space-y-3">
                        <div className="form-control">
                          <label className="label cursor-pointer justify-start gap-2">
                            <input 
                              type="radio" 
                              name="locationType" 
                              value="philippines" 
                              className="radio radio-sm radio-primary" 
                              checked={formData.locationType === 'philippines'}
                              onChange={handleInputChange}
                            />
                            <span className="label-text text-gray-700">Within the Philippines</span>
                          </label>
                        </div>
                        
                        <div className="form-control">
                          <label className="label cursor-pointer justify-start gap-2">
                            <input 
                              type="radio" 
                              name="locationType" 
                              value="abroad" 
                              className="radio radio-sm radio-primary" 
                              checked={formData.locationType === 'abroad'}
                              onChange={handleInputChange}
                            />
                            <span className="label-text text-gray-700">Abroad (please specify)</span>
                          </label>
                          
                          {formData.locationType === 'abroad' && (
                            <input 
                              type="text" 
                              id="locationSpecify" 
                              name="locationSpecify" 
                              value={formData.locationSpecify}
                              onChange={handleInputChange}
                              placeholder="Please specify country" 
                              className="input input-bordered input-sm mt-1 ml-6 w-3/4 border-gray-300 focus:border-blue-500"
                            />
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* For Sick Leave only (excluding maternity, paternity, solo parent, etc.) */}
                    {formData.leaveType === 'sick' && (
                      <div id="sickLocation" className="space-y-3">
                        <div className="form-control">
                          <label className="label cursor-pointer justify-start gap-2">
                            <input 
                              type="radio" 
                              name="locationType" 
                              value="hospital" 
                              className="radio radio-sm radio-primary" 
                              checked={formData.locationType === 'hospital'}
                              onChange={handleInputChange}
                            />
                            <span className="label-text text-gray-700">In Hospital (specify illness)</span>
                          </label>
                          
                          {formData.locationType === 'hospital' && (
                            <input 
                              type="text" 
                              id="locationSpecify" 
                              name="locationSpecify" 
                              value={formData.locationSpecify}
                              onChange={handleInputChange}
                              placeholder="Please specify illness" 
                              className="input input-bordered input-sm mt-1 ml-6 w-3/4 border-gray-300 focus:border-blue-500"
                            />
                          )}
                        </div>
                        
                        <div className="form-control">
                          <label className="label cursor-pointer justify-start gap-2">
                            <input 
                              type="radio" 
                              name="locationType" 
                              value="outpatient" 
                              className="radio radio-sm radio-primary" 
                              checked={formData.locationType === 'outpatient'}
                              onChange={handleInputChange}
                            />
                            <span className="label-text text-gray-700">Out Patient (specify illness)</span>
                          </label>
                          
                          {formData.locationType === 'outpatient' && (
                            <input 
                              type="text" 
                              id="locationSpecify" 
                              name="locationSpecify" 
                              value={formData.locationSpecify}
                              onChange={handleInputChange}
                              placeholder="Please specify illness" 
                              className="input input-bordered input-sm mt-1 ml-6 w-3/4 border-gray-300 focus:border-blue-500"
                            />
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* For Special Leave Benefits for Women */}
                    {formData.leaveType === 'special_leave_benefits_women' && (
                      <div id="specialWomenLocation" className="space-y-3">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text text-gray-700">Specify Illness</span>
                          </label>
                          <input 
                            type="text" 
                            id="locationSpecify" 
                            name="locationSpecify" 
                            value={formData.locationSpecify}
                            onChange={handleInputChange}
                            placeholder="Please specify illness" 
                            className="input input-bordered w-full border-gray-300 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* For Study Leave */}
                    {formData.leaveType === 'study_leave' && (
                      <div id="studyLocation" className="space-y-3">
                        <div className="form-control">
                          <label className="label cursor-pointer justify-start gap-2">
                            <input 
                              type="radio" 
                              name="locationType" 
                              value="masteral" 
                              className="radio radio-sm radio-primary" 
                              checked={formData.locationType === 'masteral'}
                              onChange={handleInputChange}
                            />
                            <span className="label-text text-gray-700">Completion of Master's Degree</span>
                          </label>
                        </div>
                        
                        <div className="form-control">
                          <label className="label cursor-pointer justify-start gap-2">
                            <input 
                              type="radio" 
                              name="locationType" 
                              value="board_review" 
                              className="radio radio-sm radio-primary" 
                              checked={formData.locationType === 'board_review'}
                              onChange={handleInputChange}
                            />
                            <span className="label-text text-gray-700">BAR/Board Examination Review</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Commutation */}
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-800">Commutation</h4>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="commutation" 
                          value="1" 
                          className="radio radio-sm radio-primary" 
                          checked={formData.commutation === '1'}
                          onChange={handleInputChange}
                        />
                        <span className="label-text text-gray-700">Requested</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="commutation" 
                          value="0" 
                          className="radio radio-sm radio-primary" 
                          checked={formData.commutation === '0'}
                          onChange={handleInputChange}
                        />
                        <span className="label-text text-gray-700">Not Requested</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex justify-between mt-6">
                    <button 
                      type="button" 
                      className="btn btn-outline border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white" 
                      onClick={() => prevStep(3)}
                    >
                      Previous
                    </button>
                    <button 
                      type="button" 
                      className="btn bg-blue-500 hover:bg-blue-600 text-white" 
                      onClick={() => nextStep(3)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              
              {/* Step 4: Confirmation */}
              {currentStep === 4 && (
                <div id="step4" className="space-y-6">
                  {/* Confirmation header */}
                  <h3 className="font-medium text-lg text-gray-800">Review Your Leave Request</h3>
                  
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gray-100 p-4 border-b border-gray-300">
                      <h4 className="text-center font-bold text-gray-800 text-lg">DETAILS OF APPLICATION</h4>
                    </div>
                    
                    {/* Form Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      {/* Left Column */}
                      <div className="p-4 border-r border-gray-300">
                        <div className="mb-6">
                          <h5 className="font-bold text-gray-800 mb-2">TYPE OF LEAVE</h5>
                          <div className="pl-4">
                            <p className="text-gray-700">
                              <span>{reviewData.leaveType}</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="mb-6">
                          <h5 className="font-bold text-gray-800 mb-2">NUMBER OF WORKING DAYS:</h5>
                          <p className="pl-4 text-gray-700">{reviewData.numberOfDays}</p>
                        </div>
                        
                        <div className="mb-6">
                          <h5 className="font-bold text-gray-800 mb-2">Inclusive Dates:</h5>
                          <p className="pl-4 text-gray-700">{reviewData.dateRange}</p>
                        </div>
                      </div>
                      
                      {/* Right Column */}
                      <div className="p-4">
                        <div className="mb-6">
                          <h5 className="font-bold text-gray-800 mb-2">WHERE LEAVE WILL BE SPENT</h5>
                          <div className="pl-4">
                            <p className="text-gray-700">{reviewData.location}</p>
                          </div>
                        </div>
                        
                        <div className="mb-6">
                          <h5 className="font-bold text-gray-800 mb-2">COMMUTATION:</h5>
                          <div className="pl-4">
                            <p className="text-gray-700">{reviewData.commutation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Role-specific message */}
                  <div className="mt-4 p-4 bg-info text-info-content rounded-lg">
                    <div className="flex">
                      <i className="fas fa-info-circle mt-1 mr-2"></i>
                      <div>
                        <p className="font-medium">Approval Process:</p>
                        <p>
                          {userRole === 'department_admin' ? "Your request will be sent directly to HR for approval." :
                           userRole === 'hr' ? "Your request will be sent directly to the Mayor for approval." :
                           userRole === 'mayor' ? "Your request will be automatically approved and recorded." :
                           "Your request will follow the standard approval process."}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between mt-6">
                    <button 
                      type="button" 
                      className="btn btn-outline border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white" 
                      onClick={() => prevStep(4)}
                    >
                      Previous
                    </button>
                    <button 
                      type="button" 
                      className="btn bg-blue-500 hover:bg-blue-600 text-white" 
                      onClick={() => setShowConfirmModal(true)}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Submitting...
                        </>
                      ) : (
                        'Submit Request'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Leave Request Submitted"
        message={`Your leave request has been submitted successfully. ${
          getRoleBasedMessage(userRole)
        }`}
        onConfirm={() => {
          setShowSuccessModal(false);
          // Handle special case for department_admin
          const basePath = userRole === 'department_admin' ? '/department_admin' : `/${userRole}`;
          navigate(`${basePath}/leave-history`);
        }}
      />

      {/* Warning Modal */}
      <ConfirmationModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        onConfirm={async () => {
          // Close the warning modal and submit the request
          setShowWarningModal(false);
          setLoading(true);
          setError('');
          
          // Use adjusted data if available, otherwise use original data
          const isAdjusted = formData._adjustedData !== undefined;
          const submitData = isAdjusted ? formData._adjustedData : formData;
          
          try {
            // Prepare data for submission
            // Determine where_spent based on leave type requirements
            let whereSpentValue = submitData.locationType;
            const requiresLocationInfo = 
              submitData.leaveType === 'vacation' || 
              submitData.leaveType === 'special_privilege_leave' || 
              submitData.leaveType === 'others_specify' || 
              submitData.leaveType === 'study_leave' || 
              submitData.leaveType === 'special_leave_benefits_women' ||
              submitData.leaveType === 'sick';

            if (!requiresLocationInfo) {
              whereSpentValue = 'not_applicable'; // Use a default value for leave types that don't require location
            }

            // For the new structure, we will use leave_type directly with the correct value
            // If leaveType is 'others_specify', we use the otherSpecify value
            const actualLeaveType = submitData.leaveType === 'others_specify' 
              ? submitData.otherSpecify 
              : submitData.leaveType;

            // Prepare the request data based on role
            const requestData = {
              leave_type: actualLeaveType,
              start_date: submitData.startDate,
              end_date: submitData.endDate,
              number_of_days: submitData.numberOfDays,
              where_spent: whereSpentValue,
              commutation: submitData.commutation,
              location_specify: submitData.locationSpecify
            };

            // Add a special field to indicate role-based handling
            if (userRole === 'department_admin' || userRole === 'hr' || userRole === 'mayor') {
              requestData.role_based_approval = true;
              requestData.requester_role = userRole;
            }

            // Get token from localStorage
            const token = localStorage.getItem('token');
            
            // Make API call
            const response = await axios.post('/api/leave-requests', requestData, {
              headers: {
                'Content-Type': 'application/json'
              }
            });

            if (response.data.success) {
              // Show success modal
              setShowSuccessModal(true);
              
              // Reset form after a delay
              setTimeout(() => {
                setShowSuccessModal(false);
                // Handle special case for department_admin
                const basePath = userRole === 'department_admin' ? '/department_admin' : `/${userRole}`;
                navigate(`${basePath}/leave-history`);
              }, 3000);
            } else {
              setError(response.data.message || 'Failed to submit leave request');
            }
          } catch (error) {
            console.error('Error submitting leave request:', error);
            if (error.response?.data?.message) {
              setError(error.response.data.message);
            } else {
              setError('Failed to submit leave request. Please try again.');
            }
          } finally {
            setLoading(false);
          }
        }}
        title="Leave Request Warning"
        message={warningMessage}
        confirmText="Continue"
        cancelText="Cancel"
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={submitLeaveRequest}
        title="Confirm Leave Request"
        message="Are you sure you want to submit this leave request?"
        confirmText="Submit"
      />
    </Layout>
  );
};

export default RequestLeaveAdvanced;