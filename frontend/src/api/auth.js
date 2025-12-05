// frontend/src/api/auth.js
import axios from 'axios';

// Helper function to get base URL
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  let cleanUrl = envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  return `${cleanUrl}/api`;
};

// Create axios instance
const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && !token.startsWith('hardcoded-token-')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Hardcoded accounts
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
      role: 'admin',
      isApproved: true
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
      role: 'government',
      isApproved: true
    }
  }
};

// Auth API methods
const authAPI = {
  // Register new user
  register: async (userData) => {
    try {
      // Prevent registration with hardcoded emails
      const hardcodedEmails = Object.values(HARDCODED_ACCOUNTS).map(acc => acc.email);
      if (hardcodedEmails.includes(userData.email.toLowerCase())) {
        throw new Error('This email is reserved for system use');
      }

      // Add pharmacy-specific data if role is pharmacy
      if (userData.role === 'pharmacy') {
        userData = {
          ...userData,
          isApproved: false, // New pharmacies need approval
          pharmacyInfo: {
            name: userData.pharmacyName,
            location: userData.location,
            address: {
              street: userData.profile.address,
              city: userData.profile.city,
              state: userData.profile.state,
              zipCode: userData.profile.zipCode,
              country: 'Ethiopia'
            },
            contact: {
              phone: userData.profile.phone,
              email: userData.email
            }
          }
        };
      }

      const response = await api.post('/auth/register', userData);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return { 
        success: true, 
        data: response.data,
        message: 'Registration successful!'
      };
    } catch (error) {
      console.error('Registration error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      // Check against hardcoded accounts first
      const hardcodedUser = Object.values(HARDCODED_ACCOUNTS).find(
        acc => acc.email === credentials.email && acc.password === credentials.password
      );

      if (hardcodedUser) {
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

      // Proceed with normal login
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Login error:', error);
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
        const account = HARDCODED_ACCOUNTS[role];
        return account ? account.user : null;
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
        if (!account) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return { valid: false };
        }
        return { valid: true, user: account.user };
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

export default authAPI;