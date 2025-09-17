import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import axios from '../services/api';
import SuccessModal from './SuccessModal';
import ConfirmationModal from './ConfirmationModal';

const RequestLeave = () => {
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
    vacationSubtype: '',
    vacationOtherSpecify: '',
    sickSubtype: '',
    sickOtherSpecify: '',
    startDate: '',
    endDate: '',
    numberOfDays: 1,
    locationType: '',
    locationSpecify: '',
    commutation: ''
  });

  const [reviewData, setReviewData] = useState({
    leaveType: '',
    subtype: '',
    dateRange: '',
    numberOfDays: 1,
    location: '',
    commutation: ''
  });

  // State for leave credits
  const [vacationBalance, setVacationBalance] = useState(0);
  const [sickBalance, setSickBalance] = useState(0);
  const [loadingCredits, setLoadingCredits] = useState(true);

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
    fetchLeaveCredits();
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
      
      // Clear other specify fields when changing subtypes
      if (name === 'vacationSubtype' && newValue !== 'other') {
        updatedData.vacationOtherSpecify = '';
      }
      
      if (name === 'sickSubtype' && newValue !== 'other') {
        updatedData.sickOtherSpecify = '';
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
      } else if (formData.leaveType === 'vacation' && !formData.vacationSubtype) {
        setError('Please select a vacation leave subtype');
        isValid = false;
      } else if (formData.leaveType === 'sick' && !formData.sickSubtype) {
        setError('Please select a sick leave subtype');
        isValid = false;
      } else if (formData.leaveType === 'vacation' && formData.vacationSubtype === 'other' && !formData.vacationOtherSpecify.trim()) {
        setError('Please specify the other purpose');
        isValid = false;
      } else if (formData.leaveType === 'sick' && formData.sickSubtype === 'other' && !formData.sickOtherSpecify.trim()) {
        setError('Please specify the other details');
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
        
        // Vacation leave specific validation
        if (formData.leaveType === 'vacation') {
          const daysDifference = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
          if (daysDifference < 5) {
            setError('Vacation leave must be applied at least 5 days before the start date');
            isValid = false;
          }
        }
      }
    }
    
    // Step 3: Details validation
    else if (step === 3) {
      if (!formData.locationType) {
        setError('Please select where the leave will be spent');
        isValid = false;
      }
      
      if ((formData.locationType === 'abroad' || formData.locationType === 'outpatient') && !formData.locationSpecify.trim()) {
        setError('Please specify the location');
        isValid = false;
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
    let subtypeText = '';
    
    if (formData.leaveType === 'vacation') {
      leaveTypeText = 'Vacation Leave';
      if (formData.vacationSubtype === 'other') {
        subtypeText = `(${formData.vacationOtherSpecify})`;
      } else {
        subtypeText = formData.vacationSubtype === 'to_seek_employment' ? '(To seek employment)' : '';
      }
    } else if (formData.leaveType === 'sick') {
      leaveTypeText = 'Sick Leave';
      if (formData.sickSubtype === 'other') {
        subtypeText = `(${formData.sickOtherSpecify})`;
      } else {
        subtypeText = `(${formData.sickSubtype})`;
      }
    }
    
    const formatDate = (dateString) => {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('en-US', options);
    };
    
    let locationText = '';
    if (formData.locationType === 'abroad' && formData.locationSpecify) {
      locationText = `Abroad: ${formData.locationSpecify}`;
    } else if (formData.locationType === 'outpatient' && formData.locationSpecify) {
      locationText = `Outpatient: ${formData.locationSpecify}`;
    } else {
      locationText = formData.locationType === 'philippines' ? 'Within the Philippines' : 
                    formData.locationType === 'hospital' ? 'In Hospital' : 
                    formData.locationType;
    }
    
    const commutationText = formData.commutation === '1' ? 'Requested' : 'Not Requested';
    
    setReviewData({
      leaveType: leaveTypeText,
      subtype: subtypeText,
      dateRange: `${formatDate(formData.startDate)} to ${formatDate(formData.endDate)}`,
      numberOfDays: `${formData.numberOfDays} day${formData.numberOfDays === 1 ? '' : 's'}`,
      location: locationText,
      commutation: commutationText
    });
  };

  // Submit leave request
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
      
      const requestData = {
        leave_type: submitData.leaveType,
        subtype: submitData.leaveType === 'vacation' 
          ? submitData.vacationSubtype === 'other' 
            ? submitData.vacationOtherSpecify 
            : submitData.vacationSubtype
          : submitData.sickSubtype === 'other' 
            ? submitData.sickOtherSpecify 
            : submitData.sickSubtype,
        start_date: submitData.startDate,
        end_date: submitData.endDate,
        number_of_days: submitData.numberOfDays,
        where_spent: submitData.locationType,
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
          setFormData(prev => {
            const newData = { ...prev._adjustedData };
            delete newData._adjustedData;
            return newData;
          });
        }
        
        // Reset form after a delay
        setTimeout(() => {
          setShowSuccessModal(false);
          navigate('/employee/leave-history');
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

  // Show leave subtype options
  const showSubtype = (leaveType) => {
    setFormData(prev => ({
      ...prev,
      leaveType: leaveType,
      vacationSubtype: '',
      sickSubtype: '',
      vacationOtherSpecify: '',
      sickOtherSpecify: ''
    }));
  };

  // Get minimum start date based on leave type
  const getMinStartDate = () => {
    if (formData.leaveType === 'vacation') {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 5);
      return minDate.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  };

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
                New Leave Request
              </h2>
              
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
                      <div className="flex items-center cursor-pointer" onClick={() => showSubtype('vacation')}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="vacationLeave" 
                          value="vacation" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'vacation'}
                          onChange={() => showSubtype('vacation')}
                        />
                        <label htmlFor="vacationLeave" className="ml-2 font-medium text-gray-800">Vacation Leave</label>
                      </div>
                      
                      {formData.leaveType === 'vacation' && (
                        <div id="vacationSubtypes" className="pl-6 mt-3 space-y-3">
                          <div className="form-control">
                            <label className="label cursor-pointer justify-start gap-2">
                              <input 
                                type="radio" 
                                name="vacationSubtype" 
                                value="to_seek_employment" 
                                className="radio radio-sm radio-primary" 
                                checked={formData.vacationSubtype === 'to_seek_employment'}
                                onChange={handleInputChange}
                              />
                              <span className="label-text text-gray-700">To seek employment</span>
                            </label>
                          </div>
                          
                          <div className="form-control">
                            <label className="label cursor-pointer justify-start gap-2">
                              <input 
                                type="radio" 
                                name="vacationSubtype" 
                                value="other" 
                                className="radio radio-sm radio-primary" 
                                checked={formData.vacationSubtype === 'other'}
                                onChange={handleInputChange}
                              />
                              <span className="label-text text-gray-700">Other (please specify)</span>
                            </label>
                            
                            {formData.vacationSubtype === 'other' && (
                              <input 
                                type="text" 
                                id="vacationOtherSpecify" 
                                name="vacationOtherSpecify" 
                                value={formData.vacationOtherSpecify}
                                onChange={handleInputChange}
                                placeholder="Please specify" 
                                className="input input-bordered input-sm mt-1 ml-6 w-3/4 border-gray-300 focus:border-blue-500"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Sick Leave */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-50">
                      <div className="flex items-center cursor-pointer" onClick={() => showSubtype('sick')}>
                        <input 
                          type="radio" 
                          name="leaveType" 
                          id="sickLeave" 
                          value="sick" 
                          className="radio radio-primary" 
                          checked={formData.leaveType === 'sick'}
                          onChange={() => showSubtype('sick')}
                        />
                        <label htmlFor="sickLeave" className="ml-2 font-medium text-gray-800">Sick Leave</label>
                      </div>
                      
                      {formData.leaveType === 'sick' && (
                        <div id="sickSubtypes" className="pl-6 mt-3 space-y-3">
                          <div className="form-control">
                            <label className="label cursor-pointer justify-start gap-2">
                              <input 
                                type="radio" 
                                name="sickSubtype" 
                                value="maternity" 
                                className="radio radio-sm radio-primary" 
                                checked={formData.sickSubtype === 'maternity'}
                                onChange={handleInputChange}
                              />
                              <span className="label-text text-gray-700">Maternity</span>
                            </label>
                          </div>
                          
                          <div className="form-control">
                            <label className="label cursor-pointer justify-start gap-2">
                              <input 
                                type="radio" 
                                name="sickSubtype" 
                                value="other" 
                                className="radio radio-sm radio-primary" 
                                checked={formData.sickSubtype === 'other'}
                                onChange={handleInputChange}
                              />
                              <span className="label-text text-gray-700">Others (please specify)</span>
                            </label>
                            
                            {formData.sickSubtype === 'other' && (
                              <input 
                                type="text" 
                                id="sickOtherSpecify" 
                                name="sickOtherSpecify" 
                                value={formData.sickOtherSpecify}
                                onChange={handleInputChange}
                                placeholder="Please specify" 
                                className="input input-bordered input-sm mt-1 ml-6 w-3/4 border-gray-300 focus:border-blue-500"
                              />
                            )}
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
                    {formData.leaveType === 'vacation' && (
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
                    
                    {/* For Sick Leave */}
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
                            <span className="label-text text-gray-700">In Hospital</span>
                          </label>
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
                            <span className="label-text text-gray-700">Outpatient (please specify)</span>
                          </label>
                          
                          {formData.locationType === 'outpatient' && (
                            <input 
                              type="text" 
                              id="locationSpecify" 
                              name="locationSpecify" 
                              value={formData.locationSpecify}
                              onChange={handleInputChange}
                              placeholder="Please specify location" 
                              className="input input-bordered input-sm mt-1 ml-6 w-3/4 border-gray-300 focus:border-blue-500"
                            />
                          )}
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
                              <span className="text-sm text-gray-600 ml-2">{reviewData.subtype}</span>
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
        message="Your leave request has been submitted successfully and is pending approval."
        onConfirm={() => {
          setShowSuccessModal(false);
          navigate('/employee/leave-history');
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
            const requestData = {
              leave_type: submitData.leaveType,
              subtype: submitData.leaveType === 'vacation' 
                ? submitData.vacationSubtype === 'other' 
                  ? submitData.vacationOtherSpecify 
                  : submitData.vacationSubtype
                : submitData.sickSubtype === 'other' 
                  ? submitData.sickOtherSpecify 
                  : submitData.sickSubtype,
              start_date: submitData.startDate,
              end_date: submitData.endDate,
              number_of_days: submitData.numberOfDays,
              where_spent: submitData.locationType,
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
              
              // Reset form after a delay
              setTimeout(() => {
                setShowSuccessModal(false);
                navigate('/employee/leave-history');
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

export default RequestLeave;