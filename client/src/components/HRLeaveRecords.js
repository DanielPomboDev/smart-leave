import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';
import CalculateCreditsModal from './CalculateCreditsModal';

const HRLeaveRecords = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    department: 'all',
    user_type: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('/api/hr/departments', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setDepartments(response.data.departments || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // Fetch leave records
  const fetchLeaveRecords = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = {
        page,
        limit: pagination.limit,
        department: filters.department !== 'all' ? filters.department : undefined,
        user_type: filters.user_type !== 'all' ? filters.user_type : undefined,
        search: filters.search || undefined
      };

      const response = await axios.get('/api/leave-records', {
        headers: {
          'Content-Type': 'application/json'
        },
        params
      });

      if (response.data.users) {
        setUsers(response.data.users);
        setPagination({
          ...pagination,
          page: parseInt(response.data.currentPage),
          totalPages: parseInt(response.data.totalPages),
          total: parseInt(response.data.total)
        });
      } else {
        setError(response.data.message || 'Failed to fetch leave records');
      }
    } catch (error) {
      console.error('Error fetching leave records:', error);
      setError('Failed to fetch leave records: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters({
      ...filters,
      [filterName]: value
    });
  };

  // View record
  const viewRecord = (userId) => {
    window.location.href = `/hr/leave-record/${userId}`;
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchLeaveRecords(newPage);
    }
  };

  // Apply filters
  const applyFilters = () => {
    fetchLeaveRecords(1);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      department: 'all',
      user_type: 'all',
      search: ''
    });
  };

  // Calculate credits
    const calculateCredits = async (month, year) => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await axios.post('/api/leave-records/calculate-credits', 
                { month, year },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                setSuccess(response.data.message);
            } else {
                setError(response.data.message || 'Failed to calculate credits');
            }
        } catch (error) {
            console.error('Error calculating credits:', error);
            setError('Failed to calculate credits: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
            setIsModalOpen(false);
        }
    };

  // Effect to fetch departments and leave records on initial load
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Effect to fetch leave records when filters or pagination changes
  useEffect(() => {
    fetchLeaveRecords(pagination.page);
  }, [filters, pagination.page]);

  return (
    <Layout title="Leave Records" header="Leave Records">
      <div className="card bg-white shadow-md mb-6">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title text-xl font-bold text-gray-800">
              <i className="fi fi-rr-time-past text-blue-500 mr-2"></i>
              Leave Records
            </h2>
            <button className="btn btn-primary btn-sm md:btn-md" onClick={() => setIsModalOpen(true)}>
              <i className="fas fa-calculator mr-1"></i>
              Calculate Credits
            </button>
          </div>

            {success && (
                <div className="alert alert-success mb-4">
                    <i className="fas fa-check-circle"></i>
                    <span>{success}</span>
                </div>
            )}
          
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Department Filter */}
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
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* User Type Filter */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-gray-700">User Type</span>
              </label>
              <select 
                className="select select-bordered border-gray-300 focus:border-blue-500 w-full"
                value={filters.user_type}
                onChange={(e) => handleFilterChange('user_type', e.target.value)}
              >
                <option value="all">All User Types</option>
                <option value="employee">Employee</option>
                <option value="hr">HR</option>
                <option value="department_admin">Department Admin</option>
                <option value="mayor">Mayor</option>
              </select>
            </div>
            
            {/* Search Employee */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-gray-700">Search</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={filters.search}
                  placeholder="Search employee name" 
                  className="input input-bordered border-gray-300 focus:border-blue-500 w-full pr-10"
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                />
                <button 
                  type="button" 
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={applyFilters}
                >
                  <i className="fi fi-rr-search text-gray-400"></i>
                </button>
              </div>
            </div>
            
            {/* Reset Filters Button */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-gray-700 invisible">Reset</span>
              </label>
              <button 
                className="btn btn-outline"
                onClick={resetFilters}
              >
                Reset Filters
              </button>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="alert alert-error mb-4">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}
          
          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="loading loading-spinner loading-lg"></div>
            </div>
          )}
          
          {/* Leave Records Table */}
          {!loading && (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-gray-600">Employee</th>
                    <th className="text-gray-600">Position</th>
                    <th className="text-gray-600">Department</th>
                    <th className="text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user._id}>
                        <td className="flex items-center space-x-3">
                          <div className="avatar">
                            <div className="mask mask-squircle w-8 h-8">
                              <span className="bg-blue-500 text-white text-xs font-bold flex items-center justify-center w-full h-full">
                                {user.first_name?.charAt(0)?.toUpperCase()}{user.last_name?.charAt(0)?.toUpperCase() || 'N/A'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="font-bold">{user.first_name || 'No First Name'} {user.last_name || 'No Last Name'}</div>
                            <div className="text-xs text-gray-500">{user.user_id || 'No ID'}</div>
                          </div>
                        </td>
                        <td>{user.position || 'No Position'}</td>
                        <td>{user.department_id?.name || 'No Department'}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={() => viewRecord(user.user_id)}
                          >
                            View Record
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-4">
                        No leave records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {!loading && users.length > 0 && (
            <div className="flex justify-end mt-6">
              <div className="btn-group">
                <button 
                  className={`btn btn-sm ${pagination.page === 1 ? 'btn-disabled' : ''}`}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  «
                </button>
                
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    className={`btn btn-sm ${pagination.page === pageNum ? 'btn-active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                
                <button 
                  className={`btn btn-sm ${pagination.page === pagination.totalPages ? 'btn-disabled' : ''}`}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <CalculateCreditsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConfirm={calculateCredits} 
      />
    </Layout>
  );
};

export default HRLeaveRecords;