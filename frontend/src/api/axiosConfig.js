import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds timeout
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    // Log request details (except sensitive data)
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      headers: {
        ...config.headers,
        // Don't log the full Authorization header for security
        Authorization: config.headers.Authorization ? 'Bearer [TOKEN]' : undefined,
      },
    });

    // Add auth token to request if it exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[API] Added auth token to request');
    } else {
      console.warn('[API] No auth token found in localStorage');
    }
    
    return config;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`[API] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      data: response.data,
    });
    return response;
  },
  (error) => {
    const { config, response } = error;
    const originalRequest = config;
    
    // Log error details
    console.error('[API] Response error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: response?.status,
      data: response?.data,
      message: error.message,
    });

    // Handle 401 Unauthorized
    if (response?.status === 401) {
      const currentPath = window.location.pathname;
      const isAuthRoute = ['/login', '/register', '/forgot-password'].some(route => 
        currentPath.includes(route)
      );
      
      // Don't redirect if we're already on an auth page
      if (!isAuthRoute) {
        console.log('[Auth] Unauthorized, redirecting to login');
        localStorage.setItem('redirectAfterLogin', currentPath);
        
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login after a small delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    
    // Return a more detailed error
    return Promise.reject({
      message: error.message,
      status: response?.status,
      data: response?.data,
      config: {
        url: originalRequest?.url,
        method: originalRequest?.method,
      },
    });
  }
);

// Helper function to set auth token
api.setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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