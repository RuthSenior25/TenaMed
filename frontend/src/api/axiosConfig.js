import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
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

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only handle 401 if we're not already on the login page
      // and if the request was not for the login or register endpoints
      const currentPath = window.location.pathname;
      const isAuthRoute = currentPath.includes('/login') || 
                         currentPath.includes('/register') ||
                         currentPath.includes('/forgot-password');
      
      if (!isAuthRoute) {
        // Store the current path to redirect back after login
        localStorage.setItem('redirectAfterLogin', currentPath);
        // Only remove token if it exists
        if (localStorage.getItem('token')) {
          localStorage.removeItem('token');
          // Use a small delay to allow any ongoing requests to complete
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;