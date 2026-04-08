import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';
import { useNavigate } from 'react-router-dom';

const HRDashboard = () => {
  const [stats, setStats] = useState({
    pending: 0,
    approved_this_month: 0,
    rejected_this_month: 0,
    total_employees: 0
  });

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Department management state
  const [departments, setDepartments] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [deptError, setDeptError] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/hr/dashboard', {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data.success) {
          console.log('HR Dashboard data structure:', response.data);
          setStats(response.data.stats);
          setLeaveRequests(response.data.leaveRequests || []);
        }
      } catch (error) {
        console.error('Error fetching HR dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    fetchDepartments();
  }, []);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/hr/departments');
      if (response.data.success) {
        setDepartments(response.data.departments);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // Open department modal for create
  const openCreateDept = () => {
    setEditingDept(null);
    setDeptForm({ name: '', description: '' });
    setDeptError('');
    setShowDeptModal(true);
  };

  // Open department modal for edit
  const openEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, description: dept.description || '' });
    setDeptError('');
    setShowDeptModal(true);
  };

  // Delete department
  const handleDeleteDept = async (dept) => {
    if (!confirm(`Delete "${dept.name}"? This cannot be undone.`)) return;

    try {
      const response = await axios.delete(`/api/hr/departments/${dept._id}`);
      if (response.data.success) {
        fetchDepartments();
        localStorage.setItem('departments_updated', Date.now().toString());
        window.dispatchEvent(new Event('departments_updated'));
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete department');
    }
  };

  // Save department (create or update)
  const handleSaveDept = async (e) => {
    e.preventDefault();
    setDeptError('');
    setDeptLoading(true);

    try {
      let response;
      if (editingDept) {
        response = await axios.put(`/api/hr/departments/${editingDept._id}`, deptForm);
      } else {
        response = await axios.post('/api/hr/departments', deptForm);
      }

      if (response.data.success) {
        setShowDeptModal(false);
        fetchDepartments();
        // Notify other components
        localStorage.setItem('departments_updated', Date.now().toString());
        window.dispatchEvent(new Event('departments_updated'));
      }
    } catch (error) {
      setDeptError(error.response?.data?.message || 'Failed to save department');
    } finally {
      setDeptLoading(false);
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
      <Layout title="HR Dashboard">
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="HR Dashboard">
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
    <Layout title="HR Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-6">
        {/* Pending Requests Card */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Pending Requests</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{stats.pending}</h3>
            </div>
            <div className="bg-blue-100 p-2 md:p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Approved This Month Card */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Approved This Month</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{stats.approved_this_month}</h3>
            </div>
            <div className="bg-green-100 p-2 md:p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2l4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Rejected This Month Card */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Rejected This Month</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{stats.rejected_this_month}</h3>
            </div>
            <div className="bg-red-100 p-2 md:p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Total Employees Card */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Employees</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{stats.total_employees}</h3>
            </div>
            <div className="bg-purple-100 p-2 md:p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Leave Records Card */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-600">Leave Records</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">
                <i className="fas fa-file-alt text-indigo-500"></i>
              </h3>
            </div>
            <button 
              onClick={() => navigate('/hr/leave-records')}
              className="btn btn-primary btn-xs md:btn-sm"
            >
              View Records
            </button>
          </div>
        </div>
      </div>

      {/* Department Management */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">
              <i className="fas fa-building text-blue-500 mr-2"></i>
              Departments ({departments.length})
            </h2>
            <button
              className="btn btn-xs btn-primary"
              onClick={openCreateDept}
            >
              <i className="fas fa-plus mr-1"></i>
              Add
            </button>
          </div>
        </div>
        <div className="p-3">
          {departments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-600 py-2 px-3">Department</th>
                    <th className="text-left text-xs font-semibold text-gray-600 py-2 px-3 hidden sm:table-cell">Description</th>
                    <th className="text-center text-xs font-semibold text-gray-600 py-2 px-3 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-sm text-gray-800">{dept.name}</td>
                      <td className="py-2 px-3 text-xs text-gray-500 hidden sm:table-cell max-w-xs truncate">{dept.description || '—'}</td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => openEditDept(dept)}
                            className="btn btn-xs btn-ghost btn-square p-0 h-6 w-6"
                            title="Edit"
                          >
                            <i className="fas fa-pen text-gray-400 hover:text-blue-500 text-xs"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteDept(dept)}
                            className="btn btn-xs btn-ghost btn-square p-0 h-6 w-6"
                            title="Delete"
                          >
                            <i className="fas fa-trash text-gray-400 hover:text-red-500 text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              <i className="fas fa-building text-2xl mb-1 text-gray-300"></i>
              <p>No departments yet. Click "Add" to create one.</p>
            </div>
          )}
        </div>
      </div>

      {/* Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                {editingDept ? 'Edit Department' : 'Add Department'}
              </h3>
            </div>
            <form onSubmit={handleSaveDept} className="p-6 space-y-4">
              {deptError && (
                <div className="alert alert-error text-sm">
                  <i className="fas fa-exclamation-circle mr-1"></i>
                  {deptError}
                </div>
              )}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium text-gray-700">Department Name</span>
                </label>
                <input
                  type="text"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm(prev => ({...prev, name: e.target.value}))}
                  placeholder="e.g. Engineering Office"
                  className="input input-bordered w-full"
                  required
                />
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium text-gray-700">Description (optional)</span>
                </label>
                <textarea
                  value={deptForm.description}
                  onChange={(e) => setDeptForm(prev => ({...prev, description: e.target.value}))}
                  placeholder="Brief description..."
                  className="textarea textarea-bordered w-full h-20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowDeptModal(false)}
                  disabled={deptLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={deptLoading}
                >
                  {deptLoading ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Saving...
                    </>
                  ) : (
                    editingDept ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent Leave Requests Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">
              <i className="fas fa-history text-blue-500 mr-2"></i>
              Recent Leave Requests
            </h2>
            
            <button 
              className="btn btn-sm btn-outline inline-flex items-center"
              onClick={() => navigate('/hr/leave-requests')}
            >
              View All Requests
              <i className="fas fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>
        
        <div className="p-4 md:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Employee
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Period
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Days
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveRequests.length > 0 ? (
                  leaveRequests.map((leaveRequest) => (
                    <tr key={leaveRequest._id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {leaveRequest.user_id?.first_name ? `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}` : 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 md:text-sm">
                          {leaveRequest.user_id?.position || 'Position not specified'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {leaveRequest.leave_type === 'vacation' ? 'Vacation' : 
                         leaveRequest.leave_type === 'sick' ? 'Sick' : 
                         leaveRequest.leave_type === 'mandatory_forced_leave' ? 'Mandatory/Forced' :
                         leaveRequest.leave_type === 'maternity_leave' ? 'Maternity' :
                         leaveRequest.leave_type === 'paternity_leave' ? 'Paternity' :
                         leaveRequest.leave_type === 'special_privilege_leave' ? 'Special Privilege' :
                         leaveRequest.leave_type === 'solo_parent_leave' ? 'Solo Parent' :
                         leaveRequest.leave_type === 'study_leave' ? 'Study' :
                         leaveRequest.leave_type === 'vawc_leave' ? 'VAWC' :
                         leaveRequest.leave_type === 'rehabilitation_privilege' ? 'Rehabilitation' :
                         leaveRequest.leave_type === 'special_leave_benefits_women' ? 'Special Leave Benefits Women' :
                         leaveRequest.leave_type === 'special_emergency' ? 'Special Emergency' :
                         leaveRequest.leave_type === 'adoption_leave' ? 'Adoption' :
                         leaveRequest.leave_type === 'others_specify' ? 'Others' :
                         leaveRequest.leave_type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 md:text-sm">
                        {new Date(leaveRequest.start_date).toLocaleDateString()} - {new Date(leaveRequest.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {leaveRequest.number_of_days}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(leaveRequest.status)}`}>
                          {getStatusText(leaveRequest.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => navigate(`/hr/leave-request/${leaveRequest._id}`)}
                          className="btn btn-xs btn-primary"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500">
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

export default HRDashboard;