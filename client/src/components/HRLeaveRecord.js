import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from './Layout';
import axios from '../services/api';

const HRLeaveRecord = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [vacationSummary, setVacationSummary] = useState({
    earned: 0,
    used: 0,
    balance: 0
  });
  const [sickSummary, setSickSummary] = useState({
    earned: 0,
    used: 0,
    balance: 0
  });
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [showAddUndertimeModal, setShowAddUndertimeModal] = useState(false);
  const [undertimeForm, setUndertimeForm] = useState({
    month: '',
    year: '',
    hours: '',
    minutes: ''
  });
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFutureDate, setIsFutureDate] = useState(false);
  const [showUndertimeWarning, setShowUndertimeWarning] = useState(false);

  // Conversion tables for hours and minutes to days
  const hoursToDays = {
    1: 0.125, 2: 0.250, 3: 0.375, 4: 0.500, 5: 0.625,
    6: 0.750, 7: 0.875, 8: 1.000
  };

  const minutesToDays = {
    1: 0.002, 2: 0.004, 3: 0.006, 4: 0.008, 5: 0.010, 6: 0.012, 7: 0.015, 8: 0.017, 9: 0.019,
    10: 0.021, 11: 0.023, 12: 0.025, 13: 0.027, 14: 0.029, 15: 0.031, 16: 0.033, 17: 0.035, 18: 0.037, 19: 0.040,
    20: 0.042, 21: 0.044, 22: 0.046, 23: 0.048, 24: 0.050, 25: 0.052, 26: 0.054, 27: 0.056, 28: 0.058, 29: 0.060,
    30: 0.062, 31: 0.065, 32: 0.067, 33: 0.069, 34: 0.071, 35: 0.073, 36: 0.075, 37: 0.077, 38: 0.079, 39: 0.081,
    40: 0.083, 41: 0.085, 42: 0.087, 43: 0.090, 44: 0.092, 45: 0.094, 46: 0.096, 47: 0.098, 48: 0.100, 49: 0.102,
    50: 0.104, 51: 0.106, 52: 0.108, 53: 0.110, 54: 0.112, 55: 0.115, 56: 0.117, 57: 0.119, 58: 0.121, 59: 0.123, 60: 0.125
  };

  // Fetch employee leave record data
  useEffect(() => {
    const fetchLeaveRecord = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await axios.get(`/api/leave-records/${id}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data.employee) {
          setEmployee(response.data.employee);
          setVacationSummary(response.data.vacationSummary);
          setSickSummary(response.data.sickSummary);
          // Convert leave records to the format expected by the UI
          const formattedRecords = Object.values(response.data.leaveRecords).flat().map(record => ({
            ...record,
            month_year: `${getMonthName(record.month)} ${record.year}`,
            formatted_undertime: record.undertime_hours > 0 ? record.undertime_hours.toFixed(3) : '0.000'
          }));
          setLeaveRecords(formattedRecords);
        } else {
          setError(response.data.message || 'Failed to fetch leave record');
        }
      } catch (error) {
        console.error('Error fetching leave record:', error);
        setError('Failed to fetch leave record: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchLeaveRecord();
    }
  }, [id]);

  // Helper function to get month name
  const getMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || '';
  };

  // Calculate days from hours and minutes
  const calculateDaysFromTime = (hours, minutes) => {
    let totalDays = 0;

    // Add hours conversion
    if (hours > 0) {
      totalDays += hoursToDays[hours] || 0;
    }

    // Add minutes conversion
    if (minutes > 0) {
      totalDays += minutesToDays[minutes] || 0;
    }

    return parseFloat(totalDays.toFixed(3));
  };

  // Update calculated days when hours or minutes change
  useEffect(() => {
    const hours = parseInt(undertimeForm.hours) || 0;
    const minutes = parseInt(undertimeForm.minutes) || 0;
    const days = calculateDaysFromTime(hours, minutes);
    setCalculatedDays(days);
  }, [undertimeForm.hours, undertimeForm.minutes]);

  // Check if the selected date is in the future
  useEffect(() => {
    const { month, year } = undertimeForm;
    if (month && year) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const selectedYear = parseInt(year);
      const selectedMonth = parseInt(month);

      if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth)) {
        setIsFutureDate(true);
        setShowUndertimeWarning(true);
      } else {
        setIsFutureDate(false);
        setShowUndertimeWarning(false);
      }
    }
  }, [undertimeForm.month, undertimeForm.year]);

  const handleUndertimeInputChange = (e) => {
    const { name, value } = e.target;
    setUndertimeForm({
      ...undertimeForm,
      [name]: value
    });
  };

  const openAddUndertimeModal = () => {
    setShowAddUndertimeModal(true);
  };

  const closeAddUndertimeModal = () => {
    setShowAddUndertimeModal(false);
    setUndertimeForm({
      month: '',
      year: '',
      hours: '',
      minutes: ''
    });
    setCalculatedDays(0);
    setShowUndertimeWarning(false);
    setIsFutureDate(false);
  };

  const handleAddUndertimeSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Convert hours and minutes to days
      const hours = parseInt(undertimeForm.hours) || 0;
      const minutes = parseInt(undertimeForm.minutes) || 0;
      const undertimeDays = calculateDaysFromTime(hours, minutes);

      const response = await axios.post('/api/leave-records/add-undertime', {
        user_id: employee.user_id,
        month: undertimeForm.month,
        year: undertimeForm.year,
        undertime_hours: undertimeDays
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Refresh the data
        window.location.reload();
      } else {
        setError(response.data.message || 'Failed to add undertime');
      }
    } catch (error) {
      console.error('Error adding undertime:', error);
      setError('Failed to add undertime: ' + (error.response?.data?.message || error.message));
    } finally {
      closeAddUndertimeModal();
    }
  };

  if (loading) {
    return (
      <Layout title="Leave Record" header="Leave Record">
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Leave Record" header="Leave Record">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      </Layout>
    );
  }

  if (!employee) {
    return (
      <Layout title="Leave Record" header="Leave Record">
        <div className="alert alert-error">
          <span>Employee not found</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Leave Record" header="Leave Record">
      <div className="card bg-white shadow-lg mb-6">
        <div className="card-body p-6">
          {/* Employee Information Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="avatar">
                <div className="mask mask-squircle w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600">
                  <span className="text-white text-2xl font-bold flex items-center justify-center w-full h-full">
                    {employee.first_name?.charAt(0)?.toUpperCase()}{employee.last_name?.charAt(0)?.toUpperCase() || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                  {employee.first_name} {employee.last_name}
                </h2>
                <p className="text-base sm:text-lg text-gray-600 mb-1">
                  {employee.department_id?.name || 'No Department'} • {employee.position || 'No Position'}
                </p>
                <p className="text-sm text-gray-500">Employee ID: {employee.user_id}</p>
              </div>
            </div>
            <button onClick={openAddUndertimeModal} className="btn btn-primary btn-sm sm:btn-md whitespace-nowrap">
              <i className="fas fa-plus mr-2"></i>
              Add Undertime
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
              <h3 className="font-semibold text-blue-800 text-lg mb-4">Vacation Leave Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Total Earned:</span>
                  <span className="font-medium text-blue-900">{vacationSummary.earned?.toFixed(3) || '0.000'} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Total Used:</span>
                  <span className="font-medium text-blue-900">{vacationSummary.used?.toFixed(3) || '0.000'} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Current Balance:</span>
                  <span className="font-medium text-blue-900">{vacationSummary.balance?.toFixed(3) || '0.000'} days</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
              <h3 className="font-semibold text-green-800 text-lg mb-4">Sick Leave Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Total Earned:</span>
                  <span className="font-medium text-green-900">{sickSummary.earned?.toFixed(3) || '0.000'} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Total Used:</span>
                  <span className="font-medium text-green-900">{sickSummary.used?.toFixed(3) || '0.000'} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Current Balance:</span>
                  <span className="font-medium text-green-900">{sickSummary.balance?.toFixed(3) || '0.000'} days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Leave Records Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">Leave Records</h3>
              <div className="flex gap-2">
                {/* Filter Dropdown */}
                <div className="dropdown dropdown-end">
                  <button className="btn btn-sm btn-outline">
                    <i className="fas fa-filter mr-1"></i>
                    Filter
                    <i className="fas fa-angle-down ml-1"></i>
                  </button>
                  <div className="dropdown-content bg-white shadow-lg rounded-lg border border-gray-200 p-4 w-64 z-50">
                    <h4 className="font-medium text-gray-800 mb-3">Filter Options</h4>
                    
                    {/* Month Filter */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                      <select className="select select-bordered w-full text-sm">
                        <option value="">All Months</option>
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
                    
                    {/* Year Filter */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <select className="select select-bordered w-full text-sm">
                        <option value="">All Years</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                      </select>
                    </div>
                    
                    {/* Filter Actions */}
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-primary flex-1">
                        <i className="fi fi-rr-check mr-1"></i>
                        Apply
                      </button>
                      <button className="btn btn-sm btn-outline flex-1">
                        <i className="fi fi-rr-cross mr-1"></i>
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {leaveRecords && leaveRecords.length > 0 ? (
              leaveRecords.map((record, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h4 className="text-gray-800 font-semibold text-lg">{record.month_year}</h4>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Leave Entries */}
                    {record.vacation_entries && record.vacation_entries.map((vacation, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            {vacation.type === 'vacation' ? (
                              <i className="fas fa-umbrella-beach text-gray-600"></i>
                            ) : vacation.type === 'study_leave' ? (
                              <i className="fas fa-graduation-cap text-gray-600"></i>
                            ) : vacation.type === 'special_privilege_leave' ? (
                              <i className="fas fa-star text-gray-600"></i>
                            ) : vacation.type === 'mandatory_forced_leave' ? (
                              <i className="fas fa-exclamation-circle text-gray-600"></i>
                            ) : vacation.type === 'maternity_leave' ? (
                              <i className="fas fa-baby text-gray-600"></i>
                            ) : vacation.type === 'paternity_leave' ? (
                              <i className="fas fa-child text-gray-600"></i>
                            ) : vacation.type === 'solo_parent_leave' ? (
                              <i className="fas fa-user-friends text-gray-600"></i>
                            ) : vacation.type === 'vawc_leave' ? (
                              <i className="fas fa-heart text-gray-600"></i>
                            ) : vacation.type === 'rehabilitation_privilege' ? (
                              <i className="fas fa-heartbeat text-gray-600"></i>
                            ) : vacation.type === 'special_leave_benefits_women' ? (
                              <i className="fas fa-female text-gray-600"></i>
                            ) : vacation.type === 'special_emergency' ? (
                              <i className="fas fa-bolt text-gray-600"></i>
                            ) : vacation.type === 'adoption_leave' ? (
                              <i className="fas fa-home text-gray-600"></i>
                            ) : vacation.type === 'others_specify' ? (
                              <i className="fas fa-question-circle text-gray-600"></i>
                            ) : (
                              <i className="fas fa-calendar text-gray-600"></i>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {vacation.type === 'vacation' ? 'Vacation Leave' : 
                               vacation.type === 'special_privilege_leave' ? 'Special Privilege Leave' :
                               vacation.type === 'study_leave' ? 'Study Leave' :
                               vacation.type === 'mandatory_forced_leave' ? 'Mandatory/Forced Leave' :
                               vacation.type === 'maternity_leave' ? 'Maternity Leave' :
                               vacation.type === 'paternity_leave' ? 'Paternity Leave' :
                               vacation.type === 'solo_parent_leave' ? 'Solo Parent Leave' :
                               vacation.type === 'vawc_leave' ? 'VAWC Leave' :
                               vacation.type === 'rehabilitation_privilege' ? 'Rehabilitation Privilege' :
                               vacation.type === 'special_leave_benefits_women' ? 'Special Leave Benefits for Women' :
                               vacation.type === 'special_emergency' ? 'Special Emergency Leave' :
                               vacation.type === 'adoption_leave' ? 'Adoption Leave' :
                               vacation.type === 'others_specify' ? 'Others (Specify)' :
                               vacation.type}
                            </p>
                            <p className="text-sm text-gray-600">
                              {vacation.days} days
                              {vacation.paid === false && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Without Pay
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right sm:text-left">
                          <p className="text-sm text-gray-500">For: {vacation.start_date} - {vacation.end_date}</p>
                        </div>
                      </div>
                    ))}

                    {record.sick_entries && record.sick_entries.map((sick, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            {sick.type === 'sick' ? (
                              <i className="fas fa-thermometer-half text-gray-600"></i>
                            ) : sick.type === 'study_leave' ? (
                              <i className="fas fa-graduation-cap text-gray-600"></i>
                            ) : sick.type === 'special_privilege_leave' ? (
                              <i className="fas fa-star text-gray-600"></i>
                            ) : sick.type === 'mandatory_forced_leave' ? (
                              <i className="fas fa-exclamation-circle text-gray-600"></i>
                            ) : sick.type === 'maternity_leave' ? (
                              <i className="fas fa-baby text-gray-600"></i>
                            ) : sick.type === 'paternity_leave' ? (
                              <i className="fas fa-child text-gray-600"></i>
                            ) : sick.type === 'solo_parent_leave' ? (
                              <i className="fas fa-user-friends text-gray-600"></i>
                            ) : sick.type === 'vawc_leave' ? (
                              <i className="fas fa-heart text-gray-600"></i>
                            ) : sick.type === 'rehabilitation_privilege' ? (
                              <i className="fas fa-heartbeat text-gray-600"></i>
                            ) : sick.type === 'special_leave_benefits_women' ? (
                              <i className="fas fa-female text-gray-600"></i>
                            ) : sick.type === 'special_emergency' ? (
                              <i className="fas fa-bolt text-gray-600"></i>
                            ) : sick.type === 'adoption_leave' ? (
                              <i className="fas fa-home text-gray-600"></i>
                            ) : sick.type === 'others_specify' ? (
                              <i className="fas fa-question-circle text-gray-600"></i>
                            ) : (
                              <i className="fas fa-calendar text-gray-600"></i>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {sick.type === 'sick' ? 'Sick Leave' : 
                               sick.type === 'maternity_leave' ? 'Maternity Leave' :
                               sick.type === 'paternity_leave' ? 'Paternity Leave' :
                               sick.type === 'solo_parent_leave' ? 'Solo Parent Leave' :
                               sick.type === 'vawc_leave' ? 'VAWC Leave' :
                               sick.type === 'rehabilitation_privilege' ? 'Rehabilitation Privilege' :
                               sick.type === 'special_leave_benefits_women' ? 'Special Leave Benefits for Women' :
                               sick.type === 'special_emergency' ? 'Special Emergency Leave' :
                               sick.type === 'adoption_leave' ? 'Adoption Leave' :
                               sick.type === 'mandatory_forced_leave' ? 'Mandatory/Forced Leave' :
                               sick.type === 'special_privilege_leave' ? 'Special Privilege Leave' :
                               sick.type === 'study_leave' ? 'Study Leave' :
                               sick.type === 'others_specify' ? 'Others (Specify)' :
                               sick.type}
                            </p>
                            <p className="text-sm text-gray-600">
                              {sick.days} days
                              {sick.paid === false && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Without Pay
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right sm:text-left">
                          <p className="text-sm text-gray-500">For: {sick.start_date} - {sick.end_date}</p>
                        </div>
                      </div>
                    ))}

                    {record.undertime_hours > 0 && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <i className="fas fa-clock text-gray-600"></i>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">Undertime</p>
                            <p className="text-sm text-gray-600">{record.formatted_undertime} days</p>
                          </div>
                        </div>
                        <div className="text-right sm:text-left">
                          <p className="text-sm text-gray-500">For: {record.month_year} 1 - 30, {record.year}</p>
                        </div>
                      </div>
                    )}

                    {/* Monthly Balance */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="font-medium text-gray-800 mb-2">Vacation Leave</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Earned:</span>
                            <span className="font-medium text-gray-800">{record.vacation_earned?.toFixed(3) || '0.000'} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Used:</span>
                            <span className="font-medium text-gray-800">{record.vacation_used?.toFixed(3) || '0.000'} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Balance:</span>
                            <span className="font-medium text-gray-800">{record.vacation_balance?.toFixed(3) || '0.000'} days</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="font-medium text-gray-800 mb-2">Sick Leave</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Earned:</span>
                            <span className="font-medium text-gray-800">{record.sick_earned?.toFixed(3) || '0.000'} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Used:</span>
                            <span className="font-medium text-gray-800">{record.sick_used?.toFixed(3) || '0.000'} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Balance:</span>
                            <span className="font-medium text-gray-800">{record.sick_balance?.toFixed(3) || '0.000'} days</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-8 text-center">
                <i className="fas fa-file-alt text-gray-300 text-5xl mb-4"></i>
                <h3 className="text-xl font-medium text-gray-700 mb-2">No Leave Records Found</h3>
                <p className="text-gray-500">There are no leave records for this employee yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Undertime Modal */}
      {showAddUndertimeModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Add Monthly Undertime</h3>
            <form onSubmit={handleAddUndertimeSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Month</span>
                </label>
                <select 
                  className="select select-bordered w-full" 
                  name="month" 
                  value={undertimeForm.month}
                  onChange={handleUndertimeInputChange}
                  required
                >
                  <option value="">Select Month</option>
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
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Year</span>
                </label>
                <select 
                  className="select select-bordered w-full" 
                  name="year" 
                  value={undertimeForm.year}
                  onChange={handleUndertimeInputChange}
                  required
                >
                  <option value="">Select Year</option>
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
              </div>
              {showUndertimeWarning && (
                <div className="alert alert-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Cannot add undertime for a future month.</span>
                </div>
              )}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Undertime Duration</span>
                </label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="label">
                      <span className="label-text text-sm">Hours</span>
                    </label>
                    <input 
                      type="number" 
                      name="hours" 
                      min="0" 
                      max="23" 
                      className="input input-bordered w-full" 
                      placeholder="00" 
                      value={undertimeForm.hours}
                      onChange={handleUndertimeInputChange}
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="label">
                      <span className="label-text text-sm">Minutes</span>
                    </label>
                    <input 
                      type="number" 
                      name="minutes" 
                      min="0" 
                      max="59" 
                      className="input input-bordered w-full" 
                      placeholder="00" 
                      value={undertimeForm.minutes}
                      onChange={handleUndertimeInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-2">Calculated Days: <span>{calculatedDays.toFixed(3)}</span> days</div>
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={closeAddUndertimeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isFutureDate}>Add Undertime</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default HRLeaveRecord;