import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  },
  timeout: 20000, // 20 seconds timeout
  withCredentials: false, // Disable credentials for CORS
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Resolve only if status code is less than 500
  }
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    // Remove any existing Expires header that might be added by browser/extensions
    if (config.headers && config.headers['Expires']) {
      delete config.headers['Expires'];
    }
    
    // Ensure Cache-Control is set correctly
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    
    const token = localStorage.getItem('token');
    
    // Add auth token to request if it exists
    if (token) {
      // For admin tokens (starting with 'admin-'), send as is
      // For JWT tokens, add 'Bearer ' prefix
      config.headers.Authorization = token.startsWith('admin-') 
        ? token 
        : `Bearer ${token}`;
      
      console.log(`[API] Added ${token.startsWith('admin-') ? 'admin' : 'JWT'} token to request`);
    } else {
      console.warn('[API] No auth token found in localStorage');
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

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`✅ [API] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log error details
    console.error('❌ [API] Response error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: originalRequest?.url,
      method: originalRequest?.method,
      data: error.response?.data,
      message: error.message
    });

    // Handle network errors
    if (!error.response) {
      console.error('🌐 [API] Network error - No response from server');
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        isNetworkError: true
      });
    }

    // Handle 401 Unauthorized
    if (error.response.status === 401) {
      const token = localStorage.getItem('token');
      console.warn(`🔑 [API] Unauthorized access - Invalid or expired token (${token ? 'Token exists' : 'No token'})`);
      
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login after a small delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      
      return Promise.reject({
        message: 'Session expired. Please log in again.',
        isAuthError: true
      });
    }

    // Handle 5xx server errors
    if (error.response.status >= 500) {
      console.error('🔥 [API] Server error:', error.response.data);
      return Promise.reject({
        message: 'Server error. Please try again later.',
        isServerError: true,
        status: error.response.status,
        data: error.response.data
      });
    }

    // For other errors, pass through the error with enhanced details
    return Promise.reject({
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
      data: error.response?.data,
      isClientError: error.response?.status >= 400 && error.response?.status < 500
    });
  }
);

// Helper function to set auth token
api.setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    // For admin tokens, don't add 'Bearer ' prefix
    api.defaults.headers.common['Authorization'] = token.startsWith('admin-') 
      ? token 
      : `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Initialize auth token if it exists
const token = localStorage.getItem('token');
if (token) {
  api.setAuthToken(token);
}

export default api;