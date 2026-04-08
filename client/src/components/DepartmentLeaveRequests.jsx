import React, { useState, useEffect, useRef } from 'react';
import Layout from './Layout';
import axios from '../services/api';
import { useNavigate } from 'react-router-dom';

const DepartmentLeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    leaveType: 'all',
    dateRange: 'all',
    search: ''
  });
  const navigate = useNavigate();
  const pollingInterval = useRef(null);

  // Fetch department leave requests
  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/department/leave-requests', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log('Leave requests data structure:', response.data.data);
        setLeaveRequests(response.data.data || []);
        setFilteredRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      setError('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  // Fetch department leave requests on component mount
  useEffect(() => {
    fetchLeaveRequests();
    
    // Set up polling to refresh every 30 seconds
    pollingInterval.current = setInterval(fetchLeaveRequests, 30000);
    
    // Clean up interval on component unmount
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  // Apply filters when they change or when leaveRequests change
  useEffect(() => {
    let filtered = [...leaveRequests];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(request => {
        const employeeName = `${request.user_id?.first_name || ''} ${request.user_id?.last_name || ''}`.toLowerCase();
        return employeeName.includes(searchTerm);
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

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(request => {
        const requestDate = new Date(request.createdAt);
        switch (filters.dateRange) {
          case 'today':
            return requestDate.toDateString() === now.toDateString();
          case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return requestDate >= weekStart && requestDate <= weekEnd;
          case 'month':
            return requestDate.getMonth() === now.getMonth() && requestDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    setFilteredRequests(filtered);
  }, [filters, leaveRequests]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      leaveType: 'all',
      dateRange: 'all',
      search: ''
    });
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
      case 'mandatory_forced_leave':
        return 'Mandatory/Forced Leave';
      case 'maternity_leave':
        return 'Maternity Leave';
      case 'paternity_leave':
        return 'Paternity Leave';
      case 'special_privilege_leave':
        return 'Special Privilege Leave';
      case 'solo_parent_leave':
        return 'Solo Parent Leave';
      case 'study_leave':
        return 'Study Leave';
      case 'vawc_leave':
        return 'VAWC Leave';
      case 'rehabilitation_privilege':
        return 'Rehabilitation Privilege';
      case 'special_leave_benefits_women':
        return 'Special Leave Benefits for Women';
      case 'special_emergency':
        return 'Special Emergency Leave';
      case 'adoption_leave':
        return 'Adoption Leave';
      case 'others_specify':
        return 'Others (Specify)';
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

  if (loading) {
    return (
      <Layout title="Department Leave Requests">
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Department Leave Requests">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Department Leave Requests">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">
              <i className="fas fa-history text-blue-500 mr-2"></i>
              Department Leave Requests
            </h2>
            <button 
              className="btn btn-sm btn-primary"
              onClick={fetchLeaveRequests}
              disabled={loading}
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="label">
                <span className="label-text font-medium">Search Employee</span>
              </label>
              <input
                type="text"
                name="search"
                placeholder="Search by employee name..."
                value={filters.search}
                onChange={handleFilterChange}
                className="input input-bordered w-full"
              />
            </div>
            
            <div>
              <label className="label">
                <span className="label-text font-medium">Leave Type</span>
              </label>
              <select
                name="leaveType"
                value={filters.leaveType}
                onChange={handleFilterChange}
                className="select select-bordered w-full"
              >
                <option value="all">All Types</option>
                <option value="vacation">Vacation Leave</option>
                <option value="sick">Sick Leave</option>
              </select>
            </div>
            
            <div>
              <label className="label">
                <span className="label-text font-medium">Status</span>
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="select select-bordered w-full"
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
            
            <div>
              <label className="label">
                <span className="label-text font-medium">Date Range</span>
              </label>
              <select
                name="dateRange"
                value={filters.dateRange}
                onChange={handleFilterChange}
                className="select select-bordered w-full"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
          
          {(filters.status !== 'all' || filters.leaveType !== 'all' || filters.dateRange !== 'all' || filters.search) && (
            <div className="mt-4">
              <button 
                className="btn btn-sm btn-ghost"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Leave Requests Table */}
        <div className="p-4 md:p-6">
          <div className="overflow-x-auto">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-inbox text-3xl mb-2"></i>
                <p>No leave requests found</p>
                {(filters.status !== 'all' || filters.leaveType !== 'all' || filters.dateRange !== 'all' || filters.search) && (
                  <button 
                    className="mt-2 text-blue-600 hover:text-blue-800"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applied
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request._id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {request.user_id?.first_name} {request.user_id?.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {request.user_id?.position || 'Position not specified'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="text-sm">
                          {getLeaveTypeText(request.leave_type)}
                        </div>
                        {request.without_pay && (request.leave_type === 'vacation' || request.leave_type === 'sick') && (
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
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => navigate(`/department/leave-request/${request._id}`)}
                          className="btn btn-xs btn-primary"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DepartmentLeaveRequests;