import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'https://tenamed-backend.onrender.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
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

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/#/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  // Login user
  login: async (credentials) => api.post('/auth/login', credentials),

  // Register new user
  register: async (userData) => api.post('/auth/register', userData),

  // Get user profile
  getProfile: async () => api.get('/auth/me'),
  
  // Verify token by getting user profile
  verifyToken: async () => api.get('/auth/me'),

  // Update user profile
  updateProfile: async (profileData) => api.put('/auth/profile', profileData),

  // Logout user
  logout: async () => api.post('/auth/logout'),
};

export default api;