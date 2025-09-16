import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';
import SuccessModal from './SuccessModal';
import ConfirmationModal from './ConfirmationModal';

const HREmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    department: 'all',
    position: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);

  // Form states
  const [addForm, setAddForm] = useState({
    user_id: '',
    first_name: '',
    last_name: '',
    middle_initial: '',
    email: '',
    department_id: '',
    position: '',
    start_date: '',
    salary: '',
    user_type: 'employee'
  });

  const [editForm, setEditForm] = useState({
    user_id: '',
    first_name: '',
    last_name: '',
    middle_initial: '',
    email: '',
    department_id: '',
    position: '',
    start_date: '',
    salary: '',
    user_type: 'employee'
  });

  // Fetch employees
  const fetchEmployees = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = {
        page,
        limit: pagination.limit,
        department: filters.department,
        position: filters.position,
        search: filters.search
      };

      const response = await axios.get('/api/hr/employees', {
        headers: {
          'Content-Type': 'application/json'
        },
        params
      });

      if (response.data.success) {
        setEmployees(response.data.users);
        setDepartments(response.data.departments);
        setPositions(response.data.positions);
        setPagination({
          ...pagination,
          page: response.data.pagination.page,
          totalPages: response.data.pagination.pages,
          total: response.data.pagination.total
        });
      } else {
        setError(response.data.message || 'Failed to fetch employees');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to fetch employees: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Fetch employee for editing
  const fetchEmployeeForEdit = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`/api/hr/employees/${id}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        const user = response.data.user;
        setEditForm({
          user_id: user.user_id || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          middle_initial: user.middle_initial || '',
          email: user.email || '',
          department_id: user.department_id?._id || user.department_id || '',
          position: user.position || '',
          start_date: user.start_date ? new Date(user.start_date).toISOString().split('T')[0] : '',
          salary: user.salary || '',
          user_type: user.user_type || 'employee'
        });
        setEmployeeToEdit(user);
        setShowEditModal(true);
      } else {
        setError(response.data.message || 'Failed to fetch employee');
      }
    } catch (error) {
      console.error('Error fetching employee:', error);
      setError('Failed to fetch employee: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters({
      ...filters,
      [filterName]: value
    });
  };

  // Handle form changes
  const handleAddFormChange = (e) => {
    const { name, value } = e.target;
    setAddForm({
      ...addForm,
      [name]: value
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm({
      ...editForm,
      [name]: value
    });
  };

  // Handle form submissions
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post('/api/hr/employees', addForm, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setShowAddModal(false);
        setSuccessMessage('Employee added successfully');
        setShowSuccessModal(true);
        setAddForm({
          user_id: '',
          first_name: '',
          last_name: '',
          middle_initial: '',
          email: '',
          department_id: '',
          position: '',
          start_date: '',
          salary: '',
          user_type: 'employee'
        });
        fetchEmployees();
      } else {
        setError(response.data.message || 'Failed to add employee');
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      setError('Failed to add employee: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.put(`/api/hr/employees/${employeeToEdit._id}`, editForm, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setShowEditModal(false);
        setSuccessMessage('Employee updated successfully');
        setShowSuccessModal(true);
        fetchEmployees();
      } else {
        setError(response.data.message || 'Failed to update employee');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      setError('Failed to update employee: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle delete
  const confirmDeleteEmployee = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  const handleDeleteEmployee = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.delete(`/api/hr/employees/${employeeToDelete._id}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setShowDeleteModal(false);
        setSuccessMessage('Employee deleted successfully');
        setShowSuccessModal(true);
        fetchEmployees();
      } else {
        setError(response.data.message || 'Failed to delete employee');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      setError('Failed to delete employee: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchEmployees(newPage);
    }
  };

  // Apply filters
  const applyFilters = () => {
    fetchEmployees(1);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      department: 'all',
      position: 'all',
      search: ''
    });
  };

  // Effect to fetch employees when filters or pagination changes
  useEffect(() => {
    fetchEmployees(pagination.page);
  }, [filters, pagination.page]);

  return (
    <Layout title="Employees">
      <div className="card bg-white shadow-md mb-6">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <h2 className="card-title text-xl font-bold text-gray-800">
              <i className="fas fa-users text-blue-500 mr-2"></i>
              Manage Employees
            </h2>
            
            <button 
              className="btn btn-primary btn-sm whitespace-nowrap"
              onClick={() => setShowAddModal(true)}
            >
              <i className="fas fa-plus mr-1"></i>
              Add Employee
            </button>
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
                value={filters.position}
                onChange={(e) => handleFilterChange('position', e.target.value)}
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
                  <i className="fas fa-search text-gray-400"></i>
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
          
          {/* Employees Table */}
          {!loading && (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-gray-600">Employee</th>
                    <th className="text-gray-600">User Type</th>
                    <th className="text-gray-600">Department</th>
                    <th className="text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length > 0 ? (
                    employees.map((employee) => (
                      <tr key={employee._id}>
                        <td className="flex items-center space-x-3">
                          <div className="avatar">
                            <div className="mask mask-squircle w-8 h-8">
                              <span className="bg-blue-500 text-white text-xs font-bold flex items-center justify-center w-full h-full">
                                {employee.first_name?.charAt(0)?.toUpperCase()}{employee.last_name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="font-bold">{employee.first_name} {employee.last_name}</div>
                            <div className="text-xs text-gray-500">{employee.user_id}</div>
                          </div>
                        </td>
                        <td>{employee.user_type === 'hr' ? 'HR' : employee.user_type === 'department_admin' ? 'Department Admin' : employee.user_type === 'mayor' ? 'Mayor' : 'Employee'}</td>
                        <td>{employee.department_id?.name || 'N/A'}</td>
                        <td>
                          <div className="flex space-x-2">
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => fetchEmployeeForEdit(employee._id)}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-sm btn-error"
                              onClick={() => confirmDeleteEmployee(employee)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-8">
                        <div className="text-gray-500">No employees found</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {!loading && employees.length > 0 && (
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
      
      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg">Add New Employee</h3>
            <button 
              className="btn btn-sm btn-circle absolute right-2 top-2"
              onClick={() => setShowAddModal(false)}
            >
              ✕
            </button>
            
            <form onSubmit={handleAddEmployee} className="py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Information */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">User ID</span>
                  </label>
                  <input 
                    type="text" 
                    name="user_id"
                    value={addForm.user_id}
                    onChange={handleAddFormChange}
                    className="input input-bordered" 
                    placeholder="User ID" 
                    required 
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">First Name</span>
                  </label>
                  <input 
                    type="text" 
                    name="first_name"
                    value={addForm.first_name}
                    onChange={handleAddFormChange}
                    className="input input-bordered" 
                    placeholder="First Name" 
                    required 
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Last Name</span>
                  </label>
                  <input 
                    type="text" 
                    name="last_name"
                    value={addForm.last_name}
                    onChange={handleAddFormChange}
                    className="input input-bordered" 
                    placeholder="Last Name" 
                    required 
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Middle Initial</span>
                  </label>
                  <input 
                    type="text" 
                    name="middle_initial"
                    value={addForm.middle_initial}
                    onChange={handleAddFormChange}
                    className="input input-bordered" 
                    placeholder="Middle Initial" 
                    maxLength="1" 
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Position</span>
                  </label>
                  <input 
                    type="text" 
                    name="position"
                    value={addForm.position}
                    onChange={handleAddFormChange}
                    className="input input-bordered" 
                    placeholder="Position" 
                    required 
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Department</span>
                  </label>
                  <select 
                    name="department_id"
                    value={addForm.department_id}
                    onChange={handleAddFormChange}
                    className="select select-bordered" 
                    required
                  >
                    <option disabled value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Email</span>
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    value={addForm.email}
                    onChange={handleAddFormChange}
                    className="input input-bordered" 
                    placeholder="Email Address" 
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Account Type</span>
                  </label>
                  <select 
                    name="user_type"
                    value={addForm.user_type}
                    onChange={handleAddFormChange}
                    className="select select-bordered" 
                    required
                  >
                    <option value="employee">Employee</option>
                    <option value="hr">HR</option>
                    <option value="department_admin">Department Admin</option>
                    <option value="mayor">Mayor</option>
                  </select>
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Date Hired</span>
                  </label>
                  <input 
                    type="date" 
                    name="start_date"
                    value={addForm.start_date}
                    onChange={handleAddFormChange}
                    className="input input-bordered" 
                    required 
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Salary</span>
                  </label>
                  <input 
                    type="number" 
                    name="salary"
                    value={addForm.salary}
                    onChange={handleAddFormChange}
                    className="input input-bordered" 
                    placeholder="Salary" 
                    required 
                  />
                </div>
              </div>
              
              <div className="modal-action">
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg">Edit Employee</h3>
            <button 
              className="btn btn-sm btn-circle absolute right-2 top-2"
              onClick={() => setShowEditModal(false)}
            >
              ✕
            </button>
            
            <form onSubmit={handleEditEmployee} className="py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Information */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">User ID</span>
                  </label>
                  <input 
                    type="text" 
                    name="user_id"
                    value={editForm.user_id}
                    onChange={handleEditFormChange}
                    className="input input-bordered" 
                    placeholder="User ID" 
                    required 
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">First Name</span>
                  </label>
                  <input 
                    type="text" 
                    name="first_name"
                    value={editForm.first_name}
                    onChange={handleEditFormChange}
                    className="input input-bordered" 
                    placeholder="First Name" 
                    required 
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Last Name</span>
                  </label>
                  <input 
                    type="text" 
                    name="last_name"
                    value={editForm.last_name}
                    onChange={handleEditFormChange}
                    className="input input-bordered" 
                    placeholder="Last Name" 
                    required 
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Middle Initial</span>
                  </label>
                  <input 
                    type="text" 
                    name="middle_initial"
                    value={editForm.middle_initial}
                    onChange={handleEditFormChange}
                    className="input input-bordered" 
                    placeholder="Middle Initial" 
                    maxLength="1" 
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Position</span>
                  </label>
                  <input 
                    type="text" 
                    name="position"
                    value={editForm.position}
                    onChange={handleEditFormChange}
                    className="input input-bordered" 
                    placeholder="Position" 
                    required 
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Department</span>
                  </label>
                  <select 
                    name="department_id"
                    value={editForm.department_id}
                    onChange={handleEditFormChange}
                    className="select select-bordered" 
                    required
                  >
                    <option disabled value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Email</span>
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    value={editForm.email}
                    onChange={handleEditFormChange}
                    className="input input-bordered" 
                    placeholder="Email Address" 
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Account Type</span>
                  </label>
                  <select 
                    name="user_type"
                    value={editForm.user_type}
                    onChange={handleEditFormChange}
                    className="select select-bordered" 
                    required
                  >
                    <option value="employee">Employee</option>
                    <option value="hr">HR</option>
                    <option value="department_admin">Department Admin</option>
                    <option value="mayor">Mayor</option>
                  </select>
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Date Hired</span>
                  </label>
                  <input 
                    type="date" 
                    name="start_date"
                    value={editForm.start_date}
                    onChange={handleEditFormChange}
                    className="input input-bordered" 
                    required 
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Salary</span>
                  </label>
                  <input 
                    type="number" 
                    name="salary"
                    value={editForm.salary}
                    onChange={handleEditFormChange}
                    className="input input-bordered" 
                    placeholder="Salary" 
                    required 
                  />
                </div>
              </div>
              
              <div className="modal-action">
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Update Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteEmployee}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${employeeToDelete?.first_name} ${employeeToDelete?.last_name}? This action cannot be undone.`}
        confirmText="Delete"
        confirmClass="btn-error"
      />
      
      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />
    </Layout>
  );
};

export default HREmployees;