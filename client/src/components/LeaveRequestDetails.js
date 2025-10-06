import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from './Layout';
import axios from '../services/api';

const LeaveRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leaveRequest, setLeaveRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

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
    return ['pending', 'recommended', 'hr_approved'].includes(status);
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
            onClick={() => navigate('/employee/dashboard')}
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