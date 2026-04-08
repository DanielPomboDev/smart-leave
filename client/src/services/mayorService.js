import axios from 'axios';

// Create an axios instance with default configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {

    return response;
  },
  (error) => {
    console.error('Response error:', error.response?.status, error.response?.data, error.message);
    return Promise.reject(error);
  }
);

const MAYOR_API_BASE_URL = '/api/mayor';

// Dashboard API calls
export const getDashboardStats = async () => {
  try {

    const response = await apiClient.get(`${MAYOR_API_BASE_URL}/dashboard/stats`);

    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw new Error('Failed to fetch dashboard stats');
  }
};

export const getRecentLeaveRequests = async () => {
  try {

    const response = await apiClient.get(`${MAYOR_API_BASE_URL}/dashboard/recent-requests`);

    return response.data;
  } catch (error) {
    console.error('Error fetching recent leave requests:', error);
    throw new Error('Failed to fetch recent leave requests');
  }
};

// Leave requests API calls
export const getLeaveRequests = async () => {
  try {

    const response = await apiClient.get(`${MAYOR_API_BASE_URL}/leave-requests`);

    return response.data;
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    throw new Error('Failed to fetch leave requests');
  }
};

export const getLeaveRequestDetails = async (id) => {
  try {

    const response = await apiClient.get(`${MAYOR_API_BASE_URL}/leave-requests/${id}`);

    return response.data;
  } catch (error) {
    console.error('Error fetching leave request details:', error);
    throw new Error('Failed to fetch leave request details');
  }
};

export const processLeaveRequest = async (id, decision) => {
  try {

    // Validate ID before making the request
    if (!id) {
      throw new Error('Invalid leave request ID');
    }
    const response = await apiClient.post(`${MAYOR_API_BASE_URL}/leave-requests/${id}/process`, {
      decision
    });

    return response.data;
  } catch (error) {
    console.error('Error processing leave request:', error);
    throw new Error('Failed to process leave request');
  }
};