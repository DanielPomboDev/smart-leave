import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';

const HRReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [deptFilter, setDeptFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerSort, setLedgerSort] = useState({ field: 'totalDaysFiled', direction: 'desc' });
  const [activeTab, setActiveTab] = useState('departments');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

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
    paternity_leave: 'fa-child',
    special_privilege_leave: 'fa-star',
    solo_parent_leave: 'fa-person',
    study_leave: 'fa-graduation-cap',
    vawc_leave: 'fa-shield',
    rehabilitation_privilege: 'fa-hand-holding-medical',
    special_leave_benefits_women: 'fa-venus',
    special_emergency: 'fa-house-crack',
    adoption_leave: 'fa-hand-holding-heart',
    wellness_leave: 'fa-heart-pulse',
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
    wellness_leave: 'lime',
    monetization: 'lime',
    terminal_leave: 'slate',
    others_specify: 'gray'
  };

  const getColorChip = (color) => {
    const map = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      orange: 'bg-orange-100 text-orange-600',
      pink: 'bg-pink-100 text-pink-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      purple: 'bg-purple-100 text-purple-600',
      teal: 'bg-teal-100 text-teal-600',
      rose: 'bg-rose-100 text-rose-600',
      amber: 'bg-amber-100 text-amber-600',
      fuchsia: 'bg-fuchsia-100 text-fuchsia-600',
      red: 'bg-red-100 text-red-600',
      cyan: 'bg-cyan-100 text-cyan-600',
      lime: 'bg-lime-100 text-lime-600',
      slate: 'bg-slate-100 text-slate-600',
      gray: 'bg-gray-100 text-gray-600'
    };
    return map[color] || map.gray;
  };

  const getBarColor = (color) => {
    const map = {
      blue: 'bg-blue-500', green: 'bg-green-500', orange: 'bg-orange-500',
      pink: 'bg-pink-500', indigo: 'bg-indigo-500', yellow: 'bg-yellow-500',
      purple: 'bg-purple-500', teal: 'bg-teal-500', rose: 'bg-rose-500',
      amber: 'bg-amber-500', fuchsia: 'bg-fuchsia-500', red: 'bg-red-500',
      cyan: 'bg-cyan-500', lime: 'bg-lime-500', slate: 'bg-slate-500',
      gray: 'bg-gray-500'
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

  const csvCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const downloadCsv = (filename, csv) => {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ledgerRows = () => getFilteredAndSortedLedger().map(e => [
    e.user_id, e.last_name, e.first_name, e.department, e.position,
    e.leavesFiled, e.approvedLeaves, e.inProgressLeaves, e.disapprovedLeaves,
    e.totalDaysFiled, e.vacationBalance, e.sickBalance
  ]);

  const exportLedgerCSV = () => {
    const headers = ['Employee ID', 'Last Name', 'First Name', 'Department', 'Position',
      'Leaves Filed', 'Approved', 'In Progress', 'Disapproved', 'Working Days Filed',
      'Vacation Balance', 'Sick Balance'];
    const csv = [headers, ...ledgerRows()].map(r => r.map(csvCell).join(',')).join('\n');
    downloadCsv(`leave-ledger-${year}${deptFilter !== 'all' ? '-filtered' : ''}.csv`, csv);
  };

  const exportFullReportCSV = () => {
    const deptName = deptFilter !== 'all'
      ? (departments.find(d => d._id === deptFilter)?.name || deptFilter)
      : 'All Departments';
    const block = (title, headers, rows) =>
      [title, headers.map(csvCell).join(','), ...rows.map(r => r.map(csvCell).join(','))].join('\n');

    const blocks = [];
    blocks.push(block('SUMMARY', ['Metric', 'Value'], [
      ['Year', year],
      ['Department', deptName],
      ['Total Filed', overallStats.totalRequests],
      ['Working Days Filed', overallStats.totalDays],
      ['Without Pay', overallStats.withoutPayCount],
      ['Approved', overallStats.approvedCount],
      ['Approval Rate', `${overallStats.approvalRate}% of decided requests`],
      ['For HR Review (recommended)', overallStats.recommendedCount],
      ['For Mayor (HR-approved)', overallStats.hrApprovedCount],
      ['Pending', overallStats.pendingCount],
      ['Disapproved', overallStats.disapprovedCount]
    ]));

    blocks.push(block('LEAVE TYPES USED', ['Leave Type', 'Requests', 'Working Days', 'Share %'],
      leaveTypeSummary.map(t => [
        t.label, t.count, t.totalDays,
        overallStats.totalRequests > 0 ? Math.round((t.count / overallStats.totalRequests) * 100) + '%' : '0%'
      ])));

    blocks.push(block(`MONTHLY TREND ${year}`, ['Month', 'Filed', 'Approved', 'Working Days'],
      monthlyTrends.map(m => [`${m.month} ${m.year}`, m.filed, m.approved, m.daysUsed])));

    blocks.push(block('DEPARTMENT BREAKDOWN',
      ['Department', 'Employees', 'Filed', 'Approved', 'In Progress', 'Disapproved', 'Working Days'],
      departmentBreakdown.map(d => [
        d.department, d.totalEmployees, d.leavesFiled, d.approved, d.inProgress, d.disapproved, d.totalDays
      ])));

    blocks.push(block('EMPLOYEE LEDGER',
      ['Employee ID', 'Last Name', 'First Name', 'Department', 'Position',
        'Leaves Filed', 'Approved', 'In Progress', 'Disapproved', 'Working Days Filed',
        'Vacation Balance', 'Sick Balance'],
      ledgerRows()));

    downloadCsv(`leave-report-${year}${deptFilter !== 'all' ? '-filtered' : ''}.csv`, blocks.join('\n\n'));
  };

  const formatBal = (val) => Number(val ?? 0).toFixed(3);

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

  const hasData = overallStats && overallStats.totalRequests > 0;

  // Ranked leave types (by number of requests)
  const rankedTypes = [...leaveTypeSummary]
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count);

  // Monthly trend bars
  const maxFiled = Math.max(...monthlyTrends.map(m => m.filed), 1);

  const KpiCard = ({ label, value, sub, icon, chip, valueClass }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${chip} flex items-center justify-center shrink-0`}>
          <i className={`fas ${icon} text-sm`}></i>
        </div>
      </div>
      <p className={`mt-2 text-2xl font-bold ${valueClass || 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1 leading-snug">{sub}</p>}
    </div>
  );

  return (
    <Layout title="Leave Reports">
      {/* ===== Header / Filters ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              <i className="fas fa-chart-bar text-blue-500 mr-2"></i>
              Leave Reports
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Yearly summary of leave applications, approvals, and employee leave credits.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 whitespace-nowrap">Department:</label>
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
              <label className="text-sm text-gray-500 whitespace-nowrap">Year:</label>
              <select
                className="select select-bordered select-sm"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2, new Date().getFullYear() - 3, new Date().getFullYear() - 4].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {hasData && (
              <div className="relative">
                <button
                  onClick={() => setExportMenuOpen(o => !o)}
                  className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none"
                >
                  <i className="fas fa-download mr-1.5"></i>
                  Export CSV
                  <i className={`fas fa-chevron-down ml-1 text-xs opacity-80 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`}></i>
                </button>
                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setExportMenuOpen(false)}></div>
                    <ul className="absolute right-0 mt-2 z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-1.5 min-w-56">
                      <li>
                        <button
                          onClick={() => { exportLedgerCSV(); setExportMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 flex items-center gap-2"
                        >
                          <i className="fas fa-table text-blue-500 w-4"></i>
                          Employee Ledger
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => { exportFullReportCSV(); setExportMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 flex items-center gap-2"
                        >
                          <i className="fas fa-file-lines text-green-500 w-4"></i>
                          Full Report (all sections)
                        </button>
                      </li>
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-14 text-center">
          <i className="fas fa-inbox text-5xl text-gray-300 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-600 mb-1">No Leave Records</h3>
          <p className="text-sm text-gray-500">
            No leave requests found for {year}{deptFilter !== 'all' ? ' in the selected department' : ''}.
          </p>
        </div>
      ) : (
        <>
          {/* ===== KPI Cards ===== */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            <KpiCard
              label="Total Filed"
              value={overallStats.totalRequests}
              sub={`${overallStats.totalDays} working days • ${overallStats.withoutPayCount} without pay`}
              icon="fa-file-lines" chip="bg-blue-100 text-blue-600"
            />
            <KpiCard
              label="Approved"
              value={overallStats.approvedCount}
              sub={`${overallStats.approvalRate}% of decided requests`}
              icon="fa-check-circle" chip="bg-green-100 text-green-600" valueClass="text-green-600"
            />
            <KpiCard
              label="For HR Review"
              value={overallStats.recommendedCount}
              sub="Recommended by dept head"
              icon="fa-clipboard-list" chip="bg-amber-100 text-amber-600"
            />
            <KpiCard
              label="For Mayor"
              value={overallStats.hrApprovedCount}
              sub="HR-approved, awaiting mayor"
              icon="fa-landmark" chip="bg-indigo-100 text-indigo-600"
            />
            <KpiCard
              label="Pending"
              value={overallStats.pendingCount}
              sub="Awaiting dept head"
              icon="fa-clock" chip="bg-yellow-100 text-yellow-600"
            />
            <KpiCard
              label="Disapproved"
              value={overallStats.disapprovedCount}
              sub="Rejected requests"
              icon="fa-xmark-circle" chip="bg-red-100 text-red-600" valueClass="text-red-600"
            />
          </div>

          {/* ===== Leave Types + Monthly Trend (stacked full-width so neither stretches the other) ===== */}
          <div className="space-y-6 mb-6">
            {/* Leave Type Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-800">
                  <i className="fas fa-list-check text-blue-500 mr-2"></i>
                  Leave Types Used
                </h3>
                <span className="text-xs text-gray-400">{rankedTypes.length} types</span>
              </div>
              {rankedTypes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {rankedTypes.map(item => {
                    const share = overallStats.totalRequests > 0
                      ? Math.round((item.count / overallStats.totalRequests) * 100)
                      : 0;
                    const color = typeColors[item.type] || 'gray';
                    return (
                      <div
                        key={item.type}
                        title={`${item.label}: ${item.count} request(s), ${item.totalDays} working day(s), ${share}% of total`}
                        className="bg-white border border-gray-100 rounded-lg p-3 hover:border-blue-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-7 h-7 rounded-lg ${getColorChip(color)} flex items-center justify-center shrink-0`}>
                            <i className={`fas ${typeIcons[item.type] || 'fa-calendar'} text-xs`}></i>
                          </div>
                          <p className="text-xs font-semibold text-gray-700 truncate">{item.label}</p>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg font-bold text-gray-800 leading-none">{item.count}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{item.totalDays} working days</p>
                          </div>
                          <span className="text-[10px] font-medium text-gray-400">{share}%</span>
                        </div>
                        <div className="mt-2 bg-gray-100 rounded-full h-1 overflow-hidden">
                          <div className={`h-full ${getBarColor(color)} rounded-full`} style={{ width: `${Math.max(share, 3)}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-6 text-sm">No leave types used this period</p>
              )}
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-800 mb-4">
                <i className="fas fa-chart-line text-blue-500 mr-2"></i>
                Monthly Trend — {year}
              </h3>
              <div className="h-52">
                <div className="flex items-end justify-between gap-3 h-full px-2">
                  {monthlyTrends.map(m => {
                    // Pixel heights (not %) so the bars always scale correctly
                    const barHeight = m.filed > 0 ? Math.max(Math.round((m.filed / maxFiled) * 150), 6) : 0;
                    return (
                      <div
                        key={m.month}
                        className="flex-1 flex flex-col items-center justify-end h-full group"
                        title={`${m.month} ${m.year}: ${m.filed} filed, ${m.approved} approved, ${m.daysUsed} working days`}
                      >
                        <span className={`text-[10px] font-semibold mb-1 ${m.filed > 0 ? 'text-gray-700' : 'text-gray-300'}`}>{m.filed > 0 ? m.filed : ''}</span>
                        <div
                          className={`w-full max-w-10 rounded-t-md transition-colors ${m.filed > 0
                            ? 'bg-gradient-to-t from-blue-500 to-blue-400 group-hover:from-blue-600 group-hover:to-blue-500'
                            : 'bg-gray-100'}`}
                          style={{ height: `${barHeight}px` }}
                        ></div>
                        <span className={`text-[9px] mt-1.5 ${m.filed > 0 ? 'text-gray-500' : 'text-gray-300'}`}>{m.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center">
                Leave requests filed per month · {overallStats.totalRequests} total
              </p>
            </div>
          </div>

          {/* ===== Department / Employee tabs ===== */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 mb-6 inline-flex gap-1">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'departments' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('departments')}
            >
              <i className="fas fa-building mr-1.5"></i>
              Department Breakdown
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'ledger' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('ledger')}
            >
              <i className="fas fa-users mr-1.5"></i>
              Employee Ledger
            </button>
          </div>

          {/* ===== Department Breakdown ===== */}
          {activeTab === 'departments' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">
              <i className="fas fa-building text-blue-500 mr-2"></i>
              Department Breakdown
            </h3>
            {departmentBreakdown.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...departmentBreakdown].sort((a, b) => b.totalDays - a.totalDays).map((dept, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <i className="fas fa-building text-lg"></i>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 truncate">{dept.department}</p>
                          <p className="text-xs text-gray-500">{dept.totalEmployees} employees</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-indigo-600 leading-none">{dept.totalDays}</p>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">work days</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Filed', value: dept.leavesFiled, cls: 'text-blue-700 bg-blue-50' },
                        { label: 'Approved', value: dept.approved, cls: 'text-green-700 bg-green-50' },
                        { label: 'In Progress', value: dept.inProgress, cls: 'text-amber-700 bg-amber-50' },
                        { label: 'Disapproved', value: dept.disapproved, cls: 'text-red-700 bg-red-50' }
                      ].map(s => (
                        <div key={s.label} className={`rounded-lg p-2.5 text-center ${s.cls}`}>
                          <p className="text-xl font-bold leading-none">{s.value}</p>
                          <p className="text-[9px] uppercase tracking-wide opacity-70 mt-1 leading-tight">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-6 text-sm">No department activity this year</p>
            )}
          </div>

          )}

          {/* ===== Employee Ledger ===== */}
          {activeTab === 'ledger' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  <i className="fas fa-users text-blue-500 mr-2"></i>
                  Employee Leave Ledger
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Leave activity and current vacation / sick credit balances
                </p>
              </div>
              <input
                type="text"
                placeholder="Search name, ID, department..."
                className="input input-bordered input-sm w-full sm:w-72"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50/60">
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSortLedger('last_name')}>
                      Employee {ledgerSort.field === 'last_name' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3">Department</th>
                    <th className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSortLedger('leavesFiled')}>
                      Filed {ledgerSort.field === 'leavesFiled' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSortLedger('approvedLeaves')}>
                      Approved {ledgerSort.field === 'approvedLeaves' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3">In Progress</th>
                    <th className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSortLedger('totalDaysFiled')}>
                      Work Days {ledgerSort.field === 'totalDaysFiled' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSortLedger('vacationBalance')}>
                      VL Balance {ledgerSort.field === 'vacationBalance' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSortLedger('sickBalance')}>
                      SL Balance {ledgerSort.field === 'sickBalance' && (ledgerSort.direction === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAndSortedLedger().map((emp, idx) => {
                    const initials = `${(emp.first_name || '')[0] || ''}${(emp.last_name || '')[0] || ''}`.toUpperCase();
                    const countPill = (value, tone) => {
                      const tones = {
                        blue: 'bg-blue-50 text-blue-700 border-blue-200',
                        green: 'bg-green-50 text-green-700 border-green-200',
                        amber: 'bg-amber-50 text-amber-700 border-amber-200',
                        red: 'bg-red-50 text-red-700 border-red-200'
                      };
                      return (
                        <span className={`inline-flex items-center justify-center min-w-9 px-2.5 py-1 rounded-lg border text-sm font-bold ${tones[tone]}`}>
                          {value}
                        </span>
                      );
                    };
                    const balPill = (value, isVacation) => {
                      const low = value < 1;
                      const tone = low
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : isVacation
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      return (
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg border text-sm font-bold ${tone}`}>
                          {formatBal(value)}
                        </span>
                      );
                    };
                    return (
                      <tr key={idx} className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-gray-800 truncate">{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-gray-400 truncate">{emp.user_id} · {emp.position || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">{emp.department}</td>
                        <td className="px-4 py-3.5 text-center">{countPill(emp.leavesFiled, 'blue')}</td>
                        <td className="px-4 py-3.5 text-center">{countPill(emp.approvedLeaves, 'green')}</td>
                        <td className="px-4 py-3.5 text-center">
                          {emp.inProgressLeaves > 0 ? countPill(emp.inProgressLeaves, 'amber') : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center text-base font-bold text-gray-800">{emp.totalDaysFiled}</td>
                        <td className="px-4 py-3.5 text-center">{balPill(emp.vacationBalance, true)}</td>
                        <td className="px-4 py-3.5 text-center">{balPill(emp.sickBalance, false)}</td>
                      </tr>
                    );
                  })}
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
