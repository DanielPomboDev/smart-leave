import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './Layout';
import axios from '../services/api';
import { useNavigate } from 'react-router-dom';

const HRLeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    department: 'all',
    date_range: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  });
  
  const navigate = useNavigate();
  const pollingInterval = useRef(null);

  // Fetch leave requests and departments
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch departments
      const deptResponse = await axios.get('/api/hr/departments', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (deptResponse.data.success) {
        setDepartments(deptResponse.data.departments);
      }
      
      // Fetch leave requests
      const params = new URLSearchParams(filters).toString();
      const response = await axios.get(`/api/hr/leave-requests?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setLeaveRequests(response.data.leaveRequests);
        setPagination({
          currentPage: response.data.currentPage || 1,
          totalPages: response.data.totalPages || 1,
          hasNext: response.data.hasNext || false,
          hasPrev: response.data.hasPrev || false
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch data on component mount and set up polling
  useEffect(() => {
    fetchData();
    
    // Set up polling to refresh every 30 seconds
    pollingInterval.current = setInterval(fetchData, 30000);
    
    // Clean up interval on component unmount
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [fetchData]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
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
      <Layout title="Leave Requests">
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Leave Requests">
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
    <Layout title="Leave Requests">
      <div className="card bg-white shadow-md mb-6">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title text-xl font-bold text-gray-800">
              <i className="fas fa-list-check text-blue-500 mr-2"></i>
              Manage Leave Requests
            </h2>
            <button 
              className="btn btn-sm btn-primary"
              onClick={fetchData}
              disabled={loading}
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh
            </button>
          </div>
          
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-gray-700">Status</span>
              </label>
              <select 
                className="select select-bordered border-gray-300 focus:border-blue-500 w-full"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="recommended">Recommended</option>
                <option value="hr_approved">HR Approved</option>
                <option value="approved">Approved</option>
                <option value="disapproved">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-gray-700">Department</span>
              </label>
              <select 
                className="select select-bordered border-gray-300 focus:border-blue-500 w-full"
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-gray-700">Date Range</span>
              </label>
              <select 
                className="select select-bordered border-gray-300 focus:border-blue-500 w-full"
                value={filters.date_range}
                onChange={(e) => handleFilterChange('date_range', e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-gray-700">Search</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search employee name" 
                  className="input input-bordered border-gray-300 focus:border-blue-500 w-full pr-10"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2">
                  <i className="fas fa-search text-gray-400"></i>
                </button>
              </div>
            </div>
          </div>
          
          {/* Leave Requests Table */}
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-gray-600 px-4 py-3">Employee</th>
                  <th className="text-gray-600 px-4 py-3">Type</th>
                  <th className="text-gray-600 px-4 py-3">Applied</th>
                  <th className="text-gray-600 px-4 py-3">Period</th>
                  <th className="text-gray-600 px-4 py-3">Days</th>
                  <th className="text-gray-600 px-4 py-3">Status</th>
                  <th className="text-gray-600 px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length > 0 ? (
                  leaveRequests.map(leaveRequest => (
                    <tr key={leaveRequest._id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="avatar">
                            <div className="mask mask-squircle w-8 h-8">
                              <span className="bg-blue-500 text-white text-xs font-bold flex items-center justify-center w-full h-full">
                                {leaveRequest.user_id?.first_name ? 
                                  `${leaveRequest.user_id.first_name.charAt(0)}${leaveRequest.user_id.last_name.charAt(0)}`.toUpperCase() : 
                                  'N/A'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="font-bold">
                              {leaveRequest.user_id?.first_name ? 
                                `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}` : 
                                'Unknown Employee'}
                            </div>
                            <div className="text-xs opacity-70">
                              {leaveRequest.user_id?.position || 'Position not specified'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {leaveRequest.leave_type === 'vacation' ? 'Vacation' : 'Sick'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(leaveRequest.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-xs">
                          {new Date(leaveRequest.start_date).toLocaleDateString()} - {new Date(leaveRequest.end_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {leaveRequest.number_of_days}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(leaveRequest.status)}`}>
                          {getStatusText(leaveRequest.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button 
                          className="btn btn-xs btn-primary"
                          onClick={() => navigate(`/hr/leave-request/${leaveRequest._id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">
                      No leave requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HRLeaveRequests;