// Token storage keys
const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

// Token management
export const auth = {
  // Set auth data
  setAuthData: (data) => {
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      }
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
    }
  },

  // Get stored token
  getToken: () => localStorage.getItem(TOKEN_KEY),

  // Get stored refresh token
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

  // Get current user
  getCurrentUser: () => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return !!token;
  },

  // Clear auth data
  clearAuthData: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  // Check if user has specific role
  hasRole: (role) => {
    const user = auth.getCurrentUser();
    return user?.role === role;
  },

  // Check if user has any of the specified roles
  hasAnyRole: (roles) => {
    const user = auth.getCurrentUser();
    return roles.includes(user?.role);
  }
};

export default auth;
