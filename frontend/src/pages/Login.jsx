import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const from = '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors
  } = useForm();

  useEffect(() => {
    // Clear any existing errors when component mounts
    clearErrors();
    // Only clear cached data if user is not already logged in as admin
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);
        // Don't clear if user is admin with valid admin token
        if (parsedUser.role === 'admin' && token.startsWith('admin-')) {
          return;
        }
      } catch (e) {
        // Invalid user data, clear everything
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        return;
      }
    }
    // Clear only non-admin cached data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }, []);

  const onSubmit = async (data) => {
    setFeedback(null);
    setIsLoading(true);
    
    try {
      const result = await login(data);
      
      if (result.success) {
        toast.success('Login successful! Redirecting...', { duration: 2000 });
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 1500);
      } else {
        const errorMessage = result.message || 'Login failed. Please check your credentials.';
        setFeedback({ type: 'error', message: errorMessage });
        toast.error(errorMessage, { duration: 4000 });
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'An error occurred during login. Please try again.';
      setFeedback({ type: 'error', message: errorMessage });
      toast.error(errorMessage, { duration: 4000 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-500 via-blue-500 to-purple-600 dark:from-slate-950 dark:via-indigo-900 dark:to-purple-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 -left-10 w-72 h-72 bg-white/20 dark:bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-400/30 dark:bg-indigo-500/20 rounded-full blur-3xl" />
      </div>
      
      <div className="w-full max-w-md relative">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-slate-800">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 dark:bg-gray-900/20 rounded-xl backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">TM</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-blue-100 dark:text-blue-300 mt-1 text-sm">Sign in to your account</p>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`mx-6 mt-6 rounded-lg border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
              }`}
              role="alert"
              aria-live="polite"
            >
              {feedback.message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                type="email"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-gray-100`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full px-3 py-2 pr-10 rounded-lg border ${
                    errors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-gray-100`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:ring-offset-gray-800"
                  {...register('remember')}
                />
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-70"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/auth/create-dispatcher`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json();
                    if (data.success) {
                      alert(`Dispatcher created!\nEmail: ${data.credentials.email}\nPassword: ${data.credentials.password}\n\nYou can now login.`);
                    } else {
                      alert('Failed to create dispatcher');
                    }
                  } catch (error) {
                    console.error('Create dispatcher error:', error);
                    alert('Create dispatcher failed');
                  }
                }}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 dark:from-red-500 dark:to-pink-500 hover:from-red-700 hover:to-pink-700 text-white py-2 px-4 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Create Dispatcher Account
              </button>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                Creates hardcoded dispatcher: dispatcher@tenamed.com
              </p>
            </div>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 dark:text-blue-300 hover:text-blue-500 hover:underline"
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;