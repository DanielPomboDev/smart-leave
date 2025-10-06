import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';

const DepartmentLeaveRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leaveRequest, setLeaveRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendation, setRecommendation] = useState('approve');
  const [approvalReason, setApprovalReason] = useState('');
  const [disapprovalReason, setDisapprovalReason] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch leave request details
  useEffect(() => {
    const fetchLeaveRequest = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Fetching leave request with ID:', id);
        const response = await axios.get(`/api/department/leave-requests/${id}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('Leave request response:', response);

        if (response.data.success) {
          console.log('Leave request data:', response.data.data);
          setLeaveRequest(response.data.data);
        } else {
          setError(response.data.message || 'Failed to load leave request details');
        }
      } catch (error) {
        console.error('Error fetching leave request:', error);
        console.error('Error response:', error.response);
        setError('Failed to load leave request details');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveRequest();
  }, [id]);

  const nextStep = (step) => {
    if (step === 2) {
      // Validate step 2 before proceeding
      if (recommendation === 'disapprove' && !disapprovalReason.trim()) {
        setError('Please provide a reason for disapproval');
        return;
      }
      setError('');
    }
    setCurrentStep(step + 1);
  };

  const prevStep = (step) => {
    setCurrentStep(step - 1);
    setError('');
  };

  const toggleReasonInput = (value) => {
    setRecommendation(value);
  };

  const handleRecommendationSubmit = () => {
    // Validate before showing confirmation
    if (recommendation === 'disapprove' && !disapprovalReason.trim()) {
      setError('Please provide a reason for disapproval');
      return;
    }
    setError('');
    setShowConfirmModal(true);
  };

  const submitRecommendation = async () => {
    setShowConfirmModal(false);
    setProcessing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `/api/department/leave-requests/${id}/recommend`,
        {
          recommendation,
          approval_reason: approvalReason,
          disapproval_reason: disapprovalReason
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setShowSuccessModal(true);
        // Reload the leave request to show updated status
        const updatedResponse = await axios.get(`/api/department/leave-requests/${id}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (updatedResponse.data.success) {
          setLeaveRequest(updatedResponse.data.data);
        }
      } else {
        setError(response.data.message || 'Failed to process recommendation');
      }
    } catch (error) {
      console.error('Error processing recommendation:', error);
      setError(error.response?.data?.message || 'Failed to process recommendation');
    } finally {
      setProcessing(false);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    // Navigate back to department dashboard after a short delay
    setTimeout(() => {
      navigate('/department/dashboard');
    }, 1000);
  };

  if (loading) {
    return (
      <Layout title="Department Leave Recommendation">
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (error && !leaveRequest) {
    return (
      <Layout title="Department Leave Recommendation">
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
      <Layout title="Department Leave Recommendation">
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Leave request not found</span>
        </div>
      </Layout>
    );
  }

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

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'disapproved':
        return 'bg-red-100 text-red-800';
      case 'recommended':
        return 'bg-blue-100 text-blue-800';
      case 'hr_approved':
        return 'bg-indigo-100 text-indigo-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isProcessed = leaveRequest.status !== 'pending';

  return (
    <Layout title="Department Leave Recommendation">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          {error && (
            <div className="alert alert-error mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-800 mb-4">
            <i className="fas fa-check-circle text-green-500 mr-2"></i>
            Department Leave Recommendation Process
          </h2>

          {/* Step Indicator */}
          <div className="w-full py-4">
            <ul className="steps steps-horizontal w-full">
              <li className={`step ${currentStep >= 1 ? 'step-primary' : ''}`} id="step1Indicator">Review Request</li>
              <li className={`step ${currentStep >= 2 ? 'step-primary' : ''}`} id="step2Indicator">Recommendation Decision</li>
              <li className={`step ${currentStep >= 3 ? 'step-primary' : ''}`} id="step3Indicator">Confirmation</li>
            </ul>
          </div>

          {/* Step 1: Review Request */}
          <div id="step1" className={`space-y-6 ${currentStep !== 1 ? 'hidden' : ''}`}>
            <h3 className="font-medium text-lg text-gray-800">Review Leave Request</h3>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
              {/* Employee Info */}
              <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
                <div className="avatar mr-4">
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
                      <span className="text-white font-bold text-lg flex items-center justify-center w-full h-full">
                        {leaveRequest.user_id?.first_name?.charAt(0)}{leaveRequest.user_id?.last_name?.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">
                    {leaveRequest.user_id?.first_name} {leaveRequest.user_id?.last_name}
                  </h4>
                  <p className="text-gray-600">
                    {leaveRequest.user_id?.department_id?.name} • {leaveRequest.user_id?.position}
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
                    {new Date(leaveRequest.start_date).toLocaleDateString()} - {new Date(leaveRequest.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h5 className="font-semibold text-blue-600 mb-3">Number of Days</h5>
                  <p className="font-medium text-gray-800 text-lg">{leaveRequest.number_of_days} days</p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h5 className="font-semibold text-blue-600 mb-3">Where Leave Will Be Spent</h5>
                  <p className="font-medium text-gray-800">{leaveRequest.where_spent}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h5 className="font-semibold text-blue-600 mb-3">Commutation</h5>
                  <p className="font-medium text-gray-800">
                    {leaveRequest.commutation ? 'Requested' : 'Not Requested'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              {isProcessed ? (
                <button type="button" className="btn" disabled>
                  Next
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => nextStep(1)}
                >
                  Next
                </button>
              )}
            </div>
          </div>

          {/* Step 2: Recommendation */}
          <div id="step2" className={`space-y-6 ${currentStep !== 2 ? 'hidden' : ''}`}>
            <h3 className="font-medium text-lg text-gray-800">Department Recommendation</h3>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h4 className="font-medium mb-4">Recommendation/Approval</h4>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-medium">Decision</span>
                </label>
                <div className="flex flex-col space-y-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="recommendation" 
                      value="approve"
                      className="radio radio-success" 
                      checked={recommendation === 'approve'}
                      onChange={(e) => toggleReasonInput(e.target.value)}
                      disabled={isProcessed}
                    />
                    <span>Approve</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="recommendation" 
                      value="disapprove"
                      className="radio radio-error" 
                      checked={recommendation === 'disapprove'}
                      onChange={(e) => toggleReasonInput(e.target.value)}
                      disabled={isProcessed}
                    />
                    <span>Disapprove</span>
                  </label>
                </div>
              </div>

              <div id="approvalReasonContainer" className={`form-control mb-4 ${recommendation !== 'approve' ? 'hidden' : ''}`}>
                <label className="label">
                  <span className="label-text font-medium">Reason for Approval (Optional)</span>
                </label>
                <textarea 
                  name="approval_reason" 
                  className="textarea textarea-bordered h-24"
                  placeholder="Enter reason for approval (optional)"
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  disabled={isProcessed}
                ></textarea>
              </div>

              <div id="disapprovalReasonContainer" className={`form-control mb-4 ${recommendation !== 'disapprove' ? 'hidden' : ''}`}>
                <label className="label">
                  <span className="label-text font-medium">Reason for Disapproval <span className="text-red-500">*</span></span>
                </label>
                <textarea 
                  name="disapproval_reason" 
                  className="textarea textarea-bordered h-24"
                  placeholder="Enter reason for disapproval"
                  value={disapprovalReason}
                  onChange={(e) => setDisapprovalReason(e.target.value)}
                  disabled={isProcessed}
                ></textarea>
                <label className="label">
                  <span className="label-text-alt text-red-500">Required if disapproving the leave request</span>
                </label>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button 
                type="button"
                className="btn btn-outline border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                onClick={() => prevStep(2)}
              >
                Previous
              </button>
              {isProcessed ? (
                <button type="button" className="btn" disabled>
                  Next
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => nextStep(2)}
                >
                  Next
                </button>
              )}
            </div>
          </div>

          {/* Step 3: Confirmation */}
          <div id="step3" className={`space-y-6 ${currentStep !== 3 ? 'hidden' : ''}`}>
            <h3 className="font-medium text-lg text-gray-800">Confirm Your Recommendation</h3>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="alert alert-info mb-4">
                <i className="fas fa-info-circle mr-2"></i>
                <span>Please review your recommendation before submitting. This will be forwarded to HR for final approval.</span>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="font-bold text-gray-700">Your Recommendation</h5>
                  <p className="text-gray-800 font-medium">
                    {recommendation === 'approve' ? 'Approve' : 'Disapprove'}
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-700">Reason</h5>
                  <p className="text-gray-800">
                    {recommendation === 'approve' 
                      ? (approvalReason || 'No reason provided')
                      : disapprovalReason}
                  </p>
                </div>
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
              {isProcessed ? (
                <button type="button" className="btn" disabled>
                  <i className="fas fa-lock mr-2"></i>
                  Submit Recommendation
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn bg-green-500 hover:bg-green-600 text-white"
                  onClick={handleRecommendationSubmit}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Processing...
                    </>
                  ) : (
                    'Submit Recommendation'
                  )}
                </button>
              )}
            </div>
          </div>
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Recommendation</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to {recommendation} this leave request? This action will be forwarded to HR for final approval.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-md"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
                  onClick={submitRecommendation}
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">Recommendation Submitted</h3>
              <p className="text-sm text-gray-500 mb-6">
                Your recommendation has been submitted successfully and forwarded to HR for final approval.
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

export default DepartmentLeaveRequestDetails;