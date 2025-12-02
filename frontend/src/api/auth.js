// frontend/src/api/auth.js
import axios from 'axios';

// Get the base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL, // Remove trailing slash if exists
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Request interceptor to include auth token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API methods
const authAPI = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (userData) => {
    try {
      console.log('Sending registration request to:', `${api.defaults.baseURL}/auth/register`);
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Add other auth methods as needed
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Add verifyToken method
  verifyToken: async (token) => {
    try {
      const response = await api.post('/auth/verify-token', { token });
      return response.data;
    } catch (error) {
      console.error('Token verification error:', error);
      throw error;
    }
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Add this method to check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Add this method to get current user from localStorage
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Add this method to get token
  getToken: () => {
    return localStorage.getItem('token');
  }
};

export default authAPI;