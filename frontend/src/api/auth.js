// frontend/src/api/auth.js
import axios from 'axios';

// Hardcoded admin and government accounts
const HARDCODED_ACCOUNTS = {
  admin: {
    email: 'admin@tenamed.com',
    password: 'TenaMedAdmin2023!',
    role: 'admin',
    user: {
      id: 'admin-001',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@tenamed.com',
      role: 'admin'
    }
  },
  government: {
    email: 'government@tenamed.com',
    password: 'TenaMedGov2023!',
    role: 'government',
    user: {
      id: 'gov-001',
      firstName: 'Government',
      lastName: 'Official',
      email: 'government@tenamed.com',
      role: 'government'
    }
  }
};

// Helper function to clean and format the base URL
const getBaseUrl = () => {
  // First try environment variable, then fallback to production URL
  const envUrl = import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com';
  // Clean up the URL to ensure it ends with /api
  let cleanUrl = envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  return `${cleanUrl}/api`;
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor to include auth token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // Skip adding auth header for hardcoded accounts
    if (token && !token.startsWith('hardcoded-token-')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      message: error.message,
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });

    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please check your internet connection.';
    } else if (!error.response) {
      error.message = 'Network error. Please check your internet connection.';
    } else if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  // Login user
  login: async (credentials) => {
    try {
      console.log('Attempting login with URL:', `${getBaseUrl()}/auth/login`);
      console.log('Login attempt:', credentials.email);

      // Proceed with normal login first (backend)
      const response = await api.post('/auth/login', credentials);
      console.log('Login response:', response.data);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return { success: true, data: response.data };
      
    } catch (error) {
      console.error('Backend login failed, checking hardcoded accounts:', error.message);
      
      // Check against hardcoded accounts as fallback
      const hardcodedUser = Object.values(HARDCODED_ACCOUNTS).find(
        acc => acc.email === credentials.email && acc.password === credentials.password
      );

      if (hardcodedUser) {
        console.log('Using hardcoded account for:', hardcodedUser.role);
        localStorage.setItem('token', `hardcoded-token-${hardcodedUser.role}`);
        localStorage.setItem('user', JSON.stringify(hardcodedUser.user));
        return { 
          success: true, 
          data: {
            token: `hardcoded-token-${hardcodedUser.role}`,
            user: hardcodedUser.user
          }
        };
      }
      
      // If both fail, throw the original error
      console.error('Login API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      throw error;
    }
  },

  // Register new user (without admin/government options)
  register: async (userData) => {
    try {
      // Prevent registration with admin/government roles
      if (userData.role === 'admin' || userData.role === 'government') {
        throw new Error('Registration with this role is not allowed');
      }
      
      // Format pharmacy data if role is pharmacy
      if (userData.role === 'pharmacy' && userData.location) {
        const registrationData = {
          ...userData,
          location: {
            type: 'Point',
            coordinates: [userData.location.lng, userData.location.lat]
          }
        };
        const response = await api.post('/auth/register', registrationData);
        return { success: true, data: response.data };
      }
      
      const response = await api.post('/auth/register', userData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Registration error:', {
        message: error.message,
        response: error.response?.data
      });
      throw error;
    }
  },

  // Get current user profile
  getProfile: async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Handle hardcoded accounts
      if (token && token.startsWith('hardcoded-token-')) {
        const role = token.replace('hardcoded-token-', '');
        return HARDCODED_ACCOUNTS[role]?.user || null;
      }
      
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  // Verify token
  verifyToken: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { valid: false };
      
      // Handle hardcoded tokens
      if (token.startsWith('hardcoded-token-')) {
        const role = token.replace('hardcoded-token-', '');
        const account = HARDCODED_ACCOUNTS[role];
        return { 
          valid: true, 
          user: account?.user || null 
        };
      }
      
      const response = await api.get('/auth/verify-token');
      return { valid: true, user: response.data.user };
    } catch (error) {
      console.error('Token verification error:', error);
      return { valid: false };
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const token = localStorage.getItem('token');
      
      // Prevent updating hardcoded accounts
      if (token && token.startsWith('hardcoded-token-')) {
        throw new Error('Cannot update hardcoded admin/government accounts');
      }
      
      const response = await api.put('/auth/profile', profileData);
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Only call logout API for non-hardcoded accounts
      if (token && !token.startsWith('hardcoded-token-')) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get current user
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Get auth token
  getToken: () => {
    return localStorage.getItem('token');
  }
};

export default api;