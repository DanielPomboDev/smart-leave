import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import EmployeeDashboard from './components/EmployeeDashboard';
import DepartmentDashboard from './components/DepartmentDashboard';
import DepartmentLeaveRequests from './components/DepartmentLeaveRequests';
import DepartmentLeaveRequestDetails from './components/DepartmentLeaveRequestDetails';
import RequestLeave from './components/RequestLeave';
import RequestLeaveAdvanced from './components/RequestLeaveAdvanced';
import LeaveHistory from './components/LeaveHistory';
import Profile from './components/Profile';
import Settings from './components/Settings';
import LeaveRequestDetails from './components/LeaveRequestDetails';
import HRDashboard from './components/HRDashboard';
import HRLeaveRequests from './components/HRLeaveRequests';
import HRLeaveRequestDetails from './components/HRLeaveRequestDetails';
import HREmployees from './components/HREmployees';
import HRLeaveRecord from './components/HRLeaveRecord';
import HRLeaveRecords from './components/HRLeaveRecords';
import MayorDashboard from './components/MayorDashboard';
import MayorLeaveRequests from './components/MayorLeaveRequests';
import MayorLeaveRequestDetails from './components/MayorLeaveRequestDetails';
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