import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';

const HRReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState('summary');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerSort, setLedgerSort] = useState({ field: 'last_name', direction: 'asc' });

  const [overallStats, setOverallStats] = useState(null);
  const [leaveTypeSummary, setLeaveTypeSummary] = useState([]);
  const [employeeLedger, setEmployeeLedger] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState([]);

  const typeIcons = {
    vacation: 'fa-umbrella-beach',
    sick: 'fa-hospital',
    mandatory_forced_leave: 'fa-gavel',
    maternity_leave: 'fa-baby',
    paternity_leave: 'fa-person-breastfeeding',
    special_privilege_leave: 'fa-star',
    solo_parent_leave: 'fa-person',
    study_leave: 'fa-graduation-cap',
    vawc_leave: 'fa-shield-heart',
    rehabilitation_privilege: 'fa-hand-holding-medical',
    special_leave_benefits_women: 'fa-venus',
    special_emergency: 'fa-house-crack',
    adoption_leave: 'fa-hands-holding-child',
    others_specify: 'fa-pen'
  };

  const typeColors = {
    vacation: 'from-blue-500 to-blue-600',
    sick: 'from-green-500 to-green-600',
    mandatory_forced_leave: 'from-red-500 to-red-600',
    maternity_leave: 'from-pink-500 to-pink-600',
    paternity_leave: 'from-indigo-500 to-indigo-600',
    special_privilege_leave: 'from-yellow-500 to-yellow-600',
    solo_parent_leave: 'from-purple-500 to-purple-600',
    study_leave: 'from-teal-500 to-teal-600',
    vawc_leave: 'from-rose-500 to-rose-600',
    rehabilitation_privilege: 'from-orange-500 to-orange-600',
    special_leave_benefits_women: 'from-fuchsia-500 to-fuchsia-600',
    special_emergency: 'from-amber-500 to-amber-600',
    adoption_leave: 'from-cyan-500 to-cyan-600',
    others_specify: 'from-gray-500 to-gray-600'
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await axios.get('/api/hr/reports', {
          params: { year }
        });

        if (response.data.success) {
          setOverallStats(response.data.overallStats);
          setLeaveTypeSummary(response.data.leaveTypeSummary);
          setEmployeeLedger(response.data.employeeLedger);
          setMonthlyTrends(response.data.monthlyTrends);
          setDepartmentBreakdown(response.data.departmentBreakdown);
        } else {
          setError(response.data.message || 'Failed to fetch reports');
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to fetch reports: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [year]);

  const handleSortLedger = (field) => {
    const direction = ledgerSort.field === field && ledgerSort.direction === 'asc' ? 'desc' : 'asc';
    setLedgerSort({ field, direction });
  };

  const getFilteredAndSortedLedger = () => {
    let filtered = [...employeeLedger];

    if (ledgerSearch) {
      const search = ledgerSearch.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.first_name.toLowerCase().includes(search) ||
        emp.last_name.toLowerCase().includes(search) ||
        emp.user_id.toLowerCase().includes(search) ||
        emp.department.toLowerCase().includes(search)
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[ledgerSort.field];
      const bVal = b[ledgerSort.field];
      if (typeof aVal === 'string') {
        return ledgerSort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return ledgerSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  };

  const getMaxMonthlyValue = () => {
    return Math.max(...monthlyTrends.map(m => Math.max(m.filed, m.approved, 1)), 1);
  };

  if (loading) {
    return (
      <Layout title="Reports" header="Reports">
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Reports" header="Reports">
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
    <Layout title="Reports" header="Reports">
      {/* Year Filter */}
      <div className="card bg-white shadow-lg mb-6">
        <div className="card-body p-4 flex flex-row items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Leave Reports Dashboard</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">Year:</label>
            <select
              className="select select-bordered select-sm"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overall Stats Cards */}
      {overallStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm border border-blue-200">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Leaves Filed</p>
                  <p className="text-3xl font-bold text-blue-800">{overallStats.totalRequests}</p>
                </div>
                <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                  <i className="fas fa-file-alt text-blue-600 text-xl"></i>
                </div>
              </div>
              <p className="text-xs text-blue-500 mt-1">{overallStats.totalDays} total days</p>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 shadow-sm border border-green-200">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Approved</p>
                  <p className="text-3xl font-bold text-green-800">{overallStats.approvedCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600 text-xl"></i>
                </div>
              </div>
              <p className="text-xs text-green-500 mt-1">{overallStats.approvalRate}% approval rate</p>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-sm border border-yellow-200">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending</p>
                  <p className="text-3xl font-bold text-yellow-800">{overallStats.pendingCount}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
                  <i className="fas fa-clock text-yellow-600 text-xl"></i>
                </div>
              </div>
              <p className="text-xs text-yellow-500 mt-1">Awaiting action</p>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-50 to-red-100 shadow-sm border border-red-200">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Disapproved</p>
                  <p className="text-3xl font-bold text-red-800">{overallStats.disapprovedCount}</p>
                </div>
                <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
                  <i className="fas fa-times-circle text-red-600 text-xl"></i>
                </div>
              </div>
              <p className="text-xs text-red-500 mt-1">Rejected requests</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-white shadow-sm mb-6">
        <button
          className={`tab ${activeTab === 'summary' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <i className="fas fa-chart-pie mr-2"></i>Leave Type Summary
        </button>
        <button
          className={`tab ${activeTab === 'trends' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          <i className="fas fa-chart-line mr-2"></i>Monthly Trends
        </button>
        <button
          className={`tab ${activeTab === 'departments' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          <i className="fas fa-building mr-2"></i>Department Breakdown
        </button>
        <button
          className={`tab ${activeTab === 'ledger' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          <i className="fas fa-table mr-2"></i>Employee Ledger
        </button>
      </div>

      {/* Leave Type Summary Tab */}
      {activeTab === 'summary' && (
        <div className="card bg-white shadow-lg mb-6">
          <div className="card-body p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Leave Types Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {leaveTypeSummary.filter(t => t.count > 0).map((item) => (
                <div key={item.type} className="card bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="card-body p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${typeColors[item.type] || 'from-gray-400 to-gray-500'} flex items-center justify-center`}>
                        <i className={`fas ${typeIcons[item.type] || 'fa-calendar'} text-white text-sm`}></i>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{item.label}</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Filed</p>
                        <p className="font-bold text-gray-800">{item.count}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-xs">Days</p>
                        <p className="font-bold text-gray-800">{item.totalDays}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {leaveTypeSummary.filter(t => t.count > 0).length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <i className="fas fa-inbox text-4xl mb-3 text-gray-300"></i>
                <p>No leave records found for {year}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monthly Trends Tab */}
      {activeTab === 'trends' && (
        <div className="card bg-white shadow-lg mb-6">
          <div className="card-body p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly Leave Trends — {year}</h3>
            <div className="space-y-4">
              {monthlyTrends.map((m) => {
                const maxVal = Math.max(getMaxMonthlyValue(), 1);
                return (
                  <div key={m.month} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-gray-700 text-right shrink-0">
                      {m.month}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                            style={{ width: `${Math.max((m.filed / maxVal) * 100, m.filed > 0 ? 8 : 0)}%` }}
                          >
                            {m.filed > 0 && <span className="text-white text-xs font-bold">{m.filed}</span>}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 w-16 shrink-0">{m.daysUsed} days</span>
                      </div>
                      {m.typeBreakdown && Object.keys(m.typeBreakdown).length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-0">
                          {Object.entries(m.typeBreakdown).map(([type, count]) => (
                            <span key={type} className="badge badge-sm bg-gray-100 text-gray-700 border-gray-200">
                              <i className={`fas ${typeIcons[type] || 'fa-calendar'} mr-1 text-xs`}></i>
                              {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Department Breakdown Tab */}
      {activeTab === 'departments' && (
        <div className="card bg-white shadow-lg mb-6">
          <div className="card-body p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Department Breakdown</h3>
            {departmentBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left text-sm font-semibold text-gray-700">Department</th>
                      <th className="text-center text-sm font-semibold text-gray-700">Employees</th>
                      <th className="text-center text-sm font-semibold text-gray-700">Leaves Filed</th>
                      <th className="text-center text-sm font-semibold text-gray-700">Total Days</th>
                      <th className="text-center text-sm font-semibold text-gray-700">Approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentBreakdown.map((dept, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 font-medium text-gray-800">{dept.department}</td>
                        <td className="py-3 text-center text-gray-600">{dept.totalEmployees}</td>
                        <td className="py-3 text-center text-gray-600">{dept.leavesFiled}</td>
                        <td className="py-3 text-center text-gray-600">{dept.totalDays}</td>
                        <td className="py-3 text-center">
                          <span className="badge badge-success badge-sm">{dept.approved}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <i className="fas fa-building text-4xl mb-3 text-gray-300"></i>
                <p>No departments found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="card bg-white shadow-lg mb-6">
          <div className="card-body p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-gray-800">Employee Leave Ledger</h3>
              <input
                type="text"
                placeholder="Search by name, ID, or department..."
                className="input input-bordered input-sm w-full sm:w-72"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th
                      className="text-left text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600"
                      onClick={() => handleSortLedger('last_name')}
                    >
                      Employee {ledgerSort.field === 'last_name' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-700">Department</th>
                    <th
                      className="text-center text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600"
                      onClick={() => handleSortLedger('vacationBalance')}
                    >
                      VL Balance {ledgerSort.field === 'vacationBalance' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="text-center text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600"
                      onClick={() => handleSortLedger('sickBalance')}
                    >
                      SL Balance {ledgerSort.field === 'sickBalance' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="text-center text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600"
                      onClick={() => handleSortLedger('leavesFiled')}
                    >
                      Leaves Filed {ledgerSort.field === 'leavesFiled' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-center text-sm font-semibold text-gray-700">Total Days</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAndSortedLedger().map((emp, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-gray-500">{emp.user_id}</p>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-gray-600">{emp.department}</td>
                      <td className="py-3 text-center">
                        <span className={`font-semibold ${emp.vacationBalance > 0 ? 'text-green-600' : emp.vacationBalance < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {emp.vacationBalance.toFixed(3)}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`font-semibold ${emp.sickBalance > 0 ? 'text-green-600' : emp.sickBalance < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {emp.sickBalance.toFixed(3)}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="badge badge-sm badge-info">{emp.leavesFiled}</span>
                      </td>
                      <td className="py-3 text-center text-sm text-gray-600">{emp.totalDaysFiled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {getFilteredAndSortedLedger().length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <i className="fas fa-users text-4xl mb-3 text-gray-300"></i>
                  <p>No employees found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default HRReports;
