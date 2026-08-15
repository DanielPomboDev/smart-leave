import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';

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
  const [forcedLeave, setForcedLeave] = useState([]);
  const [forcedYear, setForcedYear] = useState(new Date().getFullYear());
  const [showForcedLeave, setShowForcedLeave] = useState(false);
  const [wellness, setWellness] = useState([]);
  const [wellnessYear, setWellnessYear] = useState(new Date().getFullYear());
  const [showWellness, setShowWellness] = useState(false);
  const [runningAccrual, setRunningAccrual] = useState(false);

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

  // Wellness leave usage tracker (CSC MC No. 1, s. 2026)
  const fetchWellness = async (year) => {
    try {
      const response = await axios.get('/api/leave-records/wellness-status', { params: { year } });
      if (response.data.success) setWellness(response.data.employees || []);
    } catch (err) {
      console.error('Error fetching wellness leave status:', err);
    }
  };

  // Mandatory/forced leave tracker (Sec. 25)
  const fetchForcedLeave = async (year) => {
    try {
      const response = await axios.get('/api/leave-records/forced-leave-status', { params: { year } });
      if (response.data.success) setForcedLeave(response.data.employees || []);
    } catch (err) {
      console.error('Error fetching forced leave status:', err);
    }
  };

  // Manual trigger of the up-to-now automatic accrual (fallback)
  const runAccrualNow = async () => {
    try {
      setRunningAccrual(true);
      setError('');
      setSuccess('');
      const response = await axios.post('/api/leave-records/accrue');
      if (response.data.success) setSuccess(response.data.message);
      else setError(response.data.message || 'Failed to run automatic accrual');
    } catch (err) {
      setError('Failed to run automatic accrual: ' + (err.response?.data?.message || err.message));
    } finally {
      setRunningAccrual(false);
    }
  };

  // Effect to fetch departments and leave records on initial load
  useEffect(() => {
    fetchDepartments();

    // Listen for department changes
    const handleDeptChange = () => fetchDepartments();
    const handleStorageChange = (e) => {
      if (e.key === 'departments_updated') handleDeptChange();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('departments_updated', handleDeptChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('departments_updated', handleDeptChange);
    };
  }, []);

  // Effect to fetch leave records when filters or pagination changes
  useEffect(() => {
    fetchLeaveRecords(pagination.page);
  }, [filters, pagination.page]);

  return (
    <Layout title="Leave Records" header="Leave Records">
      <div className="card bg-white shadow-md mb-6">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <h2 className="card-title text-xl font-bold text-gray-800">
              <i className="fi fi-rr-time-past text-blue-500 mr-2"></i>
              Leave Records
            </h2>
          </div>

            {success && (
                <div className="alert alert-success mb-4">
                    <i className="fas fa-check-circle"></i>
                    <span>{success}</span>
                </div>
            )}
          
          {/* Automatic accrual note (Secs. 27/28) */}
          <div className="alert alert-info mb-4">
            <i className="fas fa-robot"></i>
            <span>
              Monthly credits accrue <strong>automatically</strong> (on server start and daily) using the CSC actual-service table — both vacation and sick credits are prorated. Manually edited records are never overwritten by the automatic job.
            </span>
            <button className="btn btn-sm btn-outline btn-info" onClick={runAccrualNow} disabled={runningAccrual}>
              {runningAccrual ? <span className="loading loading-spinner loading-xs"></span> : <i className="fas fa-sync-alt mr-1"></i>}
              Run now
            </button>
          </div>

          {/* Mandatory/forced leave tracker (Sec. 25) */}
          <div className="mb-6 rounded-xl border border-orange-200 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors text-left"
              onClick={() => { setShowForcedLeave(v => !v); if (!showForcedLeave) fetchForcedLeave(forcedYear); }}
            >
              <span className="font-semibold text-orange-800">
                <i className="fas fa-gavel mr-2"></i>
                Mandatory 5-Day Forced Leave Tracker (Sec. 25)
              </span>
              <span className="text-orange-600"><i className={`fas ${showForcedLeave ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i></span>
            </button>
            {showForcedLeave && (
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between mb-3 gap-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium text-gray-700">Year</span></label>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-32"
                      value={forcedYear}
                      onChange={(e) => { setForcedYear(e.target.value); fetchForcedLeave(e.target.value); }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-right max-w-md">
                    Employees with 10+ days of vacation leave must take a minimum of five (5) working days of forced leave per year (continuous or intermittent); forfeited if not taken (Sec. 25).
                  </p>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="table table-zebra table-sm w-full">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-sm">
                        <th className="font-semibold">Employee</th>
                        <th className="font-semibold">Department</th>
                        <th className="font-semibold text-center">VL Balance</th>
                        <th className="font-semibold text-center">Eligible</th>
                        <th className="font-semibold text-center">Taken</th>
                        <th className="font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forcedLeave.length > 0 ? forcedLeave.map(emp => (
                        <tr key={emp.user_id}>
                          <td className="font-medium">{emp.name}</td>
                          <td>{emp.department}</td>
                          <td className="text-center font-mono">{emp.vacation_balance.toFixed(3)}</td>
                          <td className="text-center">{emp.eligible ? <span className="badge badge-success badge-sm">Yes</span> : <span className="badge badge-ghost badge-sm">No</span>}</td>
                          <td className="text-center font-mono">{emp.taken_days.toFixed(1)}</td>
                          <td><span className={`badge badge-sm ${emp.required_done ? 'badge-success' : emp.eligible ? 'badge-warning' : 'badge-ghost'}`}>{emp.status_label}</span></td>
                        </tr>
                      )) : (
                        <tr><td colSpan="6" className="text-center py-6 text-gray-500">No employees found for {forcedYear}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          {/* Wellness leave usage tracker (CSC MC No. 1, s. 2026) */}
          <div className="mb-6 rounded-xl border border-lime-300 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-lime-50 hover:bg-lime-100 transition-colors text-left"
              onClick={() => { setShowWellness(v => !v); if (!showWellness) fetchWellness(wellnessYear); }}
            >
              <span className="font-semibold text-lime-800">
                <i className="fas fa-heart-pulse mr-2"></i>
                Wellness Leave Usage Tracker (CSC MC No. 1, s. 2026)
              </span>
              <span className="text-lime-600"><i className={`fas ${showWellness ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i></span>
            </button>
            {showWellness && (
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between mb-3 gap-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium text-gray-700">Year</span></label>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-32"
                      value={wellnessYear}
                      onChange={(e) => { setWellnessYear(e.target.value); fetchWellness(e.target.value); }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-right max-w-md">
                    Each employee is entitled to five (5) days of wellness leave per calendar year — non-cumulative, non-commutable, and forfeited if unused. Does not deduct from vacation or sick leave credits.
                  </p>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="table table-zebra table-sm w-full">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-sm">
                        <th className="font-semibold">Employee</th>
                        <th className="font-semibold">Department</th>
                        <th className="font-semibold text-center">Used</th>
                        <th className="font-semibold text-center">Remaining</th>
                        <th className="font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wellness.length > 0 ? wellness.map(emp => (
                        <tr key={emp.user_id}>
                          <td className="font-medium">{emp.name}</td>
                          <td>{emp.department}</td>
                          <td className="text-center font-mono">{emp.used_days.toFixed(1)}</td>
                          <td className="text-center font-mono">{emp.remaining_days.toFixed(1)}</td>
                          <td>
                            {emp.fully_used ? <span className="badge badge-success badge-sm">5/5 used</span> : emp.used_days > 0 ? <span className="badge badge-warning badge-sm">{emp.remaining_days.toFixed(1)} day(s) remaining</span> : <span className="badge badge-ghost badge-sm">Not used — forfeited if unused this year</span>}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="5" className="text-center py-6 text-gray-500">No employees found for {wellnessYear}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
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
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-sm">
                    <th className="py-3.5 px-4 font-semibold">Employee</th>
                    <th className="py-3.5 px-4 font-semibold">Position</th>
                    <th className="py-3.5 px-4 font-semibold">Department</th>
                    <th className="py-3.5 px-4 font-semibold">Role</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user._id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="avatar placeholder">
                              <div className="mask mask-squircle w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm leading-none shadow-sm">
                                {user.first_name?.charAt(0)?.toUpperCase()}{user.last_name?.charAt(0)?.toUpperCase() || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{user.first_name} {user.last_name}</div>
                              <div className="text-xs text-gray-500 font-mono">ID: {user.user_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-700">{user.position || 'No Position'}</td>
                        <td className="py-3 px-4 text-gray-600">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                            {user.department_id?.name || 'No Department'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            user.user_type === 'hr' ? 'bg-purple-100 text-purple-800' :
                            user.user_type === 'mayor' ? 'bg-amber-100 text-amber-800' :
                            user.user_type === 'department_admin' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {user.user_type?.replace('_', ' ') || 'employee'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button 
                            className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none space-x-1 shadow-sm" 
                            onClick={() => viewRecord(user.user_id)}
                          >
                            <i className="fas fa-folder-open text-xs"></i>
                            <span>View Leave Record</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-500">
                        <i className="fas fa-folder-open text-3xl mb-2 text-gray-300 block"></i>
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
    </Layout>
  );
};

export default HRLeaveRecords;