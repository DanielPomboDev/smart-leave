import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { useNavigate, useParams } from 'react-router-dom';
import { getLeaveRequestDetails, processLeaveRequest } from '../services/mayorService';

const MayorLeaveRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leaveRequest, setLeaveRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decision, setDecision] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Debug: Log the ID parameter
  useEffect(() => {

    if (!id) {
      console.error('No ID provided in URL params');
      setError('Invalid leave request ID');
    }
  }, [id]);

  useEffect(() => {
    const fetchLeaveRequest = async () => {
      try {
        const requestData = await getLeaveRequestDetails(id);
        setLeaveRequest(requestData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching leave request:', error);
        setError('Failed to load leave request details');
        setLoading(false);
      }
    };

    fetchLeaveRequest();
  }, [id]);

  const handleDecisionSubmit = async (decisionValue) => {
    setDecision(decisionValue);
    setShowConfirmModal(true);
  };

  const submitDecision = async () => {
    setShowConfirmModal(false);
    setProcessing(true);
    
    // Debug: Log the ID and decision before processing

    
    // Check if ID is valid before processing
    if (!id) {
      console.error('Cannot process leave request: ID is missing or undefined');
      setError('Invalid leave request ID. Please try again.');
      setProcessing(false);
      return;
    }
    
    try {
      const response = await processLeaveRequest(id, decision);
      
      // Refresh the leave request data to show updated status
      const updatedData = await getLeaveRequestDetails(id);
      setLeaveRequest(updatedData);
      
      // Check the response to see if there might be a partial success
      if (response && response.message) {

      }
      
      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error processing decision:', error);
      // Extract error message from response if available
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process decision. Please try again.';
      setError(errorMessage);
      
      // Check if the error might be non-critical by refreshing data and showing a warning
      try {
        // Even if the API call failed, refresh data to see if the status was still updated
        const updatedData = await getLeaveRequestDetails(id);
        setLeaveRequest(updatedData);
        
        // If the status is approved despite the error, inform the user accordingly
        if (updatedData.status === 'approved') {
          alert(`Decision was recorded successfully, but there was a notification issue. Status is now approved.`);
          setShowSuccessModal(true);
        } else if (updatedData.status === 'disapproved') {
          alert(`Decision was recorded successfully, but there was a notification issue. Status is now rejected.`);
          setShowSuccessModal(true);
        } else {
          alert(`Error processing decision: ${errorMessage}`);
        }
      } catch (refreshError) {
        console.error('Error refreshing data after failed decision processing:', refreshError);
        alert(`Error processing decision: ${errorMessage}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    // Navigate back to mayor dashboard after a short delay
    setTimeout(() => {
      navigate('/mayor/leave-requests');
    }, 1000);
  };

  const getStatusTitle = (status) => {
    switch (status) {
      case 'hr_approved':
        return 'Leave Final Approval';
      case 'approved':
        return 'Leave Request Approved';
      case 'disapproved':
        return 'Leave Request Rejected';
      default:
        return 'Leave Request Details';
    }
  };

  if (loading) {
    return (
      <Layout title="Leave Request Details">
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Leave Request Details">
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
      <Layout title="Leave Request Details">
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Leave request not found.</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={getStatusTitle(leaveRequest.status)}>
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            <i className={`fas ${leaveRequest.status === 'hr_approved' ? 'fa-check-circle text-green-500' : leaveRequest.status === 'approved' ? 'fa-check-circle text-green-500' : leaveRequest.status === 'disapproved' ? 'fa-times-circle text-red-500' : 'fa-info-circle text-blue-500'} mr-2`}></i>
            {getStatusTitle(leaveRequest.status)}
          </h2>
        </div>

        {/* Sec. 49: approval SLA — deemed approved after five (5) working days */}
        {leaveRequest.status === 'hr_approved' && (
          <div className="px-6 py-3 border-b border-gray-200 bg-amber-50">
            <p className="text-sm text-amber-800">
              <i className="fas fa-hourglass-half mr-2"></i>
              <strong>SLA:</strong> {Math.max(0, Math.ceil((new Date() - new Date(leaveRequest.createdAt)) / 86400000))} day(s) since this request was received. Per CSC Sec. 49, an application not acted on within five (5) working days is deemed approved.
            </p>
          </div>
        )}
        
        <div className="p-6">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            {/* Leave Request Details */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
              {/* Employee Info */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                <div className="avatar placeholder">
                  {leaveRequest.user_id?.profile_image ? (
                    <div className="bg-neutral text-neutral-content rounded-full w-16">
                      <img 
                        src={leaveRequest.user_id.profile_image} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  ) : (
                    <div className="bg-neutral text-neutral-content rounded-full w-16">
                      <span className="text-xl">
                        {leaveRequest.user_id?.first_name?.charAt(0)}{leaveRequest.user_id?.last_name?.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-left">
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
                    {new Date(leaveRequest.start_date).toLocaleDateString()} - {new Date(leaveRequest.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h5 className="font-semibold text-blue-600 mb-3">Number of Working Days</h5>
                  <p className="font-medium text-gray-800 text-lg">
                    {leaveRequest.number_of_days === 0.5 ? '½ day' : `${leaveRequest.number_of_days} days`}
                  </p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h5 className="font-semibold text-blue-600 mb-3">Where Leave Will Be Spent</h5>
                  <p className="font-medium text-gray-800">
                    {leaveRequest.where_spent && leaveRequest.where_spent !== 'not_applicable' ? leaveRequest.where_spent : 'Not applicable'}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h5 className="font-semibold text-blue-600 mb-3">Commutation</h5>
                  <p className="font-medium text-gray-800">
                    {leaveRequest.commutation ? 'Requested' : 'Not Requested'}
                  </p>
                </div>
              </div>

              {/* Supporting Documents */}
              <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-blue-600">
                    <i className="fas fa-paperclip mr-2"></i>
                    Supporting Documents
                  </h5>
                  <span className="text-xs text-gray-500">{(leaveRequest.documents || []).length} attached</span>
                </div>
                {(!leaveRequest.documents || leaveRequest.documents.length === 0) ? (
                  <p className="text-sm text-gray-500">No supporting documents attached to this leave request.</p>
                ) : (
                  <ul className="space-y-2">
                    {leaveRequest.documents.map(doc => (
                      <li key={doc._id || doc.url} className="flex items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center min-w-0 group"
                        >
                          <i className={`fas ${doc.mimetype?.startsWith('image/') ? 'fa-file-image' : doc.mimetype === 'application/pdf' ? 'fa-file-pdf' : doc.mimetype?.includes('word') ? 'fa-file-word' : doc.mimetype?.includes('sheet') || doc.mimetype?.includes('excel') ? 'fa-file-excel' : 'fa-file-alt'} ${doc.mimetype?.startsWith('image/') ? 'text-purple-500' : doc.mimetype === 'application/pdf' ? 'text-red-500' : doc.mimetype?.includes('word') ? 'text-blue-500' : doc.mimetype?.includes('sheet') || doc.mimetype?.includes('excel') ? 'text-green-500' : 'text-gray-500'} mr-3 text-lg`}></i>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-blue-600 group-hover:underline truncate">{doc.name}</p>
                            <p className="text-xs text-gray-500">
                              {doc.uploaded_at ? `Uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}` : ''}
                            </p>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Department Recommendation (first recommendation shown if exists) */}
            {leaveRequest.recommendations && leaveRequest.recommendations.length > 0 && (
              <div className="p-4 bg-white rounded-lg border border-blue-200 shadow-sm mb-6">
                <h4 className="font-semibold text-blue-600 mb-3">Department Admin Recommendation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Authorized Personnel</label>
                    <p className="font-medium text-gray-800">
                      {leaveRequest.recommendations[0]?.department_admin_id?.first_name} {leaveRequest.recommendations[0]?.department_admin_id?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">Department Head</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                    <p className="font-medium text-gray-800 text-capitalize">
                      {leaveRequest.recommendations[0].recommendation}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {leaveRequest.recommendations[0].remarks}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* HR Approval Details (latest HR approval) */}
            {leaveRequest.approvals && leaveRequest.approvals.length > 0 && (
              <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm mb-6">
                <h4 className="font-semibold text-green-600 mb-3">HR Manager Approval</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HR Personnel</label>
                    <p className="font-medium text-gray-800">
                      {leaveRequest.approvals[0]?.hr_manager_id?.first_name} {leaveRequest.approvals[0]?.hr_manager_id?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">HR Manager</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                    <p className="font-medium text-gray-800 text-capitalize">
                      {leaveRequest.approvals[0].approval}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {leaveRequest.approvals[0].approval === 'approve' ? (
                        leaveRequest.approvals[0].approved_for === 'with_pay' ? (
                          'Approved for days with pay'
                        ) : leaveRequest.approvals[0].approved_for === 'without_pay' ? (
                          'Approved for days without pay'
                        ) : (
                          leaveRequest.approvals[0].approved_for
                        )
                      ) : (
                        leaveRequest.approvals[0].disapproved_due_to
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Final Approval Action */}
            {leaveRequest.status === 'hr_approved' ? (
              <div className="mt-6">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => handleDecisionSubmit('disapprove')}
                    disabled={processing}
                    className={`btn btn-error ${processing && decision === 'disapprove' ? 'loading' : ''}`}
                  >
                    {processing && decision === 'disapprove' ? 'Rejecting...' : 'Reject'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleDecisionSubmit('approve')}
                    disabled={processing}
                    className={`btn btn-success ${processing && decision === 'approve' ? 'loading' : ''}`}
                  >
                    {processing && decision === 'approve' ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              </div>
            ) : leaveRequest.status === 'cancelled' ? (
              <div className="alert alert-warning">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="font-bold">Leave Request Cancelled</h3>
                  <p className="text-sm">This leave request has been cancelled by the employee and cannot be processed further.</p>
                </div>
              </div>
            ) : leaveRequest.status === 'approved' ? (
              <div className="alert alert-success">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-bold">Leave Request Approved</h3>
                  <p className="text-sm">This leave request has been approved by the Mayor.</p>
                </div>
              </div>
            ) : leaveRequest.status === 'disapproved' ? (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-bold">Leave Request Rejected</h3>
                  <p className="text-sm">This leave request has been rejected by the Mayor.</p>
                </div>
              </div>
            ) : null}
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Decision</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to {decision} this leave request? This action cannot be undone.
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
                  className={`px-4 py-2 text-white text-sm font-medium rounded-md ${
                    decision === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  onClick={submitDecision}
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">Decision Submitted</h3>
              <p className="text-sm text-gray-500 mb-6">
                Your decision has been submitted successfully.
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

export default MayorLeaveRequestDetails;