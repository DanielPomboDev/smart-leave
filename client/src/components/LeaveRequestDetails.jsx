import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from './Layout';
import axios from '../services/api';

const LeaveRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [leaveRequest, setLeaveRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [documentsError, setDocumentsError] = useState('');
  const [documentsSuccess, setDocumentsSuccess] = useState('');

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Upload supporting documents (owner or HR only)
  const handleDocumentSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file
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

  // Delete a supporting document (owner or HR only)
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

  // Determine user role from the current route
  useEffect(() => {
    const determineUserRole = () => {
      if (location.pathname.startsWith('/department_admin')) {
        setUserRole('department_admin');
      } else if (location.pathname.startsWith('/hr')) {
        setUserRole('hr');
      } else if (location.pathname.startsWith('/mayor')) {
        setUserRole('mayor');
      } else {
        setUserRole('employee'); // default
      }
    };

    determineUserRole();
  }, [location.pathname]);

  // Fetch leave request details
  useEffect(() => {
    const fetchLeaveRequest = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/leave-requests/${id}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data.success) {
          setLeaveRequest(response.data.data);
        } else {
          setError(response.data.message || 'Failed to fetch leave request details');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch leave request details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchLeaveRequest();
    }
  }, [id]);

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

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'disapproved':
        return 'Denied';
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

  const getLeaveTypeText = (type) => {
    switch (type) {
      case 'vacation':
        return 'Vacation Leave';
      case 'sick':
        return 'Sick Leave';
      case 'monetization':
        return 'Monetization of Leave Credits';
      case 'terminal_leave':
        return 'Terminal Leave';
      default:
        return type;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isCancellable = (status) => {
    return ['pending', 'recommended', 'hr_approved', 'approved'].includes(status);
  };

  const handleCancelRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/leave-requests/${id}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Update the leave request status in state
        setLeaveRequest(prev => ({ ...prev, status: 'cancelled' }));
        setShowCancelModal(false);
      } else {
        setError(response.data.message || 'Failed to cancel leave request');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel leave request');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      </Layout>
    );
  }

  if (!leaveRequest) {
    return (
      <Layout>
        <div className="text-center py-8">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Leave Request Not Found</h2>
          <p className="text-gray-600 mb-4">The requested leave request could not be found.</p>
          <button 
            onClick={() => {
              const basePath = `/${userRole}/dashboard`;
              navigate(basePath);
            }}
            className="btn btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  // Get employee info from the populated user data
  const employeeName = leaveRequest.user_id?.full_name || 'Unknown Employee';
  const employeeDepartment = leaveRequest.user_id?.department_id?.name || 'Unknown Department';
  const employeePosition = leaveRequest.user_id?.position || 'Unknown Position';
  
  // Get employee initials (first letter of first name and last name)
  let employeeInitials = 'UE';
  if (leaveRequest.user_id) {
    const firstName = leaveRequest.user_id.first_name || '';
    const lastName = leaveRequest.user_id.last_name || '';
    employeeInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  return (
    <Layout>
      <div className="card bg-white shadow-md mb-6">
        <div className="card-body">
          <h2 className="card-title text-xl font-bold text-gray-800 mb-4">
            <i className="fas fa-eye text-blue-500 mr-2"></i>
            Leave Request Details
          </h2>

          {/* Leave Request Details */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
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
                      {employeeInitials}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-800">{employeeName}</h4>
                <p className="text-gray-600">{employeeDepartment} • {employeePosition}</p>
              </div>
            </div>

            {/* Request Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h5 className="font-semibold text-blue-600 mb-3">Type of Leave</h5>
                <p className="font-medium text-gray-800 text-lg">
                  {getLeaveTypeText(leaveRequest.leave_type)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h5 className="font-semibold text-blue-600 mb-3">Applied On</h5>
                <p className="font-medium text-gray-800 text-lg">
                  {formatDate(leaveRequest.createdAt)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h5 className="font-semibold text-blue-600 mb-3">Inclusive Dates</h5>
                <p className="font-medium text-gray-800 text-lg">
                  {formatDate(leaveRequest.start_date)} - {formatDate(leaveRequest.end_date)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h5 className="font-semibold text-blue-600 mb-3">Number of Working Days</h5>
                <p className="font-medium text-gray-800 text-lg">
                  {leaveRequest.number_of_days} day(s)
                </p>
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h5 className="font-semibold text-blue-600 mb-3">Where Leave Will Be Spent</h5>
                <p className="font-medium text-gray-800">
                  {leaveRequest.where_spent}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h5 className="font-semibold text-blue-600 mb-3">Commutation</h5>
                <p className="font-medium text-gray-800">
                  {leaveRequest.commutation ? 'Requested' : 'Not Requested'}
                </p>
              </div>
              {leaveRequest.without_pay && (leaveRequest.leave_type === 'vacation' || leaveRequest.leave_type === 'sick') && (
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm md:col-span-2">
                  <h5 className="font-semibold text-red-600 mb-3">Leave Without Pay</h5>
                  <p className="font-medium text-gray-800">
                    This leave request will be considered without pay as it exceeds your available leave credits.
                  </p>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="mb-6">
              <h5 className="font-semibold text-blue-600 mb-3">Status</h5>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusClass(leaveRequest.status)}`}>
                {getStatusText(leaveRequest.status)}
              </span>
            </div>

            {/* Cancel Button */}
            {isCancellable(leaveRequest.status) && (
              <div className="flex justify-end">
                <button 
                  onClick={() => setShowCancelModal(true)}
                  className="btn btn-error"
                >
                  Cancel Leave Request
                </button>
              </div>
            )}
          </div>

          {/* Supporting Documents */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-semibold text-blue-600">
                <i className="fas fa-paperclip mr-2"></i>
                Supporting Documents
              </h5>
              <span className="text-xs text-gray-500">{(leaveRequest.documents || []).length} attached</span>
            </div>

            {documentsError && (
              <div className="alert alert-error shadow-lg mb-4">
                <div>
                  <i className="fas fa-exclamation-circle text-error"></i>
                  <span>{documentsError}</span>
                </div>
              </div>
            )}
            {documentsSuccess && (
              <div className="alert alert-success shadow-lg mb-4">
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
                  <li key={doc._id || doc.url} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
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
                          {doc.uploaded_at ? `Uploaded ${formatDate(doc.uploaded_at)}` : ''}{doc.size ? ` • ${formatFileSize(doc.size)}` : ''}
                        </p>
                      </div>
                    </a>
                    {userRole === 'employee' && (
                      <button
                        onClick={() => handleDeleteDocument(doc._id)}
                        className="btn btn-ghost btn-xs text-red-500 ml-2"
                        title="Delete document"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {userRole === 'employee' && (
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
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowCancelModal(false)}
          ></div>
          
          {/* Modal */}
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-md z-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <i className="fas fa-exclamation text-red-600 text-2xl"></i>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Cancellation</h3>
              
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to cancel this leave request? This action cannot be undone.
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-md"
                  onClick={() => setShowCancelModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md"
                  onClick={handleCancelRequest}
                >
                  Yes, Cancel Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LeaveRequestDetails;