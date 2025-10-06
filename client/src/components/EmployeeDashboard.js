import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import axios from '../services/api';
import RequestLeave from './RequestLeave';
import SuccessModal from './SuccessModal';
import ConfirmationModal from './ConfirmationModal';

const EmployeeDashboard = () => {
  // State for leave credits
  const [vacationBalance, setVacationBalance] = useState(0);
  const [sickBalance, setSickBalance] = useState(0);
  const [loadingCredits, setLoadingCredits] = useState(true);

  // State for recent leave requests
  const [recentLeaveRequests, setRecentLeaveRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const navigate = useNavigate();

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'disapproved':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'disapproved':
        return 'Disapproved';
      case 'recommended':
        return 'Recommended';
      case 'hr_approved':
        return 'HR Approved';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  // Quick Leave Request State
  const [quickLeaveData, setQuickLeaveData] = useState({
    step: 1,
    leaveType: '',
    otherLeaveType: '', // For storing the specific leave type when 'others' is selected
    otherSpecify: '',
    startDate: '',
    endDate: '',
    numberOfDays: 1,
    locationType: '',
    locationSpecify: '',
    commutation: false
  });

  const [quickLeaveErrors, setQuickLeaveErrors] = useState({});
  const [dateWarning, setDateWarning] = useState('');
  const [minStartDate, setMinStartDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch recent leave requests
  const fetchRecentLeaveRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/leave-requests', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Limit to 5 most recent requests
        const recentRequests = response.data.data.slice(0, 5);
        setRecentLeaveRequests(recentRequests);
      }
    } catch (error) {
      console.error('Error fetching recent leave requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Fetch current leave credits
  const fetchLeaveCredits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/leave-records/current', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        setVacationBalance(response.data.vacationBalance || 0);
        setSickBalance(response.data.sickBalance || 0);
      }
    } catch (error) {
      console.error('Error fetching leave credits:', error);
      // Set default values in case of error
      setVacationBalance(0);
      setSickBalance(0);
    } finally {
      setLoadingCredits(false);
    }
  };

  useEffect(() => {
    fetchRecentLeaveRequests();
    fetchLeaveCredits();
  }, []);

  // Set minimum start date based on today
  useEffect(() => {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    setMinStartDate(formattedToday);
    
    // Set default dates to today and calculate days
    const defaultData = {
      startDate: formattedToday,
      endDate: formattedToday
    };
    const numberOfDays = calculateDays(defaultData);
    
    setQuickLeaveData(prev => ({
      ...prev,
      ...defaultData,
      numberOfDays: numberOfDays
    }));
  }, []);

  // Calculate adjusted end date based on start date and number of days
  const calculateAdjustedEndDate = (startDate, numberOfDays) => {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(startDateObj.getDate() + numberOfDays - 1);
    return endDateObj.toISOString().split('T')[0];
  };

  // Handle input changes
  const handleQuickLeaveChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    // Special handling for certain fields
    if (name === 'leaveType') {
      // Set default location based on leave type
      let defaultLocation = null; // Default to null for leave types that don't require location
      
      // Only set location default if the leave type requires location info
      if (value === 'vacation' || 
          value === 'special_privilege_leave' || 
          value === 'others_specify' || 
          value === 'study_leave' || 
          value === 'special_leave_benefits_women') {
        defaultLocation = 'philippines';
      } else if (value === 'sick') {
        defaultLocation = 'hospital';
      } else if (value === 'study_leave') {
        defaultLocation = 'masteral'; // Default to Master's for study leave
      } else if (value === 'mandatory_forced_leave' || 
                 value === 'maternity_leave' || 
                 value === 'paternity_leave' || 
                 value === 'solo_parent_leave' || 
                 value === 'vawc_leave' || 
                 value === 'rehabilitation_privilege' || 
                 value === 'special_emergency' || 
                 value === 'adoption_leave') {
        // For other specific leave types, set appropriate defaults
        defaultLocation = 'philippines';
      } else {
        // For other leave types that don't require location options, don't set a default
        defaultLocation = null;
      }
      
      setQuickLeaveData(prev => ({
        ...prev,
        leaveType: value,
        otherLeaveType: '', // Reset otherLeaveType when changing leaveType
        otherSpecify: '',
        locationType: defaultLocation // May be null for leave types that don't require location
      }));
      return;
    }
    
    // Handle selection of specific leave type when 'others' is selected
    if (name === 'otherLeaveType') {
      // Set default location based on the selected leave type
      let defaultLocation = null;
      
      if (value === 'vacation' || 
          value === 'special_privilege_leave' || 
          value === 'others_specify' || 
          value === 'study_leave' || 
          value === 'special_leave_benefits_women') {
        defaultLocation = 'philippines';
      } else if (value === 'sick') {
        defaultLocation = 'hospital';
      } else if (value === 'study_leave') {
        defaultLocation = 'masteral';
      } else if (value === 'mandatory_forced_leave' || 
                 value === 'maternity_leave' || 
                 value === 'paternity_leave' || 
                 value === 'solo_parent_leave' || 
                 value === 'vawc_leave' || 
                 value === 'rehabilitation_privilege' || 
                 value === 'special_emergency' || 
                 value === 'adoption_leave') {
        defaultLocation = 'philippines';
      } else {
        defaultLocation = null;
      }
      
      setQuickLeaveData(prev => ({
        ...prev,
        otherLeaveType: value,
        // Keep leaveType as 'others' so the options stay visible
        // We'll use otherLeaveType for the actual submission
        otherSpecify: '',
        locationType: defaultLocation
      }));
      return;
    }

    // Update the state with the new value
    setQuickLeaveData(prev => {
      const updatedData = {
        ...prev,
        [name]: newValue
      };

      // Recalculate days when dates change
      if (name === 'startDate' || name === 'endDate') {
        const startDate = name === 'startDate' ? newValue : updatedData.startDate;
        const endDate = name === 'endDate' ? newValue : updatedData.endDate;
        updatedData.numberOfDays = calculateDays({ startDate, endDate });
      }

      return updatedData;
    });

    // Clear error for this field
    if (quickLeaveErrors[name]) {
      setQuickLeaveErrors({
        ...quickLeaveErrors,
        [name]: ''
      });
    }
    
    // Special handling for locationType to also clear locationSpecify error
    if (name === 'locationType' && quickLeaveErrors.locationSpecify) {
      setQuickLeaveErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.locationSpecify;
        return newErrors;
      });
    }
    
    // Special handling for locationSpecify to also clear locationType error
    if (name === 'locationSpecify' && quickLeaveErrors.locationType) {
      setQuickLeaveErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.locationType;
        return newErrors;
      });
    }
  };

  // Calculate number of days between start and end dates
  const calculateDays = (data) => {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
      // Reset time part to compare only dates
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
      return daysDiff > 0 ? daysDiff : 1;
    }
    return 1; // Default to 1 day if dates are invalid
  };

  // Validate quick leave step
  const validateQuickStep = (step) => {
    const errors = {};

    if (step === 1) {
      if (!quickLeaveData.leaveType) {
        errors.leaveType = 'Please select a leave type';
      } else if (quickLeaveData.leaveType === 'others' && !quickLeaveData.otherLeaveType) {
        errors.otherLeaveType = 'Please select a specific leave type';
      } else if (quickLeaveData.leaveType === 'others' && quickLeaveData.otherLeaveType === 'others_specify' && !quickLeaveData.otherSpecify.trim()) {
        errors.otherSpecify = 'Please specify the purpose of your leave';
      } else if (quickLeaveData.leaveType === 'others_specify' && !quickLeaveData.otherSpecify.trim()) {
        errors.otherSpecify = 'Please specify the purpose of your leave';
      }
    } else if (step === 2) {
      if (!quickLeaveData.startDate) {
        errors.startDate = 'Please select a start date';
      }
      if (!quickLeaveData.endDate) {
        errors.endDate = 'Please select an end date';
      }
      
      if (quickLeaveData.startDate && quickLeaveData.endDate) {
        const start = new Date(quickLeaveData.startDate);
        const end = new Date(quickLeaveData.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (end < start) {
          errors.endDate = 'End date cannot be earlier than start date';
        }
        
        // Vacation leave and similar types specific validation - requires 5 days advance notice
        if (quickLeaveData.leaveType === 'vacation' || 
            (quickLeaveData.leaveType === 'others' && 
             quickLeaveData.otherLeaveType === 'vacation')) {
          const daysDifference = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
          if (daysDifference < 5) {
            errors.startDate = 'This type of leave must be applied at least 5 days before the start date';
            setDateWarning(`(${daysDifference} days notice - requires 5 days minimum)`);
          } else {
            setDateWarning(`(${daysDifference} days notice - OK)`);
          }
        } else {
          // For other leave types (like sick, maternity, paternity, etc.), no advance notice is required
          const daysDifference = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
          setDateWarning(`(${daysDifference} days notice - OK)`);
        }
      }
    } else if (step === 3) {
      // Only require location information for specific leave types
      const requiresLocationInfo = 
        quickLeaveData.leaveType === 'vacation' || 
        quickLeaveData.leaveType === 'special_privilege_leave' || 
        quickLeaveData.leaveType === 'others_specify' || 
        quickLeaveData.leaveType === 'study_leave' || 
        quickLeaveData.leaveType === 'special_leave_benefits_women' ||
        quickLeaveData.leaveType === 'sick' ||
        quickLeaveData.leaveType === 'mandatory_forced_leave' || 
        quickLeaveData.leaveType === 'maternity_leave' || 
        quickLeaveData.leaveType === 'paternity_leave' || 
        quickLeaveData.leaveType === 'solo_parent_leave' || 
        quickLeaveData.leaveType === 'vawc_leave' || 
        quickLeaveData.leaveType === 'rehabilitation_privilege' || 
        quickLeaveData.leaveType === 'special_emergency' || 
        quickLeaveData.leaveType === 'adoption_leave';

      if (requiresLocationInfo) {
        if (!quickLeaveData.locationType) {
          errors.locationType = 'Please select where the leave will be spent';
        } else {
          // Validate locationSpecify based on locationType
          if (quickLeaveData.locationType === 'abroad' || quickLeaveData.locationType === 'outpatient' || quickLeaveData.locationType === 'hospital') {
            if (!quickLeaveData.locationSpecify || !quickLeaveData.locationSpecify.trim()) {
              errors.locationSpecify = 'Please specify the location';
            }
          }
        }
      }
    }

    setQuickLeaveErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Navigate to next step
  const nextQuickStep = (currentStep) => {
    if (validateQuickStep(currentStep)) {
      setQuickLeaveData({
        ...quickLeaveData,
        step: currentStep + 1
      });
      setQuickLeaveErrors({});
      setDateWarning('');
    }
  };

  // Navigate to previous step
  const prevQuickStep = (currentStep) => {
    setQuickLeaveData({
      ...quickLeaveData,
      step: currentStep - 1
    });
    setQuickLeaveErrors({});
    setDateWarning('');
  };

  // Show location options based on leave type
  const showLocationOptions = () => {
    // Vacation Leave options
    if (quickLeaveData.leaveType === 'vacation' || 
        quickLeaveData.leaveType === 'special_privilege_leave' || 
        quickLeaveData.leaveType === 'others_specify' ||
        (quickLeaveData.leaveType === 'others' && 
         (quickLeaveData.otherLeaveType === 'special_privilege_leave' || 
          quickLeaveData.otherLeaveType === 'others_specify'))) {
      return (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="locationType" 
              value="philippines" 
              className="radio radio-sm radio-primary"
              checked={quickLeaveData.locationType === 'philippines'}
              onChange={handleQuickLeaveChange}
            />
            <span>Within the Philippines</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="locationType" 
              value="abroad" 
              className="radio radio-sm radio-primary"
              checked={quickLeaveData.locationType === 'abroad'}
              onChange={handleQuickLeaveChange}
            />
            <span>Abroad (specify)</span>
          </label>
          {quickLeaveData.locationType === 'abroad' && (
            <div className="pl-6">
              <input 
                type="text" 
                name="locationSpecify" 
                className="input input-bordered input-sm w-full" 
                placeholder="Country"
                value={quickLeaveData.locationSpecify}
                onChange={handleQuickLeaveChange}
              />
              {quickLeaveErrors.locationSpecify && (
                <div className="text-red-500 text-sm mt-1">{quickLeaveErrors.locationSpecify}</div>
              )}
            </div>
          )}
        </div>
      );
    }
    // Sick Leave only (excluding maternity, paternity, etc.)
    else if (quickLeaveData.leaveType === 'sick') {
      return (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="locationType" 
              value="hospital" 
              className="radio radio-sm radio-primary"
              checked={quickLeaveData.locationType === 'hospital'}
              onChange={handleQuickLeaveChange}
            />
            <span>In Hospital (specify illness)</span>
          </label>
          {quickLeaveData.locationType === 'hospital' && (
            <div className="pl-6">
              <input 
                type="text" 
                name="locationSpecify" 
                className="input input-bordered input-sm w-full" 
                placeholder="Please specify illness"
                value={quickLeaveData.locationSpecify}
                onChange={handleQuickLeaveChange}
              />
              {quickLeaveErrors.locationSpecify && (
                <div className="text-red-500 text-sm mt-1">{quickLeaveErrors.locationSpecify}</div>
              )}
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="locationType" 
              value="outpatient" 
              className="radio radio-sm radio-primary"
              checked={quickLeaveData.locationType === 'outpatient'}
              onChange={handleQuickLeaveChange}
            />
            <span>Out Patient (specify illness)</span>
          </label>
          {quickLeaveData.locationType === 'outpatient' && (
            <div className="pl-6">
              <input 
                type="text" 
                name="locationSpecify" 
                className="input input-bordered input-sm w-full" 
                placeholder="Please specify illness"
                value={quickLeaveData.locationSpecify}
                onChange={handleQuickLeaveChange}
              />
              {quickLeaveErrors.locationSpecify && (
                <div className="text-red-500 text-sm mt-1">{quickLeaveErrors.locationSpecify}</div>
              )}
            </div>
          )}
        </div>
      );
    }
    // Special Leave Benefits for Women
    else if (quickLeaveData.leaveType === 'others' && quickLeaveData.otherLeaveType === 'special_leave_benefits_women') {
      return (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <span>Specify illness:</span>
          </label>
          <input 
            type="text" 
            name="locationSpecify" 
            className="input input-bordered w-full" 
            placeholder="Please specify illness"
            value={quickLeaveData.locationSpecify}
            onChange={handleQuickLeaveChange}
          />
          {quickLeaveErrors.locationSpecify && (
            <div className="text-red-500 text-sm">{quickLeaveErrors.locationSpecify}</div>
          )}
        </div>
      );
    }
    // Study Leave
    else if (quickLeaveData.leaveType === 'others' && quickLeaveData.otherLeaveType === 'study_leave') {
      return (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="locationType" 
              value="masteral" 
              className="radio radio-sm radio-primary"
              checked={quickLeaveData.locationType === 'masteral'}
              onChange={handleQuickLeaveChange}
            />
            <span>Completion of Master's Degree</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="locationType" 
              value="board_review" 
              className="radio radio-sm radio-primary"
              checked={quickLeaveData.locationType === 'board_review'}
              onChange={handleQuickLeaveChange}
            />
            <span>BAR/Board Examination Review</span>
          </label>
        </div>
      );
    }
    return null;
  };

  // Update end date min when start date changes
  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    
    // Update end date if it's before the new start date
    if (quickLeaveData.endDate && newStartDate > quickLeaveData.endDate) {
      const newEndDate = newStartDate;
      const newNumberOfDays = calculateDays({ startDate: newStartDate, endDate: newEndDate });
      setQuickLeaveData(prev => ({
        ...prev,
        startDate: newStartDate,
        endDate: newEndDate,
        numberOfDays: newNumberOfDays
      }));
    } else {
      // Just update the start date and recalculate days
      const newNumberOfDays = calculateDays({ startDate: newStartDate, endDate: quickLeaveData.endDate });
      setQuickLeaveData(prev => ({
        ...prev,
        startDate: newStartDate,
        numberOfDays: newNumberOfDays
      }));
    }
  };

  // Set leave type date restrictions
  const getMinStartDateForVacation = () => {
    if (quickLeaveData.leaveType === 'vacation') {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 5);
      return minDate.toISOString().split('T')[0];
    }
    // For sick leave and other leave types, allow immediate selection
    return minStartDate;
  };

  // Handle leave request submission without credit check (for warning modal)
  const submitLeaveRequestWithoutCreditCheck = () => {
    // Close the warning modal
    setShowWarningModal(false);
    // Proceed with submission by calling the main submit function
    submitLeaveRequest();
  };

  // Handle leave request submission
  const submitLeaveRequest = async () => {
    // Close confirmation modal
    setShowConfirmModal(false);
    setLoading(true);
    setErrorMessage('');

    // Client-side validation for insufficient credits BEFORE submitting
    const numberOfDaysFloat = parseFloat(quickLeaveData.numberOfDays);
    const availableCredits = quickLeaveData.leaveType === 'vacation' ? vacationBalance : sickBalance;
    
    // Check if user has insufficient credits
    if (numberOfDaysFloat > availableCredits) {
      // If employee has less than 1 credit, show without pay warning
      if (availableCredits < 1) {
        const leaveType = quickLeaveData.leaveType === 'vacation' ? 'Vacation' : 'Sick';
        const warningMsg = `You have no ${leaveType.toLowerCase()} leave credits available. This leave will be considered without pay. Do you want to proceed?`;
        setWarningMessage(warningMsg);
        setShowWarningModal(true);
        setLoading(false);
        return;
      } else {
        // Partial credits - show adjustment warning and calculate adjusted values
        const wholeDays = Math.floor(availableCredits);
        const adjustedEndDate = calculateAdjustedEndDate(quickLeaveData.startDate, wholeDays);
        const warningMsg = `You only have ${availableCredits.toFixed(3)} ${quickLeaveData.leaveType} leave credits available. Your leave request will be adjusted to ${wholeDays} day${wholeDays === 1 ? '' : 's'} ending on ${adjustedEndDate}. Do you want to proceed?`;
        setWarningMessage(warningMsg);
        
        // Store the adjusted values for use when user confirms
        const adjustedData = {
          ...quickLeaveData,
          numberOfDays: wholeDays,
          endDate: adjustedEndDate,
          _isAdjusted: true
        };
        
        // Store adjusted data in state so we can use it in the warning modal
        setQuickLeaveData(prev => ({
          ...prev,
          _adjustedData: adjustedData
        }));
        
        setShowWarningModal(true);
        setLoading(false);
        return;
      }
    }

    try {
      // Use adjusted data if available, otherwise use original data
      const isAdjusted = quickLeaveData._adjustedData !== undefined;
      const submitData = isAdjusted ? quickLeaveData._adjustedData : quickLeaveData;
      
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
      // When 'others' is selected, we use the specific leave type from otherLeaveType
      // When 'others_specify' is selected, we use the user's specification
      const actualLeaveType = submitData.leaveType === 'others' 
        ? submitData.otherLeaveType 
        : submitData.leaveType;
        
      const requestData = {
        leave_type: actualLeaveType,
        start_date: submitData.startDate,
        end_date: submitData.endDate,
        number_of_days: submitData.numberOfDays,
        where_spent: whereSpentValue,
        commutation: submitData.commutation,
        location_specify: submitData.locationSpecify
      };

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
          setQuickLeaveData(prev => {
            const newData = { ...prev._adjustedData };
            delete newData._adjustedData;
            return newData;
          });
        }
        
        // Refresh recent leave requests to include the new one
        await fetchRecentLeaveRequests();
        
        // Reset form after a delay
        setTimeout(() => {
          const today = new Date().toISOString().split('T')[0];
          setQuickLeaveData({
            step: 1,
            leaveType: '',
            otherLeaveType: '',
            otherSpecify: '',
            startDate: today,
            endDate: today,
            numberOfDays: 1,
            locationType: '',
            locationSpecify: '',
            commutation: false
          });
          setShowSuccessModal(false);
        }, 3000); // Auto-close after 3 seconds
      } else {
        setErrorMessage(response.data.message || 'Failed to submit leave request');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      if (error.response?.data?.message) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage('Failed to submit leave request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Leave Credits Container */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 flex flex-col h-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Credits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
            {/* Vacation Leave Card - Better centered design */}
            <div className="bg-blue-50 rounded-lg flex flex-col h-full">
              <div className="p-4 flex flex-col items-center justify-center flex-grow text-center">
                <div className="bg-blue-100 p-3 rounded-full mb-3">
                  <i className="fas fa-umbrella-beach text-blue-600 text-xl md:text-2xl"></i>
                </div>
                <div className="text-blue-800 mb-1">
                  <div className="text-sm font-medium">Vacation Leave</div>
                  {loadingCredits ? (
                    <div className="text-2xl md:text-3xl font-semibold mt-1">
                      <span className="loading loading-spinner loading-sm"></span>
                    </div>
                  ) : (
                    <div className="text-2xl md:text-3xl font-semibold mt-1">{vacationBalance.toFixed(3)}</div>
                  )}
                </div>
                <div className="text-xs text-blue-700 mt-2">
                  Days available
                </div>
              </div>
            </div>

            {/* Sick Leave Card - Better centered design */}
            <div className="bg-green-50 rounded-lg flex flex-col h-full">
              <div className="p-4 flex flex-col items-center justify-center flex-grow text-center">
                <div className="bg-green-100 p-3 rounded-full mb-3">
                  <i className="fas fa-thermometer-half text-green-600 text-xl md:text-2xl"></i>
                </div>
                <div className="text-green-800 mb-1">
                  <div className="text-sm font-medium">Sick Leave</div>
                  {loadingCredits ? (
                    <div className="text-2xl md:text-3xl font-semibold mt-1">
                      <span className="loading loading-spinner loading-sm"></span>
                    </div>
                  ) : (
                    <div className="text-2xl md:text-3xl font-semibold mt-1">{sickBalance.toFixed(3)}</div>
                  )}
                </div>
                <div className="text-xs text-green-700 mt-2">
                  Days available
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Leave Request */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            <i className="fas fa-calendar-plus text-blue-500 mr-2"></i>
            Quick Leave Request
          </h3>
          
          {/* Step Indicator */}
          <div className="w-full py-2 mb-3">
            <ul className="steps steps-horizontal w-full steps-xs sm:steps-sm">
              <li className={`step ${quickLeaveData.step >= 1 ? 'step-primary' : ''}`}>Type</li>
              <li className={`step ${quickLeaveData.step >= 2 ? 'step-primary' : ''}`}>Dates</li>
              <li className={`step ${quickLeaveData.step >= 3 ? 'step-primary' : ''}`}>Details</li>
            </ul>
          </div>
          
          {/* Error Message */}
          {errorMessage && (
            <div className="alert bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <i className="fas fa-exclamation-circle mr-2"></i>
              <span>{errorMessage}</span>
            </div>
          )}
          
          {/* Step 1: Leave Type */}
          {quickLeaveData.step === 1 && (
            <div className="space-y-3">
              {quickLeaveErrors.leaveType && (
                <div className="alert bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  <span>{quickLeaveErrors.leaveType}</span>
                </div>
              )}
              
              <div className="space-y-2">
                {/* Vacation Leave */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="leaveType" 
                    value="vacation" 
                    className="radio radio-sm radio-primary"
                    checked={quickLeaveData.leaveType === 'vacation'}
                    onChange={(e) => setQuickLeaveData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                  />
                  <span>Vacation Leave</span>
                </label>
                
                {quickLeaveData.leaveType === 'vacation' && (
                  <div className="alert bg-blue-100 border border-blue-300 text-blue-700 px-4 py-2 rounded ml-6">
                    <i className="fas fa-info-circle mr-2"></i>
                    <span className="text-xs">Vacation leave must be applied at least 5 days before the start date</span>
                  </div>
                )}
                
                {/* Sick Leave */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="leaveType" 
                    value="sick" 
                    className="radio radio-sm radio-primary"
                    checked={quickLeaveData.leaveType === 'sick'}
                    onChange={(e) => setQuickLeaveData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                  />
                  <span>Sick Leave</span>
                </label>
                
                {quickLeaveData.leaveType === 'sick' && (
                  <div className="alert bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded ml-6">
                    <i className="fas fa-check-circle mr-2"></i>
                    <span className="text-xs">Sick leave can be applied after the leave period</span>
                  </div>
                )}
                
                {/* Others - Generic option to hide specific leave types */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="leaveType" 
                    value="others" 
                    className="radio radio-sm radio-primary"
                    checked={quickLeaveData.leaveType === 'others'}
                    onChange={(e) => setQuickLeaveData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                  />
                  <span>Others</span>
                </label>
                
                {/* Show specific leave types when user selects "Others" */}
                {quickLeaveData.leaveType === 'others' && (
                  <div className="pl-6 mt-3 space-y-2">
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="otherLeaveType" 
                          value="mandatory_forced_leave" 
                          className="radio radio-xs radio-primary" 
                          checked={quickLeaveData.otherLeaveType === 'mandatory_forced_leave'}
                          onChange={(e) => setQuickLeaveData(prev => ({...prev, otherLeaveType: e.target.value}))}
                        />
                        <span className="label-text text-gray-700">Mandatory/Forced Leave</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="otherLeaveType" 
                          value="maternity_leave" 
                          className="radio radio-xs radio-primary" 
                          checked={quickLeaveData.otherLeaveType === 'maternity_leave'}
                          onChange={(e) => setQuickLeaveData(prev => ({...prev, otherLeaveType: e.target.value}))}
                        />
                        <span className="label-text text-gray-700">Maternity Leave</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="otherLeaveType" 
                          value="paternity_leave" 
                          className="radio radio-xs radio-primary" 
                          checked={quickLeaveData.otherLeaveType === 'paternity_leave'}
                          onChange={(e) => setQuickLeaveData(prev => ({...prev, otherLeaveType: e.target.value}))}
                        />
                        <span className="label-text text-gray-700">Paternity Leave</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="otherLeaveType" 
                          value="special_privilege_leave" 
                          className="radio radio-xs radio-primary" 
                          checked={quickLeaveData.otherLeaveType === 'special_privilege_leave'}
                          onChange={(e) => setQuickLeaveData(prev => ({...prev, otherLeaveType: e.target.value}))}
                        />
                        <span className="label-text text-gray-700">Special Privilege Leave</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="otherLeaveType" 
                          value="solo_parent_leave" 
                          className="radio radio-xs radio-primary" 
                          checked={quickLeaveData.otherLeaveType === 'solo_parent_leave'}
                          onChange={(e) => setQuickLeaveData(prev => ({...prev, otherLeaveType: e.target.value}))}
                        />
                        <span className="label-text text-gray-700">Solo Parent Leave</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="otherLeaveType" 
                          value="study_leave" 
                          className="radio radio-xs radio-primary" 
                          checked={quickLeaveData.otherLeaveType === 'study_leave'}
                          onChange={(e) => setQuickLeaveData(prev => ({...prev, otherLeaveType: e.target.value}))}
                        />
                        <span className="label-text text-gray-700">Study Leave</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="otherLeaveType" 
                          value="vawc_leave" 
                          className="radio radio-xs radio-primary" 
                          checked={quickLeaveData.otherLeaveType === 'vawc_leave'}
                          onChange={(e) => setQuickLeaveData(prev => ({...prev, otherLeaveType: e.target.value}))}
                        />
                        <span className="label-text text-gray-700">10-Day VAWC Leave</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="otherLeaveType" 
                          value="rehabilitation_privilege" 
                          className="radio radio-xs radio-primary" 
                          checked={quickLeaveData.otherLeaveType === 'rehabilitation_privilege'}
                          onChange={(e) => setQuickLeaveData(prev => ({...prev, otherLeaveType: e.target.value}))}
                        />
                        <span className="label-text text-gray-700">Rehabilitation Privilege</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="otherLeaveType" 
                          value="special_leave_benefits_women" 
                          className="radio radio-xs radio-primary" 
                          checked={quickLeaveData.otherLeaveType === 'special_leave_benefits_women'}
                          onChange={(e) => setQuickLeaveData(prev => ({...prev, otherLeaveType: e.target.value}))}
                        />
                        <span className="label-text text-gray-700">Special Leave Benefits for Women</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="otherLeaveType" 
                          value="special_emergency" 
                          className="radio radio-xs radio-primary" 
                          checked={quickLeaveData.otherLeaveType === 'special_emergency'}
                          onChange={(e) => setQuickLeaveData(prev => ({...prev, otherLeaveType: e.target.value}))}
                        />
                        <span className="label-text text-gray-700">Special Emergency (Calamity)</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="otherLeaveType" 
                          value="adoption_leave" 
                          className="radio radio-xs radio-primary" 
                          checked={quickLeaveData.otherLeaveType === 'adoption_leave'}
                          onChange={(e) => setQuickLeaveData(prev => ({...prev, otherLeaveType: e.target.value}))}
                        />
                        <span className="label-text text-gray-700">Adoption Leave</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input 
                          type="radio" 
                          name="otherLeaveType" 
                          value="others_specify" 
                          className="radio radio-xs radio-primary" 
                          checked={quickLeaveData.otherLeaveType === 'others_specify'}
                          onChange={(e) => setQuickLeaveData(prev => ({...prev, otherLeaveType: e.target.value}))}
                        />
                        <span className="label-text text-gray-700">Others (specify)</span>
                      </label>
                      
                      {quickLeaveData.otherLeaveType === 'others_specify' && (
                        <div className="pl-6">
                          <input 
                            type="text" 
                            name="otherSpecify" 
                            className="input input-bordered input-sm w-full" 
                            placeholder="Please specify"
                            value={quickLeaveData.otherSpecify}
                            onChange={handleQuickLeaveChange}
                          />
                          {quickLeaveErrors.otherSpecify && (
                            <div className="text-red-500 text-sm mt-1">{quickLeaveErrors.otherSpecify}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-3">
                <button 
                  className="btn btn-sm btn-primary inline-flex items-center"
                  onClick={() => nextQuickStep(1)}
                >
                  Next
                  <i className="fas fa-arrow-right ml-1"></i>
                </button>
              </div>
            </div>
          )}
          
          {/* Step 2: Date Selection */}
          {quickLeaveData.step === 2 && (
            <div className="space-y-3">
              {quickLeaveErrors.startDate && (
                <div className="alert bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  <span>{quickLeaveErrors.startDate}</span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-medium">Start Date</span>
                    {dateWarning && (
                      <span className="label-text-alt text-warning">{dateWarning}</span>
                    )}
                  </label>
                  <input 
                    type="date" 
                    name="startDate" 
                    className="input input-bordered input-sm w-full" 
                    required 
                    value={quickLeaveData.startDate}
                    onChange={handleStartDateChange}
                    min={quickLeaveData.leaveType === 'vacation' ? getMinStartDateForVacation() : minStartDate}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-medium">End Date</span>
                  </label>
                  <input 
                    type="date" 
                    name="endDate" 
                    className="input input-bordered input-sm w-full" 
                    required 
                    value={quickLeaveData.endDate}
                    onChange={handleQuickLeaveChange}
                    min={quickLeaveData.startDate || minStartDate}
                  />
                </div>
              </div>
              
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-medium">Number of Days</span>
                </label>
                <input 
                  type="text" 
                  name="numberOfDays" 
                  className="input input-bordered input-sm w-full" 
                  readOnly 
                  value={quickLeaveData.numberOfDays}
                />
              </div>
              
              <div className="flex justify-between mt-3">
                <button 
                  className="btn btn-sm btn-outline inline-flex items-center"
                  onClick={() => prevQuickStep(2)}
                >
                  <i className="fas fa-arrow-left mr-1"></i>
                  Back
                </button>
                <button 
                  className="btn btn-sm btn-primary inline-flex items-center"
                  onClick={() => nextQuickStep(2)}
                >
                  Next
                  <i className="fas fa-arrow-right ml-1"></i>
                </button>
              </div>
            </div>
          )}
          
          {/* Step 3: Additional Details */}
          {quickLeaveData.step === 3 && (
            <div className="space-y-3">
              {quickLeaveErrors.locationType && (
                <div className="alert bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  <span>{quickLeaveErrors.locationType}</span>
                </div>
              )}
              
              {/* Where to spend leave */}
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-medium">Where will leave be spent?</span>
                </label>
                <div className="flex flex-col space-y-2">
                  {showLocationOptions()}
                </div>
              </div>
              
              {/* Commutation Request */}
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2 py-1">
                  <input 
                    type="checkbox" 
                    name="commutation" 
                    value="1" 
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={quickLeaveData.commutation}
                    onChange={handleQuickLeaveChange}
                  />
                  <span className="label-text">Request for commutation of leave credits</span>
                </label>
              </div>
              
              <div className="flex justify-between mt-3">
                <button 
                  className="btn btn-sm btn-outline inline-flex items-center"
                  onClick={() => prevQuickStep(3)}
                >
                  <i className="fas fa-arrow-left mr-1"></i>
                  Back
                </button>
                <button 
                  className="btn btn-sm btn-primary inline-flex items-center"
                  onClick={() => {
                    if (validateQuickStep(3)) {
                      setShowConfirmModal(true);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit
                      <i className="fas fa-paper-plane ml-1"></i>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Leave History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Leave Requests</h3>
        </div>
        <div className="p-6">
          {loadingRequests ? (
            <div className="flex justify-center items-center h-32">
              <span className="loading loading-spinner loading-md"></span>
              <span className="ml-2">Loading recent requests...</span>
            </div>
          ) : recentLeaveRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-inbox text-3xl mb-2"></i>
              <p>No leave requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Dates
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Days
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentLeaveRequests.map((request) => (
                    <tr 
                      key={request._id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/employee/leave-request/${request._id}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {request.leave_type === 'vacation' ? 'Vacation' : 
                         request.leave_type === 'sick' ? 'Sick' : 
                         request.leave_type === 'mandatory_forced_leave' ? 'Mandatory/Forced' :
                         request.leave_type === 'maternity_leave' ? 'Maternity' :
                         request.leave_type === 'paternity_leave' ? 'Paternity' :
                         request.leave_type === 'special_privilege_leave' ? 'Special Privilege' :
                         request.leave_type === 'solo_parent_leave' ? 'Solo Parent' :
                         request.leave_type === 'study_leave' ? 'Study' :
                         request.leave_type === 'vawc_leave' ? 'VAWC' :
                         request.leave_type === 'rehabilitation_privilege' ? 'Rehabilitation' :
                         request.leave_type === 'special_leave_benefits_women' ? 'Special Leave Benefits Women' :
                         request.leave_type === 'special_emergency' ? 'Special Emergency' :
                         request.leave_type === 'adoption_leave' ? 'Adoption' :
                         request.leave_type === 'others_specify' ? 'Others' :
                         request.leave_type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="text-xs md:text-sm">
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {request.number_of_days}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(request.status)}`}>
                          {getStatusText(request.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Leave Request Submitted"
        message="Your leave request has been submitted successfully and is pending approval."
      />

      {/* Warning Modal */}
      <ConfirmationModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        onConfirm={async () => {
          // Close the warning modal and submit the request
          setShowWarningModal(false);
          setLoading(true);
          setErrorMessage('');
          
          // Use adjusted data if available, otherwise use original data
          const isAdjusted = quickLeaveData._adjustedData !== undefined;
          const submitData = isAdjusted ? quickLeaveData._adjustedData : quickLeaveData;
          
          try {
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

            // For the new structure, we will use leave_type as the main field and subtype as the same
            // This maintains compatibility with the server which expects both fields
            // When 'others' is selected, we use the specific leave type from otherLeaveType
            // When 'others_specify' is selected, we use the user's specification
            const actualLeaveType = submitData.leaveType === 'others' 
              ? submitData.otherLeaveType 
              : submitData.leaveType;
              
            const requestData = {
              leave_type: actualLeaveType,
              start_date: submitData.startDate,
              end_date: submitData.endDate,
              number_of_days: submitData.numberOfDays,
              where_spent: whereSpentValue,
              commutation: submitData.commutation,
              location_specify: submitData.locationSpecify
            };

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
                setQuickLeaveData(prev => {
                  const newData = { ...prev._adjustedData };
                  delete newData._adjustedData;
                  return newData;
                });
              }
              
              // Refresh recent leave requests to include the new one
              await fetchRecentLeaveRequests();
              
              // Reset form after a delay
              setTimeout(() => {
                const today = new Date().toISOString().split('T')[0];
                setQuickLeaveData({
                  step: 1,
                  leaveType: '',
                  otherLeaveType: '',
                  otherSpecify: '',
                  startDate: today,
                  endDate: today,
                  numberOfDays: 1,
                  locationType: '',
                  locationSpecify: '',
                  commutation: false
                });
                setShowSuccessModal(false);
              }, 3000); // Auto-close after 3 seconds
            } else {
              setErrorMessage(response.data.message || 'Failed to submit leave request');
            }
          } catch (error) {
            console.error('Error submitting leave request:', error);
            if (error.response?.data?.message) {
              setErrorMessage(error.response.data.message);
            } else {
              setErrorMessage('Failed to submit leave request. Please try again.');
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

export default EmployeeDashboard;