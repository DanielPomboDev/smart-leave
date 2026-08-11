import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login.jsx';
import EmployeeDashboard from './components/EmployeeDashboard.jsx';
import DepartmentDashboard from './components/DepartmentDashboard.jsx';
import DepartmentLeaveRequests from './components/DepartmentLeaveRequests.jsx';
import DepartmentLeaveRequestDetails from './components/DepartmentLeaveRequestDetails.jsx';
import RequestLeave from './components/RequestLeave.jsx';
import RequestLeaveAdvanced from './components/RequestLeaveAdvanced.jsx';
import LeaveHistory from './components/LeaveHistory.jsx';
import Profile from './components/Profile.jsx';
import Settings from './components/Settings.jsx';
import LeaveRequestDetails from './components/LeaveRequestDetails.jsx';
import HRDashboard from './components/HRDashboard.jsx';
import HRLeaveRequests from './components/HRLeaveRequests.jsx';
import HRLeaveRequestDetails from './components/HRLeaveRequestDetails.jsx';
import HREmployees from './components/HREmployees.jsx';
import HRLeaveRecord from './components/HRLeaveRecord.jsx';
import HRLeaveRecords from './components/HRLeaveRecords.jsx';
import HRReports from './components/HRReports.jsx';
import HRHolidays from './components/HRHolidays.jsx';
import HRCalendar from './components/HRCalendar.jsx';
import MayorDashboard from './components/MayorDashboard.jsx';
import MayorLeaveRequests from './components/MayorLeaveRequests.jsx';
import MayorLeaveRequestDetails from './components/MayorLeaveRequestDetails.jsx';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/department/dashboard" element={<DepartmentDashboard />} />
          <Route path="/department/leave-requests" element={<DepartmentLeaveRequests />} />
          <Route path="/department/leave-request/:id" element={<DepartmentLeaveRequestDetails />} />
          <Route path="/employee/request-leave" element={<RequestLeave />} />
          <Route path="/employee/leave-history" element={<LeaveHistory />} />
          <Route path="/employee/profile" element={<Profile />} />
          <Route path="/employee/settings" element={<Settings />} />
          <Route path="/employee/leave-request/:id" element={<LeaveRequestDetails />} />
          <Route path="/hr/dashboard" element={<HRDashboard />} />
          <Route path="/hr/employees" element={<HREmployees />} />
          <Route path="/hr/leave-requests" element={<HRLeaveRequests />} />
          <Route path="/hr/leave-request/:id" element={<HRLeaveRequestDetails />} />
          <Route path="/hr/leave-records" element={<HRLeaveRecords />} />
          <Route path="/hr/leave-record/:id" element={<HRLeaveRecord />} />
          <Route path="/hr/reports" element={<HRReports />} />
          <Route path="/hr/holidays" element={<HRHolidays />} />
          <Route path="/hr/calendar" element={<HRCalendar />} />
          <Route path="/department/calendar" element={<HRCalendar />} />
          <Route path="/mayor/dashboard" element={<MayorDashboard />} />
          <Route path="/mayor/leave-requests" element={<MayorLeaveRequests />} />
          <Route path="/mayor/leave-requests/:id" element={<MayorLeaveRequestDetails />} />
          
          {/* Role-based leave request routes */}
          <Route path="/department_admin/request-leave" element={<RequestLeaveAdvanced />} />
          <Route path="/hr/request-leave" element={<RequestLeaveAdvanced />} />
          <Route path="/mayor/request-leave" element={<RequestLeaveAdvanced />} />
          
          {/* Role-based leave history routes */}
          <Route path="/department_admin/leave-history" element={<LeaveHistory />} />
          <Route path="/hr/leave-history" element={<LeaveHistory />} />
          <Route path="/mayor/leave-history" element={<LeaveHistory />} />
          
          {/* Role-based leave request details routes */}
          <Route path="/department_admin/leave-request/:id" element={<LeaveRequestDetails />} />
          <Route path="/hr/leave-request/:id" element={<LeaveRequestDetails />} />
          <Route path="/mayor/leave-request/:id" element={<LeaveRequestDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;