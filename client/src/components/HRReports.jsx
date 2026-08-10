import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';

const HRReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState('summary');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerSort, setLedgerSort] = useState({ field: 'leavesFiled', direction: 'desc' });
  const [deptFilter, setDeptFilter] = useState('all');
  const [departments, setDepartments] = useState([]);

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
    monetization: 'fa-coins',
    terminal_leave: 'fa-flag-checkered',
    others_specify: 'fa-pen'
  };

  const typeColors = {
    vacation: 'blue',
    sick: 'green',
    mandatory_forced_leave: 'orange',
    maternity_leave: 'pink',
    paternity_leave: 'indigo',
    special_privilege_leave: 'yellow',
    solo_parent_leave: 'purple',
    study_leave: 'teal',
    vawc_leave: 'rose',
    rehabilitation_privilege: 'amber',
    special_leave_benefits_women: 'fuchsia',
    special_emergency: 'red',
    adoption_leave: 'cyan',
    monetization: 'lime',
    terminal_leave: 'slate',
    others_specify: 'gray'
  };

  const getColorBg = (color) => {
    const map = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      orange: 'bg-orange-50 border-orange-200',
      pink: 'bg-pink-50 border-pink-200',
      indigo: 'bg-indigo-50 border-indigo-200',
      yellow: 'bg-yellow-50 border-yellow-200',
      purple: 'bg-purple-50 border-purple-200',
      teal: 'bg-teal-50 border-teal-200',
      rose: 'bg-rose-50 border-rose-200',
      amber: 'bg-amber-50 border-amber-200',
      fuchsia: 'bg-fuchsia-50 border-fuchsia-200',
      red: 'bg-red-50 border-red-200',
      cyan: 'bg-cyan-50 border-cyan-200',
      lime: 'bg-lime-50 border-lime-200',
      slate: 'bg-slate-50 border-slate-200',
      gray: 'bg-gray-50 border-gray-200'
    };
    return map[color] || map.gray;
  };

  const getColorText = (color) => {
    const map = {
      blue: 'text-blue-700',
      green: 'text-green-700',
      orange: 'text-orange-700',
      pink: 'text-pink-700',
      indigo: 'text-indigo-700',
      yellow: 'text-yellow-700',
      purple: 'text-purple-700',
      teal: 'text-teal-700',
      rose: 'text-rose-700',
      amber: 'text-amber-700',
      fuchsia: 'text-fuchsia-700',
      red: 'text-red-700',
      cyan: 'text-cyan-700',
      lime: 'text-lime-700',
      slate: 'text-slate-700',
      gray: 'text-gray-700'
    };
    return map[color] || map.gray;
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get('/api/hr/departments');
        if (res.data.success) setDepartments(res.data.departments);
      } catch (e) {
        console.error('Error fetching departments:', e);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError('');
        const params = { year };
        if (deptFilter !== 'all') params.department = deptFilter;

        const response = await axios.get('/api/hr/reports', { params });

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
  }, [year, deptFilter]);

  const handleSortLedger = (field) => {
    const direction = ledgerSort.field === field && ledgerSort.direction === 'asc' ? 'desc' : 'asc';
    setLedgerSort({ field, direction });
  };

  const getFilteredAndSortedLedger = () => {
    let filtered = [...employeeLedger];

    if (ledgerSearch) {
      const search = ledgerSearch.toLowerCase();
      filtered = filtered.filter(emp =>
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search) ||
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

  if (loading) {
    return (
      <Layout title="Reports">
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Reports">
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Reports">
      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-800">
            <i className="fas fa-chart-bar text-blue-500 mr-2"></i>
            Leave Reports
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Department:</label>
              <select
                className="select select-bordered select-sm"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Year:</label>
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
      </div>

      {/* Stats Cards */}
      {overallStats && overallStats.totalRequests > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-600">Total Filed</p>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="fas fa-file-alt text-blue-500 text-sm"></i>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{overallStats.totalRequests}</p>
            <p className="text-xs text-gray-500 mt-1">{overallStats.totalDays} days</p>
          </div>

          <div className="bg-white rounded-lg border border-green-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-600">Approved</p>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <i className="fas fa-check-circle text-green-500 text-sm"></i>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{overallStats.approvedCount}</p>
            <p className="text-xs text-green-600 mt-1">{overallStats.approvalRate}% rate</p>
          </div>

          <div className="bg-white rounded-lg border border-yellow-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-yellow-600">Pending</p>
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <i className="fas fa-clock text-yellow-500 text-sm"></i>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{overallStats.pendingCount}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting action</p>
          </div>

          <div className="bg-white rounded-lg border border-red-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-red-600">Disapproved</p>
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <i className="fas fa-times-circle text-red-500 text-sm"></i>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{overallStats.disapprovedCount}</p>
            <p className="text-xs text-gray-500 mt-1">Rejected</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {overallStats && overallStats.totalRequests === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center mb-6">
          <i className="fas fa-inbox text-5xl text-gray-300 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-600 mb-1">No Leave Records</h3>
          <p className="text-sm text-gray-500">No leave requests found for {year}{deptFilter !== 'all' ? ' in the selected department' : ''}.</p>
        </div>
      )}

      {/* Tabs */}
      {overallStats && overallStats.totalRequests > 0 && (
        <>
          <div className="tabs tabs-boxed bg-white shadow-sm border border-gray-200 mb-6">
            {[
              { id: 'summary', icon: 'fa-chart-pie', label: 'By Leave Type' },
              { id: 'trends', icon: 'fa-chart-line', label: 'Monthly Trends' },
              { id: 'departments', icon: 'fa-building', label: 'Departments' },
              { id: 'ledger', icon: 'fa-table', label: 'Employee Ledger' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`tab tab-sm flex-grow ${activeTab === tab.id ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`fas ${tab.icon} mr-1`}></i>{tab.label}
              </button>
            ))}
          </div>

          {/* Leave Type Summary */}
          {activeTab === 'summary' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Leave Types Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {leaveTypeSummary.filter(t => t.count > 0).map((item) => (
                  <div key={item.type} className={`rounded-lg border p-4 ${getColorBg(typeColors[item.type])}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                        <i className={`fas ${typeIcons[item.type] || 'fa-calendar'} ${getColorText(typeColors[item.type])} text-sm`}></i>
                      </div>
                      <p className="font-semibold text-gray-800 text-xs leading-tight">{item.label}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-gray-500">Filed</p>
                        <p className={`text-xl font-bold ${getColorText(typeColors[item.type])}`}>{item.count}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Days</p>
                        <p className={`text-sm font-bold ${getColorText(typeColors[item.type])}`}>{item.totalDays}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Trends */}
          {activeTab === 'trends' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly Trends — {year}</h3>
              <div className="space-y-3">
                {(() => {
                  const maxFiled = Math.max(...monthlyTrends.map(t => t.filed), 1);
                  return monthlyTrends.map((m) => {
                    const pct = m.filed > 0 ? Math.max((m.filed / maxFiled) * 100, 3) : 0;
                    return (
                      <div key={m.month} className="flex items-center gap-3">
                        <div className="w-10 text-xs font-medium text-gray-500 text-right shrink-0">
                          {m.month}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                              <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              >
                                {m.filed > 0 && <span className="text-white text-xs font-bold">{m.filed}</span>}
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 w-14 shrink-0 text-right">{m.daysUsed}d</span>
                          </div>
                          {m.typeBreakdown && Object.keys(m.typeBreakdown).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(m.typeBreakdown).map(([type, count]) => (
                                <span key={type} className="badge badge-xs bg-gray-100 border-gray-200 text-gray-600">
                                  {count}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Department Breakdown */}
          {activeTab === 'departments' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Department Breakdown</h3>
              {departmentBreakdown.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left text-xs font-semibold text-gray-600">Department</th>
                        <th className="text-center text-xs font-semibold text-gray-600">Employees</th>
                        <th className="text-center text-xs font-semibold text-gray-600">Filed</th>
                        <th className="text-center text-xs font-semibold text-gray-600">Approved</th>
                        <th className="text-center text-xs font-semibold text-gray-600">Pending</th>
                        <th className="text-center text-xs font-semibold text-gray-600">Total Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentBreakdown.sort((a, b) => b.totalDays - a.totalDays).map((dept, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2.5 font-medium text-sm text-gray-800">{dept.department}</td>
                          <td className="py-2.5 text-center text-sm text-gray-600">{dept.totalEmployees}</td>
                          <td className="py-2.5 text-center">
                            <span className="badge badge-sm badge-info">{dept.leavesFiled}</span>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="badge badge-sm badge-success">{dept.approved}</span>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="badge badge-sm badge-warning">{dept.pending}</span>
                          </td>
                          <td className="py-2.5 text-center text-sm font-medium text-gray-700">{dept.totalDays}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8 text-sm">No department activity this year</p>
              )}
            </div>
          )}

          {/* Employee Ledger */}
          {activeTab === 'ledger' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-gray-800">Employee Leave Ledger</h3>
                <input
                  type="text"
                  placeholder="Search name, ID, department..."
                  className="input input-bordered input-sm w-full sm:w-64"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th
                        className="text-left text-xs font-semibold text-gray-600 cursor-pointer hover:text-blue-600 select-none"
                        onClick={() => handleSortLedger('last_name')}
                      >
                        Employee {ledgerSort.field === 'last_name' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-600">Department</th>
                      <th
                        className="text-center text-xs font-semibold text-gray-600 cursor-pointer hover:text-blue-600 select-none"
                        onClick={() => handleSortLedger('leavesFiled')}
                      >
                        Filed {ledgerSort.field === 'leavesFiled' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-center text-xs font-semibold text-gray-600 cursor-pointer hover:text-blue-600 select-none"
                        onClick={() => handleSortLedger('approvedLeaves')}
                      >
                        Approved {ledgerSort.field === 'approvedLeaves' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-center text-xs font-semibold text-gray-600 cursor-pointer hover:text-blue-600 select-none"
                        onClick={() => handleSortLedger('pendingLeaves')}
                      >
                        Pending {ledgerSort.field === 'pendingLeaves' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-center text-xs font-semibold text-gray-600 cursor-pointer hover:text-blue-600 select-none"
                        onClick={() => handleSortLedger('totalDaysFiled')}
                      >
                        Days {ledgerSort.field === 'totalDaysFiled' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredAndSortedLedger().map((emp, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5">
                          <p className="font-medium text-sm text-gray-800">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-gray-400">{emp.user_id}</p>
                        </td>
                        <td className="py-2.5 text-xs text-gray-600">{emp.department}</td>
                        <td className="py-2.5 text-center">
                          <span className="badge badge-sm badge-info">{emp.leavesFiled}</span>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="badge badge-sm badge-success">{emp.approvedLeaves}</span>
                        </td>
                        <td className="py-2.5 text-center">
                          {emp.pendingLeaves > 0 ? (
                            <span className="badge badge-sm badge-warning">{emp.pendingLeaves}</span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-center text-sm font-medium text-gray-700">{emp.totalDaysFiled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredAndSortedLedger().length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <i className="fas fa-search text-2xl text-gray-300 mb-2 block"></i>
                    No matching employees found
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default HRReports;
