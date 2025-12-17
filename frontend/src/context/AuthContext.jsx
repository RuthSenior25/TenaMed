import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { authAPI } from '../api/auth';
import toast from 'react-hot-toast';

// Hardcoded credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@tenamed.com',
  password: 'Admin@TenaMed2024!',
  role: 'admin',
  firstName: 'Admin',
  lastName: 'User',
  id: 'admin-001'
};

// Hardcoded government credentials
const GOVERNMENT_CREDENTIALS = {
  email: 'Government@gmail.com',
  password: 'TenaMed1',
  role: 'government',
  firstName: 'Government',
  lastName: 'Official',
  id: 'gov-001'
};

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [logoutTimer, setLogoutTimer] = useState(null);

  // Auto-logout after token expiration
  const setupLogoutTimer = (expiresIn) => {
    if (logoutTimer) clearTimeout(logoutTimer);
    
    const timeUntilExpiry = expiresIn * 1000 - Date.now();
    if (timeUntilExpiry > 0) {
      const timer = setTimeout(() => {
        logout('Your session has expired. Please log in again.');
      }, timeUntilExpiry);
      setLogoutTimer(timer);
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, [logoutTimer]);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (!token) {
        console.log('No token found in localStorage');
        if (isMounted) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
        return;
      }

      try {
        console.log('Token found in localStorage, verifying...');
        
        // For admin token (starts with 'admin-')
        if (token.startsWith('admin-')) {
          let adminUser;
          
          // Try to get user data from localStorage
          if (storedUser) {
            try {
              adminUser = JSON.parse(storedUser);
              console.log('Loaded admin user from localStorage');
            } catch (e) {
              console.error('Error parsing stored user data:', e);
            }
          }
          
          // If no valid user in localStorage, create a new one
          if (!adminUser) {
            console.log('Creating new admin user object');
            adminUser = {
              _id: ADMIN_CREDENTIALS.id,
              email: ADMIN_CREDENTIALS.email,
              role: 'admin',
              firstName: ADMIN_CREDENTIALS.firstName,
              lastName: ADMIN_CREDENTIALS.lastName,
              isAdmin: true,
              isApproved: true,
              status: 'active'
            };
            // Save to localStorage for future use
            localStorage.setItem('user', JSON.stringify(adminUser));
          }
          
          // Update axios headers
          if (api && api.defaults && api.defaults.headers) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
          
          if (isMounted) {
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: { 
                user: adminUser, 
                token 
              },
            });
            console.log('Admin authentication successful');
          }
          return;
        }
        
        // For regular users, verify the token and get profile
        const response = await authAPI.verifyToken();
        
        if (isMounted) {
          // Then get the full user profile
          const profileResponse = await authAPI.getProfile();
          
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { 
              user: profileResponse.data, 
              token 
            },
          });
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        if (isMounted) {
          // Only clear token if it's invalid
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
          }
          dispatch({ type: 'LOGOUT' });
        }
      } finally {
        if (isMounted) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    checkAuth();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  // Check if user has required role(s)
  const hasRole = (requiredRoles) => {
    if (!state.user?.role) return false;
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(state.user.role);
    }
    return state.user.role === requiredRoles;
  };

  // Check if user has any of the required roles
  const hasAnyRole = (roles) => {
    if (!state.user?.role) return false;
    return roles.includes(state.user.role);
  };

  const login = async (credentials) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      // Check for admin login
      if (credentials.email === ADMIN_CREDENTIALS.email && 
          credentials.password === ADMIN_CREDENTIALS.password) {
        
        const adminUser = {
          _id: ADMIN_CREDENTIALS.id,
          email: ADMIN_CREDENTIALS.email,
          role: 'admin',
          firstName: ADMIN_CREDENTIALS.firstName,
          lastName: ADMIN_CREDENTIALS.lastName,
          isAdmin: true,
          isApproved: true,
          status: 'active'
        };
        
        // For admin, we'll use a JWT-like token that the backend can recognize
        // This should match the backend's JWT secret and format
        const adminToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbi0wMDEiLCJlbWFpbCI6ImFkbWluQHRlbmFtZWQuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjk0Mzg5NjAwLCJleHAiOjE3MjU5MjU2MDB9.9y8z8X7vN1Y3b7JcT1w0ZxY9vLmNpQw2Er4tUvWxYzA`;
        
        console.log('Storing admin token in localStorage');
        localStorage.setItem('token', adminToken);
        localStorage.setItem('user', JSON.stringify(adminUser));
        
        // Update axios default headers
        if (api && api.defaults && api.defaults.headers) {
          api.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
        }
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { 
            user: adminUser, 
            token: adminToken,
          },
        });
        
        toast.success(`Welcome back, Administrator!`);
        return { success: true };
      }
      
      // Check for government login
      if (credentials.email === GOVERNMENT_CREDENTIALS.email && 
          credentials.password === GOVERNMENT_CREDENTIALS.password) {
        
        const governmentUser = {
          _id: GOVERNMENT_CREDENTIALS.id,
          email: GOVERNMENT_CREDENTIALS.email,
          role: GOVERNMENT_CREDENTIALS.role,
          firstName: GOVERNMENT_CREDENTIALS.firstName,
          lastName: GOVERNMENT_CREDENTIALS.lastName,
          isApproved: true,
          status: 'active'
        };
        
        // Use a JWT-like token for government user
        const govToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJnb3YtMDAxIiwiZW1haWwiOiJnb3Zlcm5tZW50QGV4YW1wbGUuY29tIiwicm9sZSI6ImdvdmVybm1lbnQiLCJpYXQiOjE2OTQzODk2MDAsImV4cCI6MTcyNTkyNTYwMH0.8x7vN1Y3b7JcT1w0ZxY9vLmNpQw2Er4tUvWxYzA`;
        
        localStorage.setItem('token', govToken);
        localStorage.setItem('user', JSON.stringify(governmentUser));
        
        // Update axios default headers
        if (api && api.defaults && api.defaults.headers) {
          api.defaults.headers.common['Authorization'] = `Bearer ${govToken}`;
        }
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: governmentUser, token: govToken },
        });
        
        toast.success(`Welcome, ${GOVERNMENT_CREDENTIALS.firstName} ${GOVERNMENT_CREDENTIALS.lastName}!`);
        return { success: true };
      }
      
      // Regular user login
      const response = await authAPI.login(credentials);
      
      if (!response.data || !response.data.token) {
        throw new Error('Invalid response from server');
      }
      
      const { user, token, expiresIn } = response.data;
      
      // Set up auto-logout timer if expiresIn is provided
      if (expiresIn) {
        setupLogoutTimer(expiresIn);
      }

      // Store the token in local storage
      localStorage.setItem('token', token);
      
      // Update the axios instance with the new token
      if (authAPI && authAPI.defaults && authAPI.defaults.headers) {
        authAPI.defaults.headers.common = authAPI.defaults.headers.common || {};
        authAPI.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Get the full user profile
      const profileResponse = await authAPI.getProfile();
      const userWithProfile = { ...user, ...(profileResponse?.data || {}) };

      // Update the auth state
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { 
          user: userWithProfile, 
          token 
        },
      });

      // Customize welcome message based on user role
      const roleMessages = {
        government: 'Government Official',
        pharmacy: 'Pharmacy Owner',
        dispatcher: 'Delivery Person',
        supplier: 'Medicine Supplier',
        patient: 'Patient'
      };
      
      const roleMessage = roleMessages[user.role] || '';
      toast.success(`Welcome back, ${user.firstName || 'User'}! ${roleMessage ? `(${roleMessage})` : ''}`);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      
      // Clear any invalid token
      localStorage.removeItem('token');
      if (authAPI && authAPI.defaults && authAPI.defaults.headers && authAPI.defaults.headers.common) {
        delete authAPI.defaults.headers.common['Authorization'];
      }
      
      // Prepare error message
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      
      if (error.response) {
        // Server responded with an error status code
        const errors = error.response.data?.errors;
        const detailed = Array.isArray(errors) && errors.length ? errors[0].msg : null;
        errorMessage = detailed || error.response.data?.message || errorMessage;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      }
      
      toast.error(errorMessage);
      dispatch({ type: 'LOGIN_FAILURE' });
      return { 
        success: false, 
        message: errorMessage,
        error: error.response?.data || error.message
      };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      // Prepare registration data
      const registrationData = { 
        ...userData,
        // Add any additional fields needed for registration
      };
      
      // If registering as a pharmacy, add pending status
      if (userData.role === 'pharmacy') {
        registrationData.status = 'pending_approval';
      }
      
      // Make the registration API call
      const response = await authAPI.register(registrationData);
      
      if (!response.data || !response.data.token) {
        throw new Error('Invalid response from server');
      }
      
      const { user, token } = response.data;

      // Store the token in local storage
      localStorage.setItem('token', token);
      
      // Update the axios instance with the new token
      if (authAPI && authAPI.defaults && authAPI.defaults.headers) {
        authAPI.defaults.headers.common = authAPI.defaults.headers.common || {};
        authAPI.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Get the full user profile
      const profileResponse = await authAPI.getProfile();
      const userWithProfile = { ...user, ...(profileResponse?.data || {}) };

      // Update the auth state
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { 
          user: { 
            ...userWithProfile, 
            status: registrationData.status 
          }, 
          token 
        },
      });

      // Show success message based on user role
      if (user.role === 'pharmacy') {
        toast.success('Registration successful! Your account is pending admin approval.');
      } else {
        toast.success(`Welcome to TenaMed, ${user.firstName || 'User'}!`);
      }
      
      return { 
        success: true,
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      // Clear any invalid token
      localStorage.removeItem('token');
      if (authAPI?.defaults?.headers?.common) {
        delete authAPI.defaults.headers.common['Authorization'];
      }
      
      // Prepare error message
      let errorMessage = 'Registration failed. Please check your information and try again.';
      
      if (error.response) {
        // Server responded with an error status code
        const errors = error.response.data?.errors;
        const detailed = Array.isArray(errors) && errors.length ? errors[0].msg : null;
        errorMessage = detailed || error.response.data?.message || errorMessage;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      }
      
      toast.error(errorMessage);
      dispatch({ type: 'LOGIN_FAILURE' });
      
      return { 
        success: false, 
        message: errorMessage,
        error: error.response?.data || error.message
      };
    }
  };

  const logout = (message = 'Logged out successfully') => {
    localStorage.removeItem('token');
    if (logoutTimer) clearTimeout(logoutTimer);
    dispatch({ type: 'LOGOUT' });
    if (message) {
      toast.success(message);
    }
  };

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
