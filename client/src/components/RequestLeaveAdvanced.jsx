import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import axios from '../services/api';
import SuccessModal from './SuccessModal';
import ConfirmationModal from './ConfirmationModal';

// Leave types that draw from vacation credits vs sick credits (mirrors server getLeaveCreditsInfo)
const VACATION_POOL_TYPES = ['vacation', 'special_privilege_leave', 'study_leave', 'mandatory_forced_leave', 'monetization', 'terminal_leave'];
// Statutory leaves (maternity, paternity, solo parent, VAWC, rehabilitation, SLBW,
// special emergency, adoption) are separate paid entitlements — they never consume
// vacation/sick credits, so only sick leave draws from the sick pool.
const SICK_POOL_TYPES = ['sick'];

// Returns the available balance for a leave type, or Infinity for types that don't consume vacation/sick credits
const getAvailableCredits = (leaveType, vacationBalance, sickBalance) => {
  if (VACATION_POOL_TYPES.includes(leaveType)) return vacationBalance;
  if (SICK_POOL_TYPES.includes(leaveType)) return sickBalance;
  return Infinity;
};

const RequestLeaveAdvanced = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // State for supporting documents
  const [documents, setDocuments] = useState([]);
  const [documentsError, setDocumentsError] = useState('');
  const [successMessage, setSuccessMessage] = useState('Your leave request has been submitted successfully.');

  const [formData, setFormData] = useState({
    leaveType: '',
    otherSpecify: '',
    startDate: '',
    endDate: '',
    numberOfDays: 1,
    locationType: '',
    locationSpecify: '',
    commutation: '',
    // Purpose of request (monetization / terminal leave) — mirrors 6.B on CS Form No. 6
    leavePurpose: ''
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
    setFormData(prev => {
      const updatedData = {
        ...prev,
        startDate: newStartDate
      };
      
      // Update end date if it's before the new start date
      if (prev.endDate && newStartDate > prev.endDate) {
        updatedData.endDate = newStartDate;
      }
      
      // Recalculate the number of days whenever the start date changes
      updatedData.numberOfDays = calculateDays(updatedData.startDate, updatedData.endDate);
      
      return updatedData;
    });
  };

  // Calculate number of WORKING days (Mon–Fri, inclusive) between start and end dates.
  // Matches CS Form 6 6.C "Number of Working Days Applied For".
  const calculateDays = (start, end) => {
    if (start && end) {
      const partsS = String(start).split('-').map(Number);
      const partsE = String(end).split('-').map(Number);
      if (partsS.length === 3 && partsE.length === 3 && !partsS.some(isNaN) && !partsE.some(isNaN)) {
        const s = new Date(partsS[0], partsS[1] - 1, partsS[2]);
        const e = new Date(partsE[0], partsE[1] - 1, partsE[2]);
        if (e < s) return 1;
        
        let workingDays = 0;
        const current = new Date(s);
        while (current <= e) {
          const day = current.getDay();
          if (day !== 0 && day !== 6) { // 0 = Sunday, 6 = Saturday
            workingDays++;
          }
          current.setDate(current.getDate() + 1);
        }
        return workingDays > 0 ? workingDays : 1;
      }
    }
    return 1;
  };

  // Calculate adjusted end date for a given number of WORKING days (skips weekends)
  const calculateAdjustedEndDate = (startDate, numberOfDays) => {
    const parts = String(startDate).split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return startDate;
    const endDateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    let remaining = Math.max(1, Math.floor(numberOfDays));
    while (remaining > 1) {
      endDateObj.setDate(endDateObj.getDate() + 1);
      const day = endDateObj.getDay();
      if (day !== 0 && day !== 6) {
        remaining--;
      }
    }
    const y = endDateObj.getFullYear();
    const m = String(endDateObj.getMonth() + 1).padStart(2, '0');
    const d = String(endDateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
      if (name === 'locationType' && newValue !== 'abroad' && newValue !== 'outpatient' && newValue !== 'hospital') {
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
        // Special Leave Benefits for Women collects the illness as the location (no radio options)
        if (formData.leaveType === 'special_leave_benefits_women') {
          if (!formData.locationSpecify.trim()) {
            setError('Please specify the illness / medical condition');
            isValid = false;
          }
        } else {
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
      }
      
      if (!formData.commutation) {
        setError('Please select a commutation option');
        isValid = false;
      }

      // CSC Rule XVI, Sec. 22 (Omnibus Rules on Leave) — monetization of leave credits
      if (formData.leavePurpose === 'monetization') {
        const monetizationDays = parseFloat(formData.numberOfDays);
        if (monetizationDays < 10 || monetizationDays > 30) {
          setError('Per CSC rules (Sec. 22, Omnibus Rules on Leave), you may monetize a minimum of 10 days and a maximum of 30 days of vacation leave credits in a given year.');
          isValid = false;
        } else if (vacationBalance < 15) {
          setError('Per CSC rules, you must have at least 15 days of accumulated vacation leave credits to avail of monetization. Your current vacation leave balance is insufficient.');
          isValid = false;
        } else if (vacationBalance - monetizationDays < 5) {
          setError(`Per CSC rules, at least 5 days of vacation leave must remain after monetization. With your current balance of ${vacationBalance.toFixed(3)} days, you may monetize at most ${Math.max(0, Math.floor(vacationBalance - 5))} days.`);
          isValid = false;
        }
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
      'monetization': 'Monetization of Leave Credits',
      'terminal_leave': 'Terminal Leave',
      'others_specify': 'Others (Specify)'
    };
    
    if (formData.leavePurpose === 'monetization') {
      leaveTypeText = 'Monetization of Leave Credits';
    } else if (formData.leavePurpose === 'terminal_leave') {
      leaveTypeText = 'Terminal Leave';
    } else if (formData.leaveType === 'others_specify') {
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
    if (formData.leaveType === 'special_leave_benefits_women') {
      locationText = formData.locationSpecify || 'Not specified';
    } else if (formData.locationType === 'abroad' && formData.locationSpecify) {
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
      // Client-side validation for insufficient credits BEFORE submitting.
      // The credit pool mirrors the server's getLeaveCreditsInfo mapping.
      const numberOfDaysFloat = parseFloat(formData.numberOfDays);
      const isPurposeLeave = formData.leavePurpose === 'monetization' || formData.leavePurpose === 'terminal_leave';
      const effectiveLeaveType = formData.leavePurpose
        ? formData.leavePurpose
        : (formData.leaveType === 'others_specify' ? formData.otherSpecify : formData.leaveType);
      const availableCredits = getAvailableCredits(effectiveLeaveType, vacationBalance, sickBalance);
      
      // Check if user has insufficient credits (only for types that consume vacation/sick credits).
      // Monetization / terminal leave are validated by HR during certification, so they skip the warning.
      if (!isPurposeLeave && availableCredits !== Infinity && numberOfDaysFloat > availableCredits) {
        const poolName = VACATION_POOL_TYPES.includes(effectiveLeaveType) ? 'vacation' : 'sick';
        // If employee has less than 1 credit, show without pay warning
        if (availableCredits < 1) {
          const warningMsg = `You have no ${poolName} leave credits available. This leave will be considered without pay. Do you want to proceed?`;
          setWarningMessage(warningMsg);
          setShowWarningModal(true);
          setLoading(false);
          return;
        } else {
          // Partial credits - show adjustment warning and calculate adjusted values
          const wholeDays = Math.floor(availableCredits);
          const adjustedEndDate = calculateAdjustedEndDate(formData.startDate, wholeDays);
          const warningMsg = `You only have ${availableCredits.toFixed(3)} ${poolName} leave credits available. Your leave request will be adjusted to ${wholeDays} day${wholeDays === 1 ? '' : 's'} ending on ${adjustedEndDate}. Do you want to proceed?`;
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
        submitData.leaveType === 'special_privilege_leave' ||
        submitData.leaveType === 'study_leave' ||
        submitData.leaveType === 'others_specify' ||
        submitData.leaveType === 'sick' ||
        submitData.leaveType === 'special_leave_benefits_women';

      if (submitData.leaveType === 'special_leave_benefits_women') {
        // This leave type has no location radio — the illness text is the location
        whereSpentValue = submitData.locationSpecify;
      } else if (!requiresLocationInfo) {
        whereSpentValue = 'not_applicable'; // Use a default value for leave types that don't require location
      }

      // For the new structure, we will use leave_type directly with the correct value
      // If a purpose (monetization / terminal leave) is selected, it becomes the leave type.
      // If leaveType is 'others_specify', we use the otherSpecify value.
      const actualLeaveType = submitData.leavePurpose
        ? submitData.leavePurpose
        : (submitData.leaveType === 'others_specify'
          ? submitData.otherSpecify
          : submitData.leaveType);

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
        // Upload any selected supporting documents to the new request
        const newRequestId = response.data.data?._id;
        const docsOk = await uploadLeaveDocuments(newRequestId);
        setSuccessMessage(docsOk
          ? `Your leave request has been submitted successfully. ${getRoleBasedMessage(userRole)}`
          : 'Your leave request was submitted, but the supporting documents could not be uploaded. You can attach them later from the request details page.');

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

  // Handle the purpose-of-request checkboxes (Monetization / Terminal Leave) on the Details step.
  // They are mutually exclusive — checking one clears the other.
  const handlePurposeChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({ ...prev, leavePurpose: checked ? value : '' }));
  };

  // --- Supporting documents ---

  // Handle file selection for supporting documents
  const handleDocumentSelect = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file
    setDocumentsError('');

    // Allowed types: images, PDF, Word, Excel, text (mirrors server middleware)
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    const valid = files.filter(f => f.type.startsWith('image/') || allowedTypes.includes(f.type));
    if (valid.length !== files.length) {
      setDocumentsError('Some files were skipped: only images, PDF, Word, Excel and text files are allowed.');
    }
    setDocuments(prev => [...prev, ...valid].slice(0, 5));
  };

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Upload the selected documents to a newly created leave request
  const uploadLeaveDocuments = async (leaveRequestId) => {
    if (!documents.length) return true;
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      documents.forEach(doc => formData.append('documents', doc));
      const response = await axios.post(`/api/leave-requests/${leaveRequestId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data.success !== false;
    } catch (error) {
      console.error('Error uploading leave documents:', error);
      return false;
    }
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

  // Leave type requirements based on CS Form No. 6, Revised 2020
  const leaveTypeRequirements = {
    vacation: {
      title: 'Vacation Leave',
      icon: 'fa-umbrella-beach',
      color: 'blue',
      requirements: [
        'Apply at least 5 days before the start date',
        'Must have available vacation leave credits',
        'Specify where the leave will be spent (Philippines or Abroad)',
        'Indicate if commutation (monetization) is requested'
      ]
    },
    sick: {
      title: 'Sick Leave',
      icon: 'fa-hospital',
      color: 'green',
      requirements: [
        'May be applied before or after the leave period',
        'Must have available sick leave credits',
        'Specify illness or medical condition',
        'Medical certificate may be required for extended leave'
      ]
    },
    mandatory_forced_leave: {
      title: 'Mandatory/Forced Leave',
      icon: 'fa-gavel',
      color: 'orange',
      requirements: [
        'Applied when employee is directed to take leave',
        'Usually charged against accumulated vacation credits',
        'Official directive or memo may be required'
      ]
    },
    maternity_leave: {
      title: 'Maternity Leave',
      icon: 'fa-baby',
      color: 'pink',
      requirements: [
        'Available to female employees',
        'Up to 105 days with pay (RA 11210 - Expanded Maternity Leave Law)',
        'May be extended for 30 days without pay',
        'Must notify SSS within 120 days of effectivity of pregnancy',
        'Maternity notification form and SSS documents required'
      ]
    },
    paternity_leave: {
      title: 'Paternity Leave',
      icon: 'fa-person-breastfeeding',
      color: 'teal',
      requirements: [
        'Available to married male employees (RA 8187)',
        '7 days with pay for the first 4 deliveries',
        'Must be living with the spouse',
        'Marriage certificate may be required'
      ]
    },
    special_privilege_leave: {
      title: 'Special Privilege Leave',
      icon: 'fa-star',
      color: 'purple',
      requirements: [
        'Also known as "Incentive Leave" for government employees',
        '7 days per year for those in hazardous or difficult assignments',
        'Certification of eligibility from agency head required',
        'Specify where the leave will be spent'
      ]
    },
    solo_parent_leave: {
      title: 'Solo Parent Leave',
      icon: 'fa-person',
      color: 'indigo',
      requirements: [
        '7 days with pay per year for solo parents (RA 8972)',
        'Must have a valid Solo Parent ID',
        'Certification of eligibility required',
        'Applicable to employees with at least 1 year of service'
      ]
    },
    study_leave: {
      title: 'Study Leave',
      icon: 'fa-graduation-cap',
      color: 'cyan',
      requirements: [
        'For completion of Master\'s Degree or BAR/Board Examination Review',
        'Must have at least 1 year of service',
        'Certification from school/program required',
        'Specify if for Master\'s Degree completion or Board Exam Review',
        'May require a bond or service agreement'
      ]
    },
    vawc_leave: {
      title: '10-Day VAWC Leave',
      icon: 'fa-shield-heart',
      color: 'rose',
      requirements: [
        'For victims of Violence Against Women and Children (RA 9262)',
        '10 days with pay',
        'Barangay protection order or certification required',
        'Confidentiality of the case must be maintained',
        'Certification from DSWD or social worker may be required'
      ]
    },
    rehabilitation_privilege: {
      title: 'Rehabilitation Privilege',
      icon: 'fa-hand-holding-medical',
      color: 'amber',
      requirements: [
        'For employees undergoing rehabilitation treatment',
        'Privilege under RA 9165 (Comprehensive Dangerous Drugs Act)',
        'Medical certification required',
        'Confidentiality must be maintained'
      ]
    },
    special_leave_benefits_women: {
      title: 'Special Leave Benefits for Women',
      icon: 'fa-venus',
      color: 'fuchsia',
      requirements: [
        '2 months with pay for gynecological disorders (RA 9710 - Magna Carta of Women)',
        'Must have at least 6 months of service in the last 12 months',
        'Medical certification of gynecological condition required',
        'Specify the nature of the medical condition'
      ]
    },
    special_emergency: {
      title: 'Special Emergency (Calamity) Leave',
      icon: 'fa-house-crack',
      color: 'red',
      requirements: [
        'For employees affected by calamities (typhoon, earthquake, fire, etc.)',
        'Must be a resident of the affected area',
        'Certification from local authorities (barangay/municipal) required',
        'Specify the type of calamity and affected area'
      ]
    },
    adoption_leave: {
      title: 'Adoption Leave',
      icon: 'fa-hands-holding-child',
      color: 'emerald',
      requirements: [
        '60 days with pay for adoptive parents (RA 8552)',
        'Must have at least 1 year of service',
        'Court order or placement authority document required',
        'Applicable for adoption of a child up to 7 years old'
      ]
    },
    others_specify: {
      title: 'Others (Specify)',
      icon: 'fa-pen',
      color: 'gray',
      requirements: [
        'Please specify the purpose or nature of your leave',
        'Supporting documents may be required',
        'Leave credits will depend on the type of leave specified'
      ]
    }
  };

  // Get all leave type options
  const leaveTypeOptions = [
    { value: 'vacation', label: 'Vacation Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'mandatory_forced_leave', label: 'Mandatory/Forced Leave' },
    { value: 'maternity_leave', label: 'Maternity Leave' },
    { value: 'paternity_leave', label: 'Paternity Leave' },
    { value: 'special_privilege_leave', label: 'Special Privilege Leave' },
    { value: 'solo_parent_leave', label: 'Solo Parent Leave' },
    { value: 'study_leave', label: 'Study Leave' },
    { value: 'vawc_leave', label: '10-Day VAWC Leave' },
    { value: 'rehabilitation_privilege', label: 'Rehabilitation Privilege' },
    { value: 'special_leave_benefits_women', label: 'Special Leave Benefits for Women' },
    { value: 'special_emergency', label: 'Special Emergency (Calamity)' },
    { value: 'adoption_leave', label: 'Adoption Leave' },
    { value: 'others_specify', label: 'Others (Specify)' }
  ];

  // Required supporting documents per leave type (CS Form No. 6, Revised 2020 practice)
  const leaveTypeRequiredDocuments = {
    vacation: [],
    sick: ['Medical certificate (for absences of more than one day, or as required by HR)'],
    mandatory_forced_leave: ['Official directive or memorandum from the head of office'],
    maternity_leave: ['Maternity notification form (MAT-1)', 'SSS documents (if applicable)'],
    paternity_leave: ['Marriage certificate', 'Birth certificate of the child'],
    special_privilege_leave: ['Certification of eligibility from the head of agency'],
    solo_parent_leave: ['Valid Solo Parent ID', 'Certification of eligibility as solo parent'],
    study_leave: ['Certificate of enrollment / registration from the school', 'Program of study or endorsement (if applicable)'],
    vawc_leave: ['Barangay Protection Order (BPO) or certification', 'Police / medical report (if applicable)'],
    rehabilitation_privilege: ['Medical certification for rehabilitation treatment'],
    special_leave_benefits_women: ['Medical certificate attesting to the gynecological condition'],
    special_emergency: ['Certification from barangay / municipal authorities on the calamity'],
    adoption_leave: ['Court order or placement authority document', 'Birth certificate of the child (if available)'],
    others_specify: ['Supporting documents relevant to the purpose of leave (if any)']
  };

  // Get color classes for requirements display
  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'border-blue-500 bg-blue-50 text-blue-800',
      green: 'border-green-500 bg-green-50 text-green-800',
      orange: 'border-orange-500 bg-orange-50 text-orange-800',
      pink: 'border-pink-500 bg-pink-50 text-pink-800',
      teal: 'border-teal-500 bg-teal-50 text-teal-800',
      purple: 'border-purple-500 bg-purple-50 text-purple-800',
      indigo: 'border-indigo-500 bg-indigo-50 text-indigo-800',
      cyan: 'border-cyan-500 bg-cyan-50 text-cyan-800',
      rose: 'border-rose-500 bg-rose-50 text-rose-800',
      amber: 'border-amber-500 bg-amber-50 text-amber-800',
      fuchsia: 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-800',
      red: 'border-red-500 bg-red-50 text-red-800',
      emerald: 'border-emerald-500 bg-emerald-50 text-emerald-800',
      gray: 'border-gray-500 bg-gray-50 text-gray-800'
    };
    return colorMap[color] || colorMap.gray;
  };

  const getIconBgColor = (color) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      orange: 'bg-orange-100 text-orange-600',
      pink: 'bg-pink-100 text-pink-600',
      teal: 'bg-teal-100 text-teal-600',
      purple: 'bg-purple-100 text-purple-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      cyan: 'bg-cyan-100 text-cyan-600',
      rose: 'bg-rose-100 text-rose-600',
      amber: 'bg-amber-100 text-amber-600',
      fuchsia: 'bg-fuchsia-100 text-fuchsia-600',
      red: 'bg-red-100 text-red-600',
      emerald: 'bg-emerald-100 text-emerald-600',
      gray: 'bg-gray-100 text-gray-600'
    };
    return colorMap[color] || colorMap.gray;
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
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pb-24">

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
                <div id="step1" className="space-y-6 pb-4">
                  <h3 className="font-medium text-lg text-gray-800">Select Leave Type</h3>

                  {/* Leave Type Dropdown */}
                  <div className="form-control w-full mb-2">
                    <label className="label">
                      <span className="label-text font-medium text-gray-700">Leave Type</span>
                    </label>
                    <select
                      name="leaveType"
                      value={formData.leaveType}
                      onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value, otherSpecify: ''}))}
                      className="select select-bordered w-full text-base"
                    >
                      <option value="" disabled>-- Select Leave Type --</option>
                      {leaveTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Others Specify Input */}
                  {formData.leaveType === 'others_specify' && (
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium text-gray-700">Purpose of Leave</span>
                      </label>
                      <input
                        type="text"
                        name="otherSpecify"
                        value={formData.otherSpecify}
                        onChange={handleInputChange}
                        placeholder="Please specify the purpose of your leave"
                        className="input input-bordered w-full"
                      />
                    </div>
                  )}

                  {/* Requirements Display */}
                  {formData.leaveType && leaveTypeRequirements[formData.leaveType] && (
                    <div className={`border-l-4 rounded-r-lg p-5 ${getColorClasses(leaveTypeRequirements[formData.leaveType].color)}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`rounded-full p-2 ${getIconBgColor(leaveTypeRequirements[formData.leaveType].color)}`}>
                          <i className={`fas ${leaveTypeRequirements[formData.leaveType].icon} text-lg`}></i>
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">
                            {leaveTypeRequirements[formData.leaveType].title}
                          </h4>
                          <p className="text-sm opacity-75">Requirements & Guidelines</p>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {leaveTypeRequirements[formData.leaveType].requirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <i className="fas fa-check-circle mt-0.5 flex-shrink-0 opacity-75"></i>
                            <span className="text-sm">{req}</span>
                          </li>
                        ))}
                      </ul>
                      {leaveTypeRequiredDocuments[formData.leaveType]?.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-current border-opacity-20">
                          <p className="text-sm font-bold mb-2">
                            <i className="fas fa-paperclip mr-1"></i>
                            Required Supporting Documents
                          </p>
                          <ul className="space-y-1.5">
                            {leaveTypeRequiredDocuments[formData.leaveType].map((doc, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <i className="fas fa-file-alt mt-0.5 flex-shrink-0 opacity-75"></i>
                                <span className="text-sm">{doc}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs mt-2 opacity-75">
                            You can attach these in the next step (Confirmation) when you submit your request.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

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
                  
                  {/* Purpose of Request - Monetization / Terminal Leave (6.B on CS Form No. 6) */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">Purpose of Request <span className="text-xs text-gray-400 font-normal">(if applicable)</span></h4>
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input
                          type="checkbox"
                          name="leavePurpose"
                          value="monetization"
                          className="checkbox checkbox-sm checkbox-primary"
                          checked={formData.leavePurpose === 'monetization'}
                          onChange={handlePurposeChange}
                        />
                        <span className="label-text text-gray-700">Monetization of Leave Credits</span>
                      </label>
                    </div>
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input
                          type="checkbox"
                          name="leavePurpose"
                          value="terminal_leave"
                          className="checkbox checkbox-sm checkbox-primary"
                          checked={formData.leavePurpose === 'terminal_leave'}
                          onChange={handlePurposeChange}
                        />
                        <span className="label-text text-gray-700">Terminal Leave</span>
                      </label>
                    </div>

                    {/* Monetization / Terminal Leave info */}
                    {formData.leavePurpose && (
                      <div className={`border-l-4 rounded-r-lg p-4 ${formData.leavePurpose === 'monetization' ? 'border-lime-500 bg-lime-50' : 'border-slate-500 bg-slate-50'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`rounded-full p-2 ${formData.leavePurpose === 'monetization' ? 'bg-lime-100 text-lime-600' : 'bg-slate-100 text-slate-600'}`}>
                            <i className={`fas ${formData.leavePurpose === 'monetization' ? 'fa-coins' : 'fa-flag-checkered'} text-lg`}></i>
                          </div>
                          <div>
                            {formData.leavePurpose === 'monetization' ? (
                              <>
                                <h4 className="font-bold text-lime-800">Monetization of Leave Credits</h4>
                                <p className="text-sm text-lime-700 mt-1">
                                  This request will monetize <span className="font-bold">{formData.numberOfDays} vacation leave day(s)</span> into cash.
                                  The days are deducted from your vacation leave credits upon approval, and HR certifies
                                  your available credits before approving.
                                </p>
                                <ul className="text-xs text-lime-700 mt-2 space-y-1">
                                  <li className="flex items-start gap-1.5"><i className="fas fa-check-circle mt-0.5 flex-shrink-0"></i><span>Must have at least 15 days of accumulated vacation leave credits</span></li>
                                  <li className="flex items-start gap-1.5"><i className="fas fa-check-circle mt-0.5 flex-shrink-0"></i><span>Monetize a minimum of 10 days, up to a maximum of 30 days per year</span></li>
                                  <li className="flex items-start gap-1.5"><i className="fas fa-check-circle mt-0.5 flex-shrink-0"></i><span>At least 5 days of vacation leave must remain after monetization</span></li>
                                  <li className="flex items-start gap-1.5"><i className="fas fa-check-circle mt-0.5 flex-shrink-0"></i><span>May be availed only once a year</span></li>
                                  <li className="flex items-start gap-1.5"><i className="fas fa-check-circle mt-0.5 flex-shrink-0"></i><span>Money value is exempt from income tax (CSC MC No. 31 s. 1991; NIRC Sec. 32(B)(7)(e))</span></li>
                                </ul>
                                <p className="text-xs text-lime-700 mt-2">
                                  Required documents: Application for monetization of leave credits, Certificate of available leave credits from HR.
                                </p>
                              </>
                            ) : (
                              <>
                                <h4 className="font-bold text-slate-800">Terminal Leave</h4>
                                <p className="text-sm text-slate-700 mt-1">
                                  This request is for terminal leave benefits — the cash equivalent of <span className="font-bold">{formData.numberOfDays} vacation leave day(s)</span>
                                  upon retirement or separation from service.
                                </p>
                                <p className="text-xs text-slate-700 mt-1">
                                  Required documents: Certificate of retirement / separation from service, Certificate of leave credits from HR.
                                </p>
                              </>
                            )}
                          </div>
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

                  {/* Supporting Documents */}
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 p-4 border-b border-gray-300 flex items-center justify-between">
                      <h4 className="font-bold text-gray-800 text-lg">
                        <i className="fas fa-paperclip text-blue-500 mr-2"></i>
                        Supporting Documents
                      </h4>
                      <span className="text-xs text-gray-500">Optional • Max 5 files • 10MB each</span>
                    </div>
                    <div className="p-4">
                      {/* Guidance per leave type */}
                      {leaveTypeRequiredDocuments[formData.leaveType]?.length > 0 && (
                        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm font-semibold text-blue-800 mb-1">Suggested documents for {leaveTypeRequirements[formData.leaveType]?.title || 'this leave type'}:</p>
                          <ul className="list-disc list-inside text-sm text-blue-700 space-y-0.5">
                            {leaveTypeRequiredDocuments[formData.leaveType].map((doc, index) => (
                              <li key={index}>{doc}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* File input */}
                      <label className="btn btn-outline border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white w-full cursor-pointer">
                        <i className="fas fa-upload mr-2"></i>
                        Choose Files (Image, PDF, Word, Excel)
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                          className="hidden"
                          onChange={handleDocumentSelect}
                        />
                      </label>

                      {documentsError && (
                        <p className="text-sm text-red-600 mt-2">{documentsError}</p>
                      )}

                      {/* Selected files */}
                      {documents.length > 0 && (
                        <ul className="mt-4 space-y-2">
                          {documents.map((doc, index) => (
                            <li key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                              <div className="flex items-center min-w-0">
                                <i className={`fas ${doc.type.startsWith('image/') ? 'fa-file-image' : doc.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-alt'} text-blue-500 mr-3`}></i>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                                  <p className="text-xs text-gray-500">{formatFileSize(doc.size)}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeDocument(index)}
                                className="btn btn-ghost btn-xs text-red-500"
                                title="Remove file"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {documents.length === 0 && (
                        <p className="text-sm text-gray-500 mt-3 text-center">
                          No files attached yet. Supporting documents are optional but recommended.
                        </p>
                      )}
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
        message={successMessage}
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
        onClose={() => {
          setShowWarningModal(false);
          // Discard any pending adjusted values if the user cancels the warning,
          // so a later submit never reuses stale adjusted dates/days.
          setFormData(prev => {
            const { _adjustedData, ...rest } = prev;
            return rest;
          });
        }}
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

            if (submitData.leaveType === 'special_leave_benefits_women') {
              // This leave type has no location radio — the illness text is the location
              whereSpentValue = submitData.locationSpecify;
            } else if (!requiresLocationInfo) {
              whereSpentValue = 'not_applicable'; // Use a default value for leave types that don't require location
            }

            // For the new structure, we will use leave_type directly with the correct value
            // If a purpose (monetization / terminal leave) is selected, it becomes the leave type.
            // If leaveType is 'others_specify', we use the otherSpecify value.
            const actualLeaveType = submitData.leavePurpose
              ? submitData.leavePurpose
              : (submitData.leaveType === 'others_specify'
                ? submitData.otherSpecify
                : submitData.leaveType);

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
              // Upload any selected supporting documents to the new request
              const newRequestId = response.data.data?._id;
              const docsOk = await uploadLeaveDocuments(newRequestId);
              setSuccessMessage(docsOk
                ? `Your leave request has been submitted successfully. ${getRoleBasedMessage(userRole)}`
                : 'Your leave request was submitted, but the supporting documents could not be uploaded. You can attach them later from the request details page.');

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