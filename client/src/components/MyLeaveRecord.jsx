import React, { useState, useEffect, useCallback } from 'react';
import Layout from './Layout';
import axios from '../services/api';

const MyLeaveRecord = () => {
  const [employee, setEmployee] = useState(null);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [filteredLeaveRecords, setFilteredLeaveRecords] = useState([]);
  const [vacationSummary, setVacationSummary] = useState({ earned: 0, used: 0, balance: 0 });
  const [sickSummary, setSickSummary] = useState({ earned: 0, used: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ year: '' });

  const getMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || '';
  };

  const fetchMyRecord = useCallback(async () => {
    try {
      setLoading(true);
      const profileRes = await axios.get('/api/auth/profile');
      const profile = profileRes.data.user;
      if (!profile || !profile.user_id) {
        throw new Error('Could not determine your user ID');
      }

      const params = {};
      if (filters.year) params.year = filters.year;

      const response = await axios.get(`/api/leave-records/${profile.user_id}`, { params });

      if (response.data.employee) {
        setEmployee(response.data.employee);
        setVacationSummary(response.data.vacationSummary || { earned: 0, used: 0, balance: 0 });
        setSickSummary(response.data.sickSummary || { earned: 0, used: 0, balance: 0 });

        const formattedRecords = Object.values(response.data.leaveRecords).flat().map(record => ({
          ...record,
          month_year: `${getMonthName(record.month)} ${record.year}`,
          formatted_undertime: record.undertime_hours > 0 ? record.undertime_hours.toFixed(3) : '0.000'
        })).sort((a, b) => b.year - a.year || b.month - a.month);

        setLeaveRecords(formattedRecords);
      } else {
        setError(response.data.message || 'Failed to fetch leave record');
      }
    } catch (err) {
      console.error('Error fetching my leave record:', err);
      setError('Failed to fetch leave record: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [filters.year]);

  useEffect(() => {
    fetchMyRecord();
  }, [fetchMyRecord]);

  // Year filter
  useEffect(() => {
    if (!leaveRecords || leaveRecords.length === 0) {
      setFilteredLeaveRecords([]);
      return;
    }
    let filtered = [...leaveRecords];
    if (filters.year) {
      filtered = filtered.filter(record => record.year.toString() === filters.year);
    }
    setFilteredLeaveRecords(filtered);
  }, [filters, leaveRecords]);

  const availableYears = [...new Set(leaveRecords.map(r => r.year))].sort((a, b) => b - a);

  const getLeaveTypeText = (type) => {
    const map = {
      vacation: 'Vacation Leave',
      sick: 'Sick Leave',
      mandatory_forced_leave: 'Mandatory/Forced Leave',
      maternity_leave: 'Maternity Leave',
      paternity_leave: 'Paternity Leave',
      special_privilege_leave: 'Special Privilege Leave',
      solo_parent_leave: 'Solo Parent Leave',
      study_leave: 'Study Leave',
      vawc_leave: 'VAWC Leave',
      rehabilitation_privilege: 'Rehabilitation Privilege',
      special_leave_benefits_women: 'Special Leave Benefits for Women',
      special_emergency: 'Special Emergency (Calamity)',
      adoption_leave: 'Adoption Leave',
      monetization: 'Monetization of Leave Credits',
      terminal_leave: 'Terminal Leave',
      others_specify: 'Others (Specify)'
    };
    return map[type] || type;
  };

  const getStatusBadge = (entry) => {
    if (entry.cancelled) {
      return <span className="badge badge-error badge-sm text-white font-semibold">Cancelled</span>;
    }
    if (entry.status === 'approved') {
      return <span className="badge badge-success badge-sm text-white font-semibold">Approved</span>;
    }
    return <span className="badge badge-warning badge-sm font-semibold capitalize">{entry.status}</span>;
  };

  const renderEntry = (entry, isVacation, summary) => {
    const balanceKey = isVacation ? 'running_vacation_balance' : 'running_sick_balance';
    const balanceText = isVacation ? 'VL' : 'SL';
    const balanceColor = isVacation
      ? 'bg-blue-50 text-blue-800 border-blue-200'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200';
    return (
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className={`w-11 h-11 ${isVacation ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'} rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
            <i className={`${isVacation ? 'fas fa-umbrella-beach' : 'fas fa-stethoscope'} text-lg`}></i>
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-bold text-gray-900 text-base">{getLeaveTypeText(entry.type)}</span>
              {getStatusBadge(entry)}
            </div>

            <p className="text-xs text-gray-600 mt-1 flex items-center space-x-1">
              <i className="far fa-calendar-alt text-gray-400"></i>
              <span>For: <strong className="text-gray-800">{entry.start_date} - {entry.end_date}</strong> ({entry.days} working day/s)</span>
            </p>

            <div className="mt-2.5 flex items-center space-x-3 flex-wrap text-xs">
              <div className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 font-semibold flex items-center space-x-1">
                <i className="fas fa-history text-indigo-500"></i>
                <span>Credits Before Deduction: <strong>{entry.credits_before_deduction !== undefined ? entry.credits_before_deduction.toFixed(3) : '0.000'} {balanceText}</strong></span>
              </div>
              {entry.cancelled ? (
                <div className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold flex items-center space-x-1">
                  <i className="fas fa-undo-alt text-emerald-500"></i>
                  <span>Credits Returned</span>
                </div>
              ) : entry.status === 'approved' ? (
                <div className="bg-red-50 text-red-700 px-2.5 py-1 rounded-lg border border-red-200 font-semibold flex items-center space-x-1">
                  <i className="fas fa-minus-circle text-red-500"></i>
                  <span>Credits Deducted: <strong>{entry.credits_deducted !== undefined ? entry.credits_deducted.toFixed(3) : entry.days.toFixed(3)} {balanceText}</strong></span>
                </div>
              ) : (
                <div className="bg-gray-50 text-gray-600 px-2.5 py-1 rounded-lg border border-gray-200 font-semibold flex items-center space-x-1">
                  <i className="fas fa-hourglass-half text-gray-400"></i>
                  <span>No Deduction (Pending)</span>
                </div>
              )}
              <div className={`${balanceColor} px-2.5 py-1 rounded-lg border font-semibold flex items-center space-x-1`}>
                <i className="fas fa-wallet"></i>
                <span>{balanceText} Balance Now: <strong>{entry[balanceKey] !== undefined ? entry[balanceKey].toFixed(3) : (summary.balance?.toFixed(3) || '0.000')} days</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout title="My Leave Record">
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="My Leave Record">
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
    <Layout title="My Leave Record">
      <div className="card bg-white shadow-lg mb-6">
        <div className="card-body p-6">
          {/* Employee Information Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="avatar">
                <div className="mask mask-squircle w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600">
                  <span className="text-white text-2xl font-bold flex items-center justify-center w-full h-full leading-none">
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
                {employee.appointment_status && (
                  <span className="badge badge-outline badge-sm mt-1">
                    <i className="fas fa-id-badge mr-1"></i>
                    {(employee.appointment_status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <i className="fas fa-lock text-gray-400"></i>
              <span>Read-only view of your official leave record</span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
              <h3 className="font-semibold text-blue-800 text-lg mb-4">Vacation Leave Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Total Earned:</span>
                  <span className="font-medium text-blue-900">{(vacationSummary.earned || 0).toFixed(3)} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Total Used:</span>
                  <span className="font-medium text-blue-900">{(vacationSummary.used || 0).toFixed(3)} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Current Balance:</span>
                  <span className="font-medium text-blue-900">{(vacationSummary.balance || 0).toFixed(3)} days</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
              <h3 className="font-semibold text-green-800 text-lg mb-4">Sick Leave Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Total Earned:</span>
                  <span className="font-medium text-green-900">{(sickSummary.earned || 0).toFixed(3)} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Total Used:</span>
                  <span className="font-medium text-green-900">{(sickSummary.used || 0).toFixed(3)} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Current Balance:</span>
                  <span className="font-medium text-green-900">{(sickSummary.balance || 0).toFixed(3)} days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Leave Records Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-xl font-semibold text-gray-800">Leave Records</h3>
              {availableYears.length > 1 && (
                <select
                  className="select select-bordered select-sm w-40"
                  value={filters.year}
                  onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                >
                  <option value="">All Years</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              )}
            </div>

            {filteredLeaveRecords && filteredLeaveRecords.length > 0 ? (
              filteredLeaveRecords.map((record, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h4 className="text-gray-800 font-semibold text-lg">{record.month_year}</h4>
                  </div>
                  <div className="p-6 space-y-4">
                    {record.vacation_entries && record.vacation_entries.map((vacation, idx) => (
                      <div key={idx}>{renderEntry(vacation, true, vacationSummary)}</div>
                    ))}

                    {record.sick_entries && record.sick_entries.map((sick, idx) => (
                      <div key={idx}>{renderEntry(sick, false, sickSummary)}</div>
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
                          <p className="text-sm text-gray-500">Deducted from your vacation leave balance</p>
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
                            <span className="font-medium text-gray-800">{(record.vacation_earned || 0).toFixed(3)} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Used:</span>
                            <span className="font-medium text-gray-800">
                              {((record.undertime_hours || 0) + (record.vacation_entries || []).reduce((sum, e) => sum + (e.credits_deducted || 0), 0)).toFixed(3)} days
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Balance:</span>
                            <span className="font-medium text-gray-800">{(record.vacation_balance || 0).toFixed(3)} days</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="font-medium text-gray-800 mb-2">Sick Leave</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Earned:</span>
                            <span className="font-medium text-gray-800">{(record.sick_earned || 0).toFixed(3)} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Used:</span>
                            <span className="font-medium text-gray-800">
                              {(record.sick_entries || []).reduce((sum, e) => sum + (e.credits_deducted || 0), 0).toFixed(3)} days
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Balance:</span>
                            <span className="font-medium text-gray-800">{(record.sick_balance || 0).toFixed(3)} days</span>
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
                <p className="text-gray-500">There are no leave records for you yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MyLeaveRecord;
