import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setFeedback(null);
    setIsLoading(true);
    const result = await login(data);
    if (result.success) {
      navigate(from, { replace: true });
    } else if (result.message) {
      setFeedback({ type: 'error', message: result.message });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 dark:from-slate-950 dark:via-teal-900 dark:to-cyan-900 flex items-center justify-center p-4">

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 -left-10 w-72 h-72 bg-white/20 dark:bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-cyan-400/30 dark:bg-cyan-500/20 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md relative">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-teal-100/60 dark:border-slate-800 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-sky-500 dark:from-teal-400 dark:to-cyan-500 p-8 text-center">

            <div className="w-14 h-14 bg-white/20 dark:bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-white">TM</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-blue-100 dark:text-indigo-100 text-sm mt-1">Sign in to continue</p>
          </div>

          {feedback && (
            <div
              className={`mx-6 mt-6 rounded-lg border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <form className="p-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Email</label>

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
                  errors.email ? 'border-red-500' : 'border-gray-200 dark:border-slate-700'
                } focus:ring-2 focus:ring-teal-500/60 dark:focus:ring-cyan-400/60 focus:border-teal-500 dark:focus:border-cyan-400 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Password</label>

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
                  autoComplete="current-password"
                  className={`w-full px-3 py-2 pr-10 rounded-lg border ${
                    errors.password ? 'border-red-500' : 'border-gray-200 dark:border-slate-700'
                  } focus:ring-2 focus:ring-teal-500/60 dark:focus:ring-cyan-400/60 focus:border-teal-500 dark:focus:border-cyan-400 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-200 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
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
                <input type="checkbox" className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                Remember me
              </label>
              <a href="#" className="text-teal-500 dark:text-cyan-300 hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-teal-500 to-sky-500 dark:from-teal-400 dark:to-cyan-500 hover:from-teal-600 hover:to-sky-600 text-white py-2.5 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-70"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              New here?{' '}
              <Link to="/register" className="font-medium text-teal-500 dark:text-cyan-300 hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;