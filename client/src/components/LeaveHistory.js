import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';
import { useNavigate } from 'react-router-dom';

const LeaveHistory = () => {
  const navigate = useNavigate();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    month: 'all',
    leaveType: 'all',
    status: 'all'
  });

  // Fetch leave requests from API
  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/leave-requests', {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data.success) {
          setLeaveRequests(response.data.data);
          setFilteredRequests(response.data.data);
        } else {
          setError(response.data.message || 'Failed to fetch leave requests');
        }
      } catch (error) {
        console.error('Error fetching leave requests:', error);
        setError(error.response?.data?.message || 'Failed to fetch leave requests');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveRequests();
  }, []);

  // Apply filters when they change or when leaveRequests change
  useEffect(() => {
    let filtered = [...leaveRequests];

    // Apply month filter
    if (filters.month !== 'all') {
      filtered = filtered.filter(request => {
        const requestDate = new Date(request.start_date);
        return requestDate.getMonth() + 1 === parseInt(filters.month);
      });
    }

    // Apply leave type filter
    if (filters.leaveType !== 'all') {
      filtered = filtered.filter(request => request.leave_type === filters.leaveType);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(request => request.status === filters.status);
    }

    setFilteredRequests(filtered);
  }, [filters, leaveRequests]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
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
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewRequest = (id) => {
    navigate(`/employee/leave-request/${id}`);
  };

  const handleCancelRequest = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/leave-requests/${id}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Update the leave request status in state
        setLeaveRequests(prev => prev.map(request => 
          request._id === id ? { ...request, status: 'cancelled' } : request
        ));
      } else {
        setError(response.data.message || 'Failed to cancel leave request');
      }
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      setError(error.response?.data?.message || 'Failed to cancel leave request');
    }
  };

  return (
    <Layout>
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Leave History</h1>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Filters */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Month</label>
                  <select
                    name="month"
                    value={filters.month}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Months</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Leave Type</label>
                  <select
                    name="leaveType"
                    value={filters.leaveType}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Types</option>
                    <option value="vacation">Vacation Leave</option>
                    <option value="sick">Sick Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="recommended">Recommended</option>
                    <option value="hr_approved">HR Approved</option>
                    <option value="approved">Approved</option>
                    <option value="disapproved">Disapproved</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-center items-center h-32">
                  <span className="loading loading-spinner loading-md"></span>
                  <span className="ml-2">Loading leave requests...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* Leave Requests Table */}
          {!loading && !error && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-inbox text-3xl mb-2"></i>
                    <p>No leave requests found</p>
                    {filters.month !== 'all' || filters.leaveType !== 'all' || filters.status !== 'all' ? (
                      <button 
                        className="mt-2 text-blue-600 hover:text-blue-800"
                        onClick={() => setFilters({ month: 'all', leaveType: 'all', status: 'all' })}
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dates
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Days
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRequests.map((request) => (
                          <tr key={request._id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              <div className="text-sm">
                                {getLeaveTypeText(request.leave_type)}
                              </div>
                              {request.without_pay && (
                                <span className="mt-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                  Without Pay
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                              <div>
                                {formatDate(request.start_date)} - {formatDate(request.end_date)}
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
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => navigate(`/employee/leave-request/${request._id}`)}
                                className="btn btn-xs btn-primary"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
};

export default LeaveHistory;