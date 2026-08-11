import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';
import { toDateStr } from '../utils/leaveDays';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_META = {
  approved: { label: 'Approved', chip: 'bg-green-100 text-green-800 border-green-300' },
  hr_approved: { label: 'HR Approved', chip: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  recommended: { label: 'Recommended', chip: 'bg-blue-100 text-blue-800 border-blue-300' },
  pending: { label: 'Pending', chip: 'bg-gray-100 text-gray-600 border-gray-300' }
};

const TYPE_ABBREV = {
  vacation: 'VL', sick: 'SL', mandatory_forced_leave: 'MFL', maternity_leave: 'ML',
  paternity_leave: 'PL', special_privilege_leave: 'SPL', solo_parent_leave: 'SPL2',
  study_leave: 'StL', vawc_leave: 'VAWC', rehabilitation_privilege: 'RHb',
  special_leave_benefits_women: 'SLW', special_emergency: 'SE', adoption_leave: 'AL',
  monetization: 'Mtz', terminal_leave: 'TL', others_specify: 'Oth'
};

const HRCalendar = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [department, setDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/hr/departments');
      if (response.data.success) setDepartments(response.data.departments || []);
    } catch (err) {
      // Non-HR roles (e.g. department admin) can't read the HR department list;
      // fall back to their own department from the profile.
      try {
        const profile = await axios.get('/api/auth/profile');
        const dept = profile.data.user?.department_id;
        if (dept && dept._id) {
          setDepartments([{ _id: dept._id, name: dept.name || 'My Department' }]);
        }
      } catch (profileErr) {
        console.error('Error fetching departments:', err);
      }
    }
  };

  const fetchCalendar = async (m = month, y = year, dept = department) => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/leave-requests/calendar', {
        params: { month: m, year: y, department_id: dept }
      });
      if (response.data.success) {
        setEvents(response.data.events || []);
      } else {
        setError(response.data.message || 'Failed to fetch calendar');
      }
    } catch (err) {
      setError('Failed to fetch calendar: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
    fetchCalendar(m, y, department);
  };

  const changeDepartment = (dept) => {
    setDepartment(dept);
    fetchCalendar(month, year, dept);
  };

  // Build the calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = firstDay.getDay();

  const eventsByDate = {};
  events.forEach(ev => {
    const start = new Date(ev.start_date);
    const end = new Date(ev.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === year && d.getMonth() === month - 1) {
        const key = toDateStr(d);
        if (!eventsByDate[key]) eventsByDate[key] = [];
        eventsByDate[key].push(ev);
      }
    }
  });

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month - 1, day));
  }

  return (
    <Layout title="Leave Calendar">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Who's On Leave</h1>
            <p className="text-sm text-gray-500 mt-1">Approved and in-progress leave requests across the office.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="select select-bordered select-sm"
              value={department}
              onChange={(e) => changeDepartment(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
            <div className="flex items-center gap-1">
              <button className="btn btn-outline btn-sm" onClick={() => changeMonth(-1)}><i className="fas fa-chevron-left"></i></button>
              <span className="font-semibold text-gray-700 min-w-32 text-center">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <button className="btn btn-outline btn-sm" onClick={() => changeMonth(1)}><i className="fas fa-chevron-right"></i></button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-gray-600">
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded-full border ${meta.chip.split(' ')[0]}`}></span>
              {meta.label}
            </span>
          ))}
          <span className="ml-auto text-gray-400">Non-working weekends shown in gray</span>
        </div>

        {error && <div className="alert alert-error shadow-lg mb-4"><span>{error}</span></div>}

        {loading ? (
          <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg text-primary"></span></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {WEEKDAY_HEADERS.map((h, i) => (
                <div key={h} className={`py-2 text-center text-xs font-semibold text-gray-600 ${i === 0 || i === 6 ? 'text-red-400' : ''}`}>{h}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="min-h-24 bg-gray-50/50 border-b border-r border-gray-100"></div>;
                const key = toDateStr(date);
                const dayEvents = eventsByDate[key] || [];
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isToday = key === toDateStr(new Date());
                return (
                  <div
                    key={key}
                    className={`min-h-24 border-b border-r border-gray-100 p-1 ${isWeekend ? 'bg-gray-50' : ''} ${isToday ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : ''}`}
                  >
                    <div className={`text-xs font-semibold mb-1 ${isWeekend ? 'text-gray-400' : 'text-gray-700'} ${isToday ? 'text-blue-700' : ''}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 4).map((ev, j) => {
                        const meta = STATUS_META[ev.status] || STATUS_META.pending;
                        return (
                          <div
                            key={`${ev._id}-${j}`}
                            className={`text-[10px] leading-tight rounded px-1 py-0.5 border truncate ${meta.chip}`}
                            title={`${ev.employee_name} — ${ev.leave_type} (${ev.start_date?.slice(0, 10)} to ${ev.end_date?.slice(0, 10)})`}
                          >
                            {TYPE_ABBREV[ev.leave_type] || 'Lv'} · {ev.employee_name.split(' ')[0]}
                          </div>
                        );
                      })}
                      {dayEvents.length > 4 && (
                        <div className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 4} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HRCalendar;
