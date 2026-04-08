import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({
    employee_id: '',
    password: ''
    // is_standard_employee: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invalidField, setInvalidField] = useState(''); // Track which field is invalid

  const navigate = useNavigate();

  const { employee_id, password } = formData;
  // const { employee_id, password, is_standard_employee } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // Clear error and invalid field tracking when user types
    if (error) {
      setError('');
      setInvalidField('');
    }
  };

  // const onCheckboxChange = (e) => {
  //   setFormData({ ...formData, is_standard_employee: e.target.checked });
  // };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInvalidField('');

    // Remove is_standard_employee from the data being sent
    const loginData = {
      employee_id,
      password
    };

    try {
      console.log('Sending login request with data:', loginData);
      const res = await axios.post('/api/auth/login', loginData);
      console.log('Received response:', res.data);
      
      if (res.data.success) {
        // Store token in localStorage
        localStorage.setItem('token', res.data.token);
        
        // Redirect to appropriate dashboard
        navigate(res.data.redirectUrl);
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle specific error messages from backend
      if (err.response?.data?.message) {
        const errorMessage = err.response.data.message;
        setError(errorMessage);
        
        // Determine which field is invalid based on error message
        if (errorMessage.includes('employee ID') || errorMessage.includes('User not found')) {
          setInvalidField('employee_id');
        } else if (errorMessage.includes('password')) {
          setInvalidField('password');
        }
      } else {
        setError('An error occurred during login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Clear the invalid field when user focuses on it
  const handleFocus = (fieldName) => {
    if (invalidField === fieldName) {
      setInvalidField('');
      setError('');
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="card shadow-lg bg-white flex flex-col lg:flex-row w-full max-w-5xl h-auto lg:h-[600px]">
        {/* Left Side - Logo and Info */}
        <div className="lg:w-1/2 bg-gradient-to-br from-blue-500 via-blue-400 to-blue-300 text-white flex flex-col items-center justify-center p-8">
          <div className="avatar mb-6">
            <div className="w-40 rounded-full border-4 border-white">
              <img 
                src="/images/sj-logo.jpg" 
                alt="Logo" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <p className="text-lg font-semibold text-center">LOCAL GOVERNMENT UNIT</p>
          <p className="text-lg font-semibold text-center">SAN JULIAN, EASTERN SAMAR</p>

          <div className="divider my-6"></div>

          <img 
            src="/images/smart-logo.png" 
            alt="SmartLeave Logo" 
            className="w-1/2"
          />
        </div>

        {/* Right Side - Login Form */}
        <div className="lg:w-1/2 p-8 flex flex-col justify-center">
          <h3 className="text-2xl font-bold text-center mb-6">Sign in to your account</h3>

          {error && (
            <div className="alert bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <ul>
                <li>{error}</li>
              </ul>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">User ID</span>
              </label>
              <input
                name="employee_id"
                type="text"
                placeholder="Enter your User ID"
                value={employee_id}
                onChange={onChange}
                onFocus={() => handleFocus('employee_id')}
                required
                className={`input input-bordered w-full ${invalidField === 'employee_id' ? 'input-error' : ''}`}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <input
                name="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={onChange}
                onFocus={() => handleFocus('password')}
                required
                className={`input input-bordered w-full ${invalidField === 'password' ? 'input-error' : ''}`}
              />
            </div>

            {/* <div className="form-control">
              <label className="label cursor-pointer">
                <input 
                  type="checkbox" 
                  name="is_standard_employee"
                  checked={is_standard_employee}
                  onChange={onCheckboxChange}
                  className="checkbox checkbox-primary" 
                />
                <span className="label-text ml-2">Login as standard employee (restrict access to employee pages only)</span>
              </label>
            </div> */}

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary w-full mt-4"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;