import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';

// Leave types that draw from vacation credits vs sick credits (mirrors server getLeaveCreditsInfo).
// Used by the 7.A Certification of Leave Credits table to show this application's deduction.
const VACATION_POOL_TYPES = ['vacation', 'special_privilege_leave', 'study_leave', 'mandatory_forced_leave', 'monetization', 'terminal_leave'];
// Statutory leaves (maternity, paternity, solo parent, VAWC, rehabilitation, SLBW,
// special emergency, adoption) are separate paid entitlements — they never consume
// vacation/sick credits, so only sick leave draws from the sick pool.
const SICK_POOL_TYPES = ['sick'];

// Required supporting documents per leave type (mirrors server/utils/cscRules.js)
const REQUIRED_DOCUMENT_LABELS = {
  sick: 'Medical certificate (required for absences in excess of five (5) successive days — Sec. 53)',
  mandatory_forced_leave: 'Official directive or memorandum from the head of office',
  maternity_leave: 'Maternity notification form (MAT-1)',
  paternity_leave: 'Marriage certificate; Birth certificate of the child',
  special_privilege_leave: 'Certification of eligibility from the head of agency',
  solo_parent_leave: 'Valid Solo Parent ID; Certification of eligibility as solo parent',
  study_leave: 'Certificate of enrollment / registration from the school; Program of study or endorsement',
  vawc_leave: 'Barangay Protection Order (BPO) or certification; Police / medical report (if applicable)',
  rehabilitation_privilege: 'Medical certification for rehabilitation treatment',
  special_leave_benefits_women: 'Medical certificate attesting to the gynecological condition',
  special_emergency: 'Certification from barangay / municipal authorities on the calamity',
  adoption_leave: 'Court order or placement authority document; Birth certificate of the child (if available)',
  monetization: 'Application for monetization of leave credits; Certificate of available leave credits from HR',
  terminal_leave: 'Certificate of retirement / separation from service; Certificate of leave credits from HR'
};

// Number of successive (calendar) days covered by the application (Sec. 53: MC at > 5)
const successiveCalendarDays = (leaveRequest) => {
  if (!leaveRequest) return 0;
  const s = new Date(leaveRequest.start_date);
  const e = new Date(leaveRequest.end_date);
  if (isNaN(s) || isNaN(e) || e < s) return 0;
  return Math.round((e - s) / 86400000) + 1;
};

// Required documents for this request (sick requires the MC only beyond 5 successive days)
const getRequiredDocsForRequest = (leaveRequest) => {
  if (!leaveRequest) return [];
  const type = leaveRequest.leave_type;
  if (type === 'sick') {
    return successiveCalendarDays(leaveRequest) > 5 ? [REQUIRED_DOCUMENT_LABELS.sick] : [];
  }
  return REQUIRED_DOCUMENT_LABELS[type] ? REQUIRED_DOCUMENT_LABELS[type].split('; ').map(s => s.trim()) : [];
};

const HRLeaveRequestDetails = () => {
  const [leaveRequest, setLeaveRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvalData, setApprovalData] = useState({
    approval: 'approve',
    approved_for: 'with_pay',
    approved_for_other: '',
    disapproved_due_to: '',
    credits_certified: false,
    documents_waived: false,
    documents_waiver_reason: '',
    lwop_clearance: false,
    lwop_clearance_reason: ''
  });
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [hasSufficientCredits, setHasSufficientCredits] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [documentsError, setDocumentsError] = useState('');
  const [documentsSuccess, setDocumentsSuccess] = useState('');

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Upload supporting documents (HR can attach on behalf of the employee)
  const handleDocumentSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setDocumentsError('');
    setDocumentsSuccess('');

    const token = localStorage.getItem('token');
    const formData = new FormData();
    files.forEach(f => formData.append('documents', f));
    setUploadingDocs(true);
    try {
      const response = await axios.post(`/api/leave-requests/${id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.data.success) {
        setLeaveRequest(prev => ({ ...prev, documents: response.data.documents }));
        setDocumentsSuccess(response.data.message);
      } else {
        setDocumentsError(response.data.message || 'Failed to upload documents');
      }
    } catch (err) {
      setDocumentsError(err.response?.data?.message || 'Failed to upload documents');
    } finally {
      setUploadingDocs(false);
    }
  };

  // Delete a supporting document
  const handleDeleteDocument = async (docId) => {
    setDocumentsError('');
    setDocumentsSuccess('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/leave-requests/${id}/documents/${docId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.data.success) {
        setLeaveRequest(prev => ({ ...prev, documents: response.data.documents }));
        setDocumentsSuccess(response.data.message);
      } else {
        setDocumentsError(response.data.message || 'Failed to delete document');
      }
    } catch (err) {
      setDocumentsError(err.response?.data?.message || 'Failed to delete document');
    }
  };

  const getDocumentIcon = (mimetype) => {
    if (mimetype?.startsWith('image/')) return 'fa-file-image';
    if (mimetype === 'application/pdf') return 'fa-file-pdf';
    if (mimetype?.includes('word')) return 'fa-file-word';
    if (mimetype?.includes('sheet') || mimetype?.includes('excel')) return 'fa-file-excel';
    return 'fa-file-alt';
  };

  const getDocumentColor = (mimetype) => {
    if (mimetype?.startsWith('image/')) return 'text-purple-500';
    if (mimetype === 'application/pdf') return 'text-red-500';
    if (mimetype?.includes('word')) return 'text-blue-500';
    if (mimetype?.includes('sheet') || mimetype?.includes('excel')) return 'text-green-500';
    return 'text-gray-500';
  };
  
  const navigate = useNavigate();
  const { id } = useParams();

  // Fetch user profile
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

        if (response.data && response.data.success) {
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
  }, [navigate]);

  // Fetch leave request details
  useEffect(() => {
    const fetchLeaveRequest = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/hr/leave-requests/${id}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data.success) {
          setLeaveRequest(response.data.leaveRequest);
          setHasSufficientCredits(response.data.hasSufficientCredits);
          
          // If insufficient credits, default to 'without_pay' instead of 'with_pay'
          if (!response.data.hasSufficientCredits) {
            setApprovalData(prev => ({
              ...prev,
              approved_for: 'without_pay'
            }));
          }
          
          // Maternity beyond the paid tier (RA 11210) also defaults to 'without_pay'
          const lr = response.data.leaveRequest;
          if (lr && lr.leave_type === 'maternity_leave') {
            const days = parseFloat(lr.number_of_days || 0);
            const solo = lr.user_id && lr.user_id.solo_parent === true;
            if (days > (solo ? 120 : 105)) {
              setApprovalData(prev => ({
                ...prev,
                approved_for: 'without_pay'
              }));
            }
          }
        } else {
          setError(response.data.message || 'Failed to load leave request details');
        }
      } catch (error) {
        console.error('Error fetching leave request:', error);
        setError('Failed to load leave request details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchLeaveRequest();
    }
  }, [id]);

  // RA 11210 maternity pay tiers: 105 days with pay, +15 days with pay for
  // solo parents (120 total), and beyond that only the without-pay extension
  // (maximum 135 days).
  const isMaternity = leaveRequest?.leave_type === 'maternity_leave';
  const maternityDays = isMaternity ? parseFloat(leaveRequest?.number_of_days || 0) : 0;
  const isMaternitySoloParent = leaveRequest?.user_id?.solo_parent === true;
  const maternityWithPayAllowed = !isMaternity ||
    maternityDays <= 105 ||
    (isMaternitySoloParent && maternityDays <= 120);

  const handleApprovalChange = (field, value) => {
    setApprovalData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Prevent selecting 'with_pay' when the employee has insufficient credits
      // or the maternity leave exceeds the paid tier (RA 11210).
      if (field === 'approved_for' && value === 'with_pay' && (!hasSufficientCredits || (isMaternity && !maternityWithPayAllowed))) {
        // Keep the previous value or default to 'without_pay'
        newData[field] = prev.approved_for !== 'with_pay' ? prev.approved_for : 'without_pay';
      }
      
      return newData;
    });
    
    // Clear error when user makes changes
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const toggleDecisionOptions = () => {
    // This will be handled by the UI directly
  };

  const nextStep = (step) => {
    // Validation for step 2 before proceeding to step 3 — only when the request
    // is still actionable. Already-processed requests are view-only navigation.
    if (leaveRequest?.status === 'recommended' && step === 2) {
      const newErrors = {};
      
      // If approving, check approval type selections
      if (approvalData.approval === 'approve') {
        // 7.A Certification of Leave Credits is required for with-pay approvals
        if ((approvalData.approved_for === 'with_pay' || approvalData.approved_for === 'others') && !approvalData.credits_certified) {
          newErrors.credits_certified = "Please certify the employee's leave credits before approving";
        }

        // If "others" is selected, require specification
        if (approvalData.approved_for === 'others' && (!approvalData.approved_for_other || approvalData.approved_for_other.trim() === '')) {
          newErrors.approved_for_other = 'Please specify the approval type when selecting "Others"';
        }

        // CSC compliance: a document waiver and an LWOP clearance both require a reason
        if (approvalData.documents_waived && (!approvalData.documents_waiver_reason || approvalData.documents_waiver_reason.trim() === '')) {
          newErrors.documents_waiver_reason = 'Please provide a reason for waiving the document requirement';
        }
        if (approvalData.lwop_clearance && (!approvalData.lwop_clearance_reason || approvalData.lwop_clearance_reason.trim() === '')) {
          newErrors.lwop_clearance_reason = 'Please provide the clearance reference / reason';
        }
      } 
      // If disapproving, require reason
      else if (approvalData.approval === 'disapprove' && (!approvalData.disapproved_due_to || approvalData.disapproved_due_to.trim() === '')) {
        newErrors.disapproved_due_to = 'Please provide a reason for disapproval';
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }
    
    setCurrentStep(step + 1);
  };

  const prevStep = (step) => {
    setCurrentStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const submitApproval = async () => {
    setShowConfirmModal(false);
    setProcessing(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/hr/leave-requests/${id}/approve`, approvalData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setShowSuccessModal(true);
      } else {
        setError(response.data.message || 'Failed to process leave request. Please try again.');
      }
    } catch (error) {
      console.error('Error processing leave request:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setError(error.response.data.message || `Error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        // The request was made but no response was received
        setError('Network error. Please check your connection and try again.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    // Navigate back to HR dashboard after a short delay
    setTimeout(() => {
      navigate('/hr/leave-requests', { 
        state: { message: 'Leave request has been processed successfully.' } 
      });
    }, 1000);
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'disapproved':
        return 'Rejected';
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

  if (loading) {
    return (
      <Layout title="Approve Leave Request">
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Approve Leave Request">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      </Layout>
    );
  }

  if (!leaveRequest) {
    return (
      <Layout title="Approve Leave Request">
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Leave request not found</span>
        </div>
      </Layout>
    );
  }

  // Terminal leave commutes the full accumulated vacation + sick leave balance —
  // vacation credits are consumed first, the remainder from sick credits (CSC MC
  // No. 14 s. 1999, as amended). Once approved, the actual split is stored on the
  // request (vacation_days / sick_days); while pending it is projected against the
  // employee's current balances.
  const isTerminalLeave = leaveRequest.leave_type === 'terminal_leave';
  const terminalVacationDays = isTerminalLeave
    ? (leaveRequest.vacation_days ?? Math.min(leaveRequest.number_of_days || 0, Math.max(0, leaveRequest.user_id?.vacation_balance ?? 0)))
    : (VACATION_POOL_TYPES.includes(leaveRequest.leave_type) ? (leaveRequest.number_of_days || 0) : 0);
  const terminalSickDays = isTerminalLeave
    ? (leaveRequest.sick_days ?? Math.max(0, (leaveRequest.number_of_days || 0) - terminalVacationDays))
    : (SICK_POOL_TYPES.includes(leaveRequest.leave_type) ? (leaveRequest.number_of_days || 0) : 0);
  // Full commuted balance (VL + SL) — the basis for the terminal leave value estimate
  const terminalTotalDays = terminalVacationDays + terminalSickDays;

  // CSC compliance state for this request
  const requiredDocs = getRequiredDocsForRequest(leaveRequest);
  const hasDocuments = (leaveRequest.documents || []).length > 0;
  const docsMissing = requiredDocs.length > 0 && !hasDocuments;
  const isSickOver5Days = leaveRequest.leave_type === 'sick' && successiveCalendarDays(leaveRequest) > 5;
  // Sec. 56 one-way draw — sick leave may be charged against vacation when sick credits are exhausted
  const canDrawFromVacation =
    leaveRequest.leave_type === 'sick' &&
    !hasSufficientCredits &&
    (leaveRequest.user_id?.vacation_balance || 0) >= (leaveRequest.number_of_days || 0);
  // Sec. 49: 5-working-day approval SLA (calendar-day estimate shown for transparency)
  const slaDays = Math.max(0, Math.ceil((new Date() - new Date(leaveRequest.createdAt)) / 86400000));

  return (
    <Layout title="Approve Leave Request">
      <div className="card bg-white shadow-md mb-6">
        <div className="card-body">
          <h2 className="card-title text-xl font-bold text-gray-800 mb-4">
            <i className="fas fa-check-circle text-green-500 mr-2"></i>
            Leave Approval Process
          </h2>

          {/* Sec. 49: approval SLA — deemed approved after five (5) working days */}
          {['pending', 'recommended', 'hr_approved'].includes(leaveRequest.status) && (
            <div className={`alert ${slaDays > 7 ? 'alert-warning' : 'alert-info'} shadow-lg mb-6`}>
              <div>
                <i className={`fas ${slaDays > 7 ? 'fa-hourglass-end' : 'fa-hourglass-half'}`}></i>
                <span>
                  <strong>SLA:</strong> {slaDays} day(s) since this request was received. Per CSC Sec. 49, an application not acted on within five (5) working days is deemed approved.
                </span>
              </div>
            </div>
          )}

          {/* Notice for insufficient credits */}
          {!hasSufficientCredits && (
            <div className="alert alert-warning shadow-lg mb-6">
              <div>
                <i className="fas fa-info-circle text-warning"></i>
                <span><strong>Notice:</strong> This leave request was submitted with insufficient leave credits. The "with pay" option has been disabled. The leave will be considered without pay.</span>
              </div>
            </div>
          )}

          {/* Step Indicator */}
          <div className="w-full py-4">
            <ul className="steps steps-horizontal w-full">
              <li className={`step ${currentStep >= 1 ? 'step-primary' : ''}`}>Review Request</li>
              <li className={`step ${currentStep >= 2 ? 'step-primary' : ''}`} id="step2Indicator">Approval Decision</li>
              <li className={`step ${currentStep >= 3 ? 'step-primary' : ''}`} id="step3Indicator">Review</li>
            </ul>
          </div>

          <form id="approvalForm" onSubmit={handleSubmit}>
            {/* Step 1: Review Request */}
            {currentStep === 1 && (
              <div id="step1" className="space-y-6">
                <h3 className="font-medium text-lg text-gray-800">Review Leave Request</h3>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
                  {/* Employee Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                    <div className="avatar">
                      {leaveRequest.user_id?.profile_image ? (
                        <div className="w-14 h-14 rounded-full">
                          <img 
                            src={leaveRequest.user_id.profile_image} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                          <span className="text-white font-bold text-lg flex items-center justify-center w-full h-full leading-none">
                            {leaveRequest.user_id?.first_name ? 
                              `${leaveRequest.user_id.first_name.charAt(0)}${leaveRequest.user_id.last_name.charAt(0)}`.toUpperCase() : 
                              'N/A'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-center sm:text-left">
                      <h4 className="text-xl font-bold text-gray-800">
                        {leaveRequest.user_id?.first_name ? 
                          `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}` : 
                          'Unknown Employee'}
                      </h4>
                      <p className="text-gray-600">
                        {leaveRequest.user_id?.department_id?.name || 'Department not specified'} • 
                        {leaveRequest.user_id?.position || 'Position not specified'}
                      </p>
                      {(leaveRequest.leave_type === 'vacation' || leaveRequest.leave_type === 'sick') && (
                        <p className="text-sm text-gray-500 mt-1">
                          {leaveRequest.leave_type === 'vacation' 
                            ? `Vacation Balance: ${leaveRequest.user_id?.vacation_balance?.toFixed(3) || 0} days` 
                            : `Sick Balance: ${leaveRequest.user_id?.sick_balance?.toFixed(3) || 0} days`}
                        </p>
                      )}
                      {!hasSufficientCredits && (
                        <div className="badge badge-warning mt-2">Submitted with insufficient credits</div>
                      )}
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                      <h5 className="font-semibold text-blue-600 mb-3">Type of Leave</h5>
                      <p className="font-medium text-gray-800 text-lg">
                        {leaveRequest.leave_type === 'vacation' ? 'Vacation Leave' : 
                         leaveRequest.leave_type === 'sick' ? 'Sick Leave' : 
                         leaveRequest.leave_type === 'mandatory_forced_leave' ? 'Mandatory/Forced Leave' :
                         leaveRequest.leave_type === 'maternity_leave' ? 'Maternity Leave' :
                         leaveRequest.leave_type === 'paternity_leave' ? 'Paternity Leave' :
                         leaveRequest.leave_type === 'special_privilege_leave' ? 'Special Privilege Leave' :
                         leaveRequest.leave_type === 'solo_parent_leave' ? 'Solo Parent Leave' :
                         leaveRequest.leave_type === 'study_leave' ? 'Study Leave' :
                         leaveRequest.leave_type === 'vawc_leave' ? 'VAWC Leave' :
                         leaveRequest.leave_type === 'rehabilitation_privilege' ? 'Rehabilitation Privilege' :
                         leaveRequest.leave_type === 'special_leave_benefits_women' ? 'Special Leave Benefits Women' :
                         leaveRequest.leave_type === 'special_emergency' ? 'Special Emergency Leave' :
                         leaveRequest.leave_type === 'adoption_leave' ? 'Adoption Leave' :
                         leaveRequest.leave_type === 'wellness_leave' ? 'Wellness Leave' :
                         leaveRequest.leave_type === 'monetization' ? 'Monetization of Leave Credits' :
                         leaveRequest.leave_type === 'terminal_leave' ? 'Terminal Leave' :
                         leaveRequest.leave_type === 'others_specify' ? 'Others (Specify)' :
                         leaveRequest.leave_type}
                      </p>

                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                      <h5 className="font-semibold text-blue-600 mb-3">Applied On</h5>
                      <p className="font-medium text-gray-800 text-lg">
                        {new Date(leaveRequest.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                      <h5 className="font-semibold text-blue-600 mb-3">Inclusive Dates</h5>
                      <p className="font-medium text-gray-800 text-lg">
                        {new Date(leaveRequest.start_date).toLocaleDateString() === new Date(leaveRequest.end_date).toLocaleDateString()
                          ? new Date(leaveRequest.start_date).toLocaleDateString()
                          : `${new Date(leaveRequest.start_date).toLocaleDateString()}-${new Date(leaveRequest.end_date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                      <h5 className="font-semibold text-blue-600 mb-3">Number of Working Days</h5>
                      <p className="font-medium text-gray-800 text-lg">{leaveRequest.number_of_days} days</p>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <h5 className="font-semibold text-blue-600 mb-3">Where Leave Will Be Spent</h5>
                          <p className="font-medium text-gray-800">{leaveRequest.where_spent && leaveRequest.where_spent !== 'not_applicable' ? leaveRequest.where_spent : 'Not applicable'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                      <h5 className="font-semibold text-blue-600 mb-3">Commutation</h5>
                      <p className="font-medium text-gray-800">
                        {leaveRequest.commutation ? 'Requested' : 'Not Requested'}
                      </p>
                    </div>
                  </div>

                  {/* Recommendation Section */}
                  {leaveRequest.recommendations && leaveRequest.recommendations.length > 0 && (
                    <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                      <h4 className="font-semibold text-blue-600 mb-3">Department Recommendation</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Authorized Personnel</label>
                          <p className="font-medium text-gray-800">
                            {leaveRequest.recommendations[0]?.department_admin_id?.first_name || ''} 
                            {leaveRequest.recommendations[0]?.department_admin_id?.last_name ? ` ${leaveRequest.recommendations[0].department_admin_id.last_name}` : ''}
                          </p>
                          <p className="text-sm text-gray-500">Department Head</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                          <p className="font-medium text-gray-800 text-capitalize">
                            {leaveRequest.recommendations[0]?.recommendation || ''}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {leaveRequest.recommendations[0]?.remarks || ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Supporting Documents */}
                  <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-blue-600">
                        <i className="fas fa-paperclip mr-2"></i>
                        Supporting Documents
                      </h4>
                      <span className="text-xs text-gray-500">{(leaveRequest.documents || []).length} attached</span>
                    </div>

                    {documentsError && (
                      <div className="alert alert-error shadow-lg mb-3">
                        <div>
                          <i className="fas fa-exclamation-circle text-error"></i>
                          <span>{documentsError}</span>
                        </div>
                      </div>
                    )}
                    {documentsSuccess && (
                      <div className="alert alert-success shadow-lg mb-3">
                        <div>
                          <i className="fas fa-check-circle text-success"></i>
                          <span>{documentsSuccess}</span>
                        </div>
                      </div>
                    )}

                    {(!leaveRequest.documents || leaveRequest.documents.length === 0) ? (
                      <p className="text-sm text-gray-500">No supporting documents attached to this leave request.</p>
                    ) : (
                      <ul className="space-y-2">
                        {leaveRequest.documents.map(doc => (
                          <li key={doc._id || doc.url} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center min-w-0 group"
                            >
                              <i className={`fas ${getDocumentIcon(doc.mimetype)} ${getDocumentColor(doc.mimetype)} mr-3 text-lg`}></i>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-blue-600 group-hover:underline truncate">{doc.name}</p>
                                <p className="text-xs text-gray-500">
                                  {doc.uploaded_at ? `Uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}` : ''}{doc.size ? ` • ${formatFileSize(doc.size)}` : ''}
                                </p>
                              </div>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc._id)}
                              className="btn btn-ghost btn-xs text-red-500 ml-2"
                              title="Delete document"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <label className="btn btn-outline border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white w-full mt-4 cursor-pointer">
                      {uploadingDocs ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-upload mr-2"></i>
                          Attach Documents (Image, PDF, Word, Excel)
                        </>
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        className="hidden"
                        onChange={handleDocumentSelect}
                        disabled={uploadingDocs}
                      />
                    </label>
                  </div>
                </div>

                  {/* Required-document compliance (Secs. 53/55 + special laws) */}
                  {requiredDocs.length > 0 && (
                    <div className={`p-4 rounded-lg border mb-4 ${hasDocuments ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-300'}`}>
                      <h5 className="font-semibold mb-2">
                        <i className={`fas fa-paperclip mr-2 ${hasDocuments ? 'text-green-600' : 'text-amber-600'}`}></i>
                        Required Supporting Documents
                      </h5>
                      <ul className="text-sm list-disc list-inside space-y-1 mb-2">
                        {requiredDocs.map((doc, i) => <li key={i}>{doc}</li>)}
                      </ul>
                      <p className={`text-sm ${hasDocuments ? 'text-green-700' : 'text-amber-700'}`}>
                        {hasDocuments
                          ? 'Documents are attached — the requirement is satisfied.'
                          : 'No documents attached — approval will be blocked unless the requirement is waived with a reason.'}
                      </p>
                    </div>
                  )}
                  {isSickOver5Days && !hasDocuments && (
                    <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 mb-4">
                      <p className="text-sm text-amber-800">
                        <i className="fas fa-file-medical mr-2"></i>
                        <strong>Sec. 53:</strong> this sick leave exceeds five (5) successive days and requires a proper medical certificate.
                      </p>
                    </div>
                  )}

                <div className="flex justify-end mt-6">
                  {/* Navigation is always allowed so processed requests can be reviewed;
                      the final submit remains locked to the 'recommended' status below. */}
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

            {/* Step 2: Approval Decision */}
            {currentStep === 2 && (
              <div id="step2" className="space-y-6">
                <h3 className="font-medium text-lg text-gray-800">Approval Decision</h3>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h4 className="font-medium mb-4">Recommendation/Approval</h4>

                  {/* 7.A Certification of Leave Credits */}
                  <div className="mb-6 p-4 bg-white rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-blue-600">
                        <i className="fas fa-clipboard-check mr-2"></i>
                        7.A Certification of Leave Credits
                      </h5>
                      <span className="badge badge-outline text-[10px]">Required for with-pay approval</span>
                    </div>

                    <table className="table table-sm w-full text-center border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left">Particulars</th>
                          <th>Vacation Leave</th>
                          <th>Sick Leave</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="text-left font-medium">Total Earned</td>
                          <td>{(leaveRequest.user_id?.vacation_earned_total ?? 0).toFixed(3)}</td>
                          <td>{(leaveRequest.user_id?.sick_earned_total ?? 0).toFixed(3)}</td>
                        </tr>
                        <tr>
                          <td className="text-left font-medium">Less this application</td>
                          <td>{terminalVacationDays.toFixed(3)}</td>
                          <td>{terminalSickDays.toFixed(3)}</td>
                        </tr>
                        <tr>
                          <td className="text-left font-bold">Balance</td>
                          <td className="font-bold text-blue-700">{Math.max(0, (leaveRequest.user_id?.vacation_balance ?? 0) - terminalVacationDays).toFixed(3)}</td>
                          <td className="font-bold text-emerald-700">{Math.max(0, (leaveRequest.user_id?.sick_balance ?? 0) - terminalSickDays).toFixed(3)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <p className="text-xs text-gray-500 mt-2">
                      <i className="fas fa-info-circle mr-1"></i>
                      The deduction and balance above are projections for this application. The deduction is applied to the employee's actual leave credits only after the leave is approved by the Mayor.
                    </p>

                    {/* Estimated monetization value (CSC Rule XVI Sec. 22: MV = salary x days x 0.0481927) */}
                    {leaveRequest.leave_type === 'monetization' && (
                      <div className="mt-3 p-3 bg-lime-50 border border-lime-200 rounded-lg">
                        <p className="text-sm text-lime-800">
                          <i className="fas fa-coins mr-1"></i>
                          <strong>Estimated monetization value:</strong> ₱{(((leaveRequest.user_id?.salary || 0) * (leaveRequest.number_of_days || 0) * 0.0481927)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-lime-700 mt-1">
                          Computed as {leaveRequest.user_id?.salary ? `₱${Number(leaveRequest.user_id.salary).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '(no salary on file)'} × {leaveRequest.number_of_days} day(s) × 0.0481927 (CSC daily-rate factor per MC 2 s. 2016 / DBM Circular Letter 2021-4). Subject to funding availability and the agency head's recommendation.
                        </p>
                      </div>
                    )}

                    {/* Estimated terminal leave value (CSC MC No. 14 s. 1999 / DBM BC 2016-2:
                        TLB = highest monthly salary x total accumulated VL + SL days x 0.0481927) */}
                    {isTerminalLeave && (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-300 rounded-lg">
                        <p className="text-sm text-slate-800">
                          <i className="fas fa-flag-checkered mr-1"></i>
                          <strong>Estimated terminal leave value:</strong> ₱{(((leaveRequest.user_id?.salary || 0) * terminalTotalDays * 0.0481927)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-700 mt-1">
                          Computed as {leaveRequest.user_id?.salary ? `₱${Number(leaveRequest.user_id.salary).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '(no salary on file)'} × {terminalTotalDays.toFixed(3)} day(s) × 0.0481927 (CSC daily-rate factor per MC 2 s. 2016 / DBM Budget Circular 2016-2). The full balance is commuted from vacation credits first, then sick ({terminalVacationDays.toFixed(3)} VL + {terminalSickDays.toFixed(3)} SL) per CSC MC No. 14 s. 1999. This estimate uses the salary currently on file; per CSC MC No. 14 s. 1999 the actual payment is based on the highest salary rate received, so HR should verify. Terminal leave pay is exempt from income tax (CIR v. CA, G.R. No. 96016). Subject to funding availability.
                        </p>
                      </div>
                    )}

                    <label className="flex items-start gap-2 mt-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary mt-0.5"
                        checked={approvalData.credits_certified}
                        onChange={(e) => handleApprovalChange('credits_certified', e.target.checked)}
                      />
                      <span className="text-sm">
                        I certify that the above leave credits are correct and that the employee has sufficient available leave credits for this application.
                      </span>
                    </label>
                    {errors.credits_certified && (
                      <div className="text-red-500 text-sm mt-1">{errors.credits_certified}</div>
                    )}
                  </div>

                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Decision</span>
                    </label>
                    <div className="flex flex-col space-y-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="approval" 
                          value="approve"
                          className="radio radio-success" 
                          checked={approvalData.approval === 'approve'}
                          onChange={(e) => handleApprovalChange('approval', e.target.value)}
                        />
                        <span>Approve</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="approval" 
                          value="disapprove"
                          className="radio radio-error" 
                          checked={approvalData.approval === 'disapprove'}
                          onChange={(e) => handleApprovalChange('approval', e.target.value)}
                        />
                        <span>Disapprove</span>
                      </label>
                    </div>
                  </div>

                  {/* Sub-options for Approval */}
                  {approvalData.approval === 'approve' && (
                    <div id="approvalOptionsContainer" className="ml-6 border-l-2 border-green-200 pl-4 mb-4">
                      {isMaternity && (
                        <div className={`alert ${maternityWithPayAllowed ? 'alert-info' : 'alert-warning'} text-sm mb-4`}>
                          <div>
                            <strong>RA 11210 — Maternity pay tiers:</strong>
                            <ul className="list-disc ml-5 mt-1 space-y-0.5">
                              <li>Up to 105 days with pay</li>
                              <li>+15 days with pay for solo parents (120 total)</li>
                              <li>Beyond that: without-pay extension only (max 135)</li>
                            </ul>
                            {maternityDays > 105 && (
                              <p className="mt-2">
                                {isMaternitySoloParent
                                  ? `Employee is a solo parent — up to 120 days may be approved with pay.`
                                  : `Employee is NOT a solo parent — only the first 105 days may be approved with pay; the rest must be without pay.`}
                              </p>
                            )}
                            {maternityDays > 120 && (
                              <p className="mt-1 font-medium">This request exceeds 120 days — it can only be approved <u>without pay</u>.</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Approval Type:</span>
                        </label>
                        <div className="flex flex-col space-y-3">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="approved_for" 
                              value="with_pay"
                              className="radio radio-sm radio-success" 
                              checked={approvalData.approved_for === 'with_pay'}
                              onChange={(e) => handleApprovalChange('approved_for', e.target.value)}
                              disabled={!hasSufficientCredits || (isMaternity && !maternityWithPayAllowed)}
                            />
                            <span>Approved for {leaveRequest.number_of_days} day(s) with pay</span>
                            {!hasSufficientCredits && (
                              <span className="badge badge-warning ml-2">Insufficient credits</span>
                            )}
                            {isMaternity && !maternityWithPayAllowed && (
                              <span className="badge badge-warning ml-2">Beyond paid tier (RA 11210)</span>
                            )}
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="approved_for" 
                              value="without_pay"
                              className="radio radio-sm radio-warning" 
                              checked={approvalData.approved_for === 'without_pay'}
                              onChange={(e) => handleApprovalChange('approved_for', e.target.value)}
                            />
                            <span>Approved for {leaveRequest.number_of_days} day(s) without pay</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="approved_for" 
                              value="others"
                              className="radio radio-sm radio-info" 
                              checked={approvalData.approved_for === 'others'}
                              onChange={(e) => handleApprovalChange('approved_for', e.target.value)}
                              disabled={!hasSufficientCredits || (isMaternity && !maternityWithPayAllowed)}
                            />
                            <span>Others (specify)</span>
                            {!hasSufficientCredits && (
                              <span className="badge badge-warning ml-2">Insufficient credits</span>
                            )}
                            {isMaternity && !maternityWithPayAllowed && (
                              <span className="badge badge-warning ml-2">Beyond paid tier (RA 11210)</span>
                            )}
                          </label>
                          {approvalData.approved_for === 'others' && (
                            <div className="mt-2 ml-6">
                              <input
                                type="text"
                                name="approved_for_other"
                                className={`input input-bordered input-sm w-full max-w-xs ${errors.approved_for_other ? 'input-error' : ''}`}
                                placeholder="Please specify"
                                value={approvalData.approved_for_other}
                                onChange={(e) => handleApprovalChange('approved_for_other', e.target.value)}
                              />
                              {errors.approved_for_other && (
                                <div className="text-red-500 text-sm mt-1">{errors.approved_for_other}</div>
                              )}
                            </div>
                          )}

                          {/* Sec. 56: sick → vacation one-way draw when sick credits are exhausted */}
                          {canDrawFromVacation && approvalData.approved_for === 'with_pay' && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <i className="fas fa-info-circle mr-1"></i>
                                Sick leave credits are exhausted but vacation credits are available — per CSC Sec. 56, this sick leave may be charged against vacation leave (one-way draw).
                              </p>
                            </div>
                          )}

                          {/* Secs. 53/55: missing required documents — HR waiver with reason */}
                          {docsMissing && (
                            <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                              <p className="text-sm font-semibold text-amber-800 mb-1">
                                <i className="fas fa-exclamation-triangle mr-1"></i>
                                Required documents are missing
                              </p>
                              <ul className="text-xs text-amber-800 list-disc list-inside mb-2">
                                {requiredDocs.map((doc, i) => <li key={i}>{doc}</li>)}
                              </ul>
                              <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="checkbox checkbox-sm checkbox-warning mt-0.5"
                                  checked={approvalData.documents_waived}
                                  onChange={(e) => handleApprovalChange('documents_waived', e.target.checked)}
                                />
                                <span className="text-sm">Waive the document requirement (with reason)</span>
                              </label>
                              {approvalData.documents_waived && (
                                <input
                                  type="text"
                                  className={`input input-bordered input-sm w-full mt-2 ${errors.documents_waiver_reason ? 'input-error' : ''}`}
                                  placeholder="Reason for waiver (audited)"
                                  value={approvalData.documents_waiver_reason}
                                  onChange={(e) => handleApprovalChange('documents_waiver_reason', e.target.value)}
                                />
                              )}
                              {errors.documents_waiver_reason && (
                                <div className="text-red-500 text-sm mt-1">{errors.documents_waiver_reason}</div>
                              )}
                            </div>
                          )}

                          {/* Sec. 57: LWOP limits — head-of-agency clearance beyond one month */}
                          {approvalData.approved_for === 'without_pay' && (
                            <div className="mt-3 p-3 bg-orange-50 border border-orange-300 rounded-lg">
                              <p className="text-sm text-orange-800">
                                <i className="fas fa-info-circle mr-1"></i>
                                Per CSC Sec. 57, leave without pay in excess of one (1) month requires the clearance of the head of agency, and LWOP may not exceed one (1) year.
                              </p>
                              <label className="flex items-start gap-2 mt-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="checkbox checkbox-sm checkbox-warning mt-0.5"
                                  checked={approvalData.lwop_clearance}
                                  onChange={(e) => handleApprovalChange('lwop_clearance', e.target.checked)}
                                />
                                <span className="text-sm">Head-of-agency clearance confirmed (required if cumulative LWOP exceeds 1 month)</span>
                              </label>
                              {approvalData.lwop_clearance && (
                                <input
                                  type="text"
                                  className={`input input-bordered input-sm w-full mt-2 ${errors.lwop_clearance_reason ? 'input-error' : ''}`}
                                  placeholder="Clearance reference / reason (audited)"
                                  value={approvalData.lwop_clearance_reason}
                                  onChange={(e) => handleApprovalChange('lwop_clearance_reason', e.target.value)}
                                />
                              )}
                              {errors.lwop_clearance_reason && (
                                <div className="text-red-500 text-sm mt-1">{errors.lwop_clearance_reason}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Disapproval Reason */}
                  {approvalData.approval === 'disapprove' && (
                    <div id="disapprovalReasonContainer" className="ml-6 border-l-2 border-red-200 pl-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Reason for disapproval:</span>
                        </label>
                        <textarea 
                            name="disapproved_due_to" 
                            className={`textarea textarea-bordered h-24 ${errors.disapproved_due_to ? 'textarea-error' : ''}`}
                            placeholder="Enter reason for disapproval..."
                            value={approvalData.disapproved_due_to}
                            onChange={(e) => handleApprovalChange('disapproved_due_to', e.target.value)}
                          ></textarea>
                          {errors.disapproved_due_to && (
                            <div className="text-red-500 text-sm mt-1">{errors.disapproved_due_to}</div>
                          )}
                      </div>
                    </div>
                  )}
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

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div id="step3" className="space-y-6">
                <div className="card bg-white shadow-md mb-6">
                  <div className="card-body">
                    <h2 className="card-title text-xl font-bold text-gray-800 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2l4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Leave Final Review
                    </h2>
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
                      {/* Employee Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                        <div className="avatar">
                          {leaveRequest.user_id?.profile_image ? (
                            <div className="w-14 h-14 rounded-full">
                              <img 
                                src={leaveRequest.user_id.profile_image} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                              <span className="text-white font-bold text-lg flex items-center justify-center w-full h-full leading-none">
                                {leaveRequest.user_id?.first_name ? 
                                  `${leaveRequest.user_id.first_name.charAt(0)}${leaveRequest.user_id.last_name.charAt(0)}`.toUpperCase() : 
                                  'N/A'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-center sm:text-left">
                          <h4 className="text-xl font-bold text-gray-800">
                            {leaveRequest.user_id?.first_name ? 
                              `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}` : 
                              'Unknown Employee'}
                          </h4>
                          <p className="text-gray-600">
                            {leaveRequest.user_id?.department_id?.name || 'Department not specified'} • 
                            {leaveRequest.user_id?.position || 'Position not specified'}
                          </p>
                        </div>
                      </div>
                      {/* Request Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <h5 className="font-semibold text-blue-600 mb-3">Type of Leave</h5>
                          <p className="font-medium text-gray-800 text-lg">
                            {leaveRequest.leave_type === 'vacation' ? 'Vacation Leave' : 
                             leaveRequest.leave_type === 'sick' ? 'Sick Leave' : 
                             leaveRequest.leave_type === 'mandatory_forced_leave' ? 'Mandatory/Forced Leave' :
                             leaveRequest.leave_type === 'maternity_leave' ? 'Maternity Leave' :
                             leaveRequest.leave_type === 'paternity_leave' ? 'Paternity Leave' :
                             leaveRequest.leave_type === 'special_privilege_leave' ? 'Special Privilege Leave' :
                             leaveRequest.leave_type === 'solo_parent_leave' ? 'Solo Parent Leave' :
                             leaveRequest.leave_type === 'study_leave' ? 'Study Leave' :
                             leaveRequest.leave_type === 'vawc_leave' ? 'VAWC Leave' :
                             leaveRequest.leave_type === 'rehabilitation_privilege' ? 'Rehabilitation Privilege' :
                             leaveRequest.leave_type === 'special_leave_benefits_women' ? 'Special Leave Benefits Women' :
                             leaveRequest.leave_type === 'special_emergency' ? 'Special Emergency Leave' :
                             leaveRequest.leave_type === 'adoption_leave' ? 'Adoption Leave' :
                             leaveRequest.leave_type === 'wellness_leave' ? 'Wellness Leave' :
                             leaveRequest.leave_type === 'monetization' ? 'Monetization of Leave Credits' :
                             leaveRequest.leave_type === 'terminal_leave' ? 'Terminal Leave' :
                             leaveRequest.leave_type === 'others_specify' ? 'Others (Specify)' :
                             leaveRequest.leave_type}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <h5 className="font-semibold text-blue-600 mb-3">Applied On</h5>
                          <p className="font-medium text-gray-800 text-lg">
                            {new Date(leaveRequest.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <h5 className="font-semibold text-blue-600 mb-3">Inclusive Dates</h5>
                          <p className="font-medium text-gray-800 text-lg">
                            {new Date(leaveRequest.start_date).toLocaleDateString() === new Date(leaveRequest.end_date).toLocaleDateString()
                              ? new Date(leaveRequest.start_date).toLocaleDateString()
                              : `${new Date(leaveRequest.start_date).toLocaleDateString()}-${new Date(leaveRequest.end_date).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <h5 className="font-semibold text-blue-600 mb-3">Number of Working Days</h5>
                          <p className="font-medium text-gray-800 text-lg">{leaveRequest.number_of_days} days</p>
                        </div>
                      </div>
                      {/* Additional Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <h5 className="font-semibold text-blue-600 mb-3">Where Leave Will Be Spent</h5>
                          <p className="font-medium text-gray-800">{leaveRequest.where_spent && leaveRequest.where_spent !== 'not_applicable' ? leaveRequest.where_spent : 'Not applicable'}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <h5 className="font-semibold text-blue-600 mb-3">Commutation</h5>
                          <p className="font-medium text-gray-800">
                            {leaveRequest.commutation ? 'Requested' : 'Not Requested'}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Recommendation Section */}
                    {leaveRequest.recommendations && leaveRequest.recommendations.length > 0 && (
                      <div className="p-4 bg-white rounded-lg border border-blue-200 shadow-sm mb-6">
                        <h4 className="font-semibold text-blue-600 mb-3">Department Admin Recommendation</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Authorized Personnel</label>
                            <p className="font-medium text-gray-800">
                              {leaveRequest.recommendations[0]?.department_admin_id?.first_name || ''} 
                              {leaveRequest.recommendations[0]?.department_admin_id?.last_name ? ` ${leaveRequest.recommendations[0].department_admin_id.last_name}` : ''}
                            </p>
                            <p className="text-sm text-gray-500">Department Head</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                            <p className="font-medium text-gray-800 text-capitalize">
                              {leaveRequest.recommendations[0]?.recommendation || ''}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {leaveRequest.recommendations[0]?.remarks || ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Approval Section */}
                    <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm mb-6">
                      <h4 className="font-semibold text-green-600 mb-3">HR Manager Approval</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">HR Personnel</label>
                          <p className="font-medium text-gray-800" id="hrPersonnelName">
                            {user?.first_name} {user?.last_name}
                          </p>
                          <p className="text-sm text-gray-500" id="hrPersonnelPosition">
                            HR Officer
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                          <p className="font-medium text-gray-800 text-capitalize" id="hrDecisionText">
                            {approvalData.approval}
                          </p>
                          <p className="text-sm text-gray-500 mt-1" id="hrDecisionDetails">
                            {approvalData.approval === 'approve' 
                              ? (approvalData.approved_for === 'with_pay' 
                                  ? `Approved for ${leaveRequest.number_of_days} day(s) with pay` 
                                  : approvalData.approved_for === 'without_pay'
                                  ? `Approved for ${leaveRequest.number_of_days} day(s) without pay`
                                  : approvalData.approved_for_other || 'Others (specify)')
                              : approvalData.disapproved_due_to || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Submit Button */}
                    <div className="flex justify-between mt-6">
                      <button 
                        type="button"
                        className="btn btn-outline border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                        onClick={() => prevStep(3)}
                      >
                        Previous
                      </button>
                      {leaveRequest.status === 'recommended' ? (
                        <button 
                          type="submit" 
                          className="btn bg-blue-500 hover:bg-blue-600 text-white"
                          disabled={processing}
                        >
                          {processing ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Processing...
                            </>
                          ) : (
                            'Submit'
                          )}
                        </button>
                      ) : (
                        <button type="button" className="btn" disabled>
                          {leaveRequest.status === 'cancelled' ? 'Cancelled' : 'Submit'}
                          {leaveRequest.status === 'cancelled' ? 
                            <i className="fas fa-ban ml-2"></i> : 
                            <i className="fas fa-lock ml-2"></i>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowConfirmModal(false)}></div>
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-md z-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <i className="fas fa-question-circle text-blue-600 text-2xl"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Approval</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to {approvalData.approval} this leave request? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-md"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
                  onClick={submitApproval}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-md z-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <i className="fas fa-check-circle text-green-600 text-2xl"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Approval Submitted</h3>
              <p className="text-sm text-gray-500 mb-6">
                Your approval has been submitted successfully.
              </p>
              <button
                type="button"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md"
                onClick={closeSuccessModal}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default HRLeaveRequestDetails;