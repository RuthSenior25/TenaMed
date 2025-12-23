import axios from 'axios';
import toast from 'react-hot-toast';
import auth from '../utils/auth';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api',
  timeout: 60000, // 60 seconds
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  }
});

// Flag to prevent multiple token refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

// Function to add subscribers to the refresh queue
const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

// Function to retry failed requests after token refresh
const onRefreshed = (token) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Don't add auth header for login/refresh token requests
    if (config.url.includes('/auth/login') || config.url.includes('/auth/refresh')) {
      return config;
    }

    // Get token from auth utility
    const token = auth.getToken();
    
    // Add token to headers if it exists
    if (token) {
      config.headers.Authorization = token.startsWith('admin-') 
        ? token 
        : `Bearer ${token}`;
    } else {
      console.warn('[API] No auth token found for request to:', config.url);
    }
    
    // Log request details (except sensitive data)
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      headers: {
        ...config.headers,
        // Don't log the full Authorization header for security
        Authorization: config.headers.Authorization 
          ? config.headers.Authorization.startsWith('admin-') 
            ? 'admin-...' 
            : 'Bearer [TOKEN]' 
          : undefined,
      },
    });
    
    return config;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`✅ [API] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const { response } = error;
    
    // Log error details
    console.error('❌ [API] Response error:', {
      status: response?.status,
      statusText: response?.statusText,
      url: originalRequest?.url,
      method: originalRequest?.method,
      data: response?.data,
      message: error.message
    });

    // Handle network errors
    if (!response) {
      console.error('🌐 [API] Network error - No response from server');
      toast.error('Network error. Please check your connection.');
      return Promise.reject({
        isNetworkError: true,
        message: 'Network error. Please check your connection.'
      });
    }

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.warn('❌ [API] Unauthorized access - redirecting to login');
      
      // Clear auth data
      auth.clearAuthData();
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      
      return Promise.reject({
        isAuthError: true,
        message: 'Please log in to continue'
      });
    }

    // Handle 403 Forbidden
    if (response.status === 403) {
      const errorMessage = response.data?.message || 'You do not have permission to perform this action';
      toast.error(errorMessage);
      return Promise.reject({
        isForbidden: true,
        message: errorMessage
      });
    }

    // Handle 5xx server errors
    if (response.status >= 500) {
      console.error('🔥 [API] Server error:', response.data);
      toast.error('Server error. Please try again later.');
      return Promise.reject({
        isServerError: true,
        message: 'Server error. Please try again later.',
        status: response.status,
        data: response.data
      });
    }

    // Handle other client errors (4xx)
    if (response.status >= 400) {
      const errorMessage = response.data?.message || 'An error occurred';
      if (errorMessage && !originalRequest._retry) {
        toast.error(errorMessage);
      }
    }

    // Pass through the error with enhanced details
    return Promise.reject({
      message: response.data?.message || error.message,
      status: response.status,
      data: response.data,
      isClientError: response.status >= 400 && response.status < 500
    });
  }
);

// Helper function to set auth tokens
api.setAuthTokens = (tokens) => {
  if (tokens.token) {
    auth.setAuthData({
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      user: tokens.user
    });
    
    // Update axios default headers
    api.defaults.headers.common['Authorization'] = tokens.token.startsWith('admin-') 
      ? tokens.token 
      : `Bearer ${tokens.token}`;
  } else {
    auth.clearAuthData();
    delete api.defaults.headers.common['Authorization'];
  }
};

// Initialize auth token if it exists
const token = auth.getToken();
if (token) {
  api.defaults.headers.common['Authorization'] = token.startsWith('admin-') 
    ? token 
    : `Bearer ${token}`;
}

export default api;