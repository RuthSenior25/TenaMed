import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import PharmacyLocationPicker from '../components/PharmacyLocationPicker';

const Register = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [pharmacyLocation, setPharmacyLocation] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    console.log('Register form submitted:', data);
    setFeedback(null);
    setIsLoading(true);
    
    // Validate pharmacy-specific fields if role is pharmacy
    if (data.role === 'pharmacy') {
      if (!pharmacyLocation) {
        toast.error('Please select your pharmacy location on the map');
        setIsLoading(false);
        return;
      }
      if (!pharmacyName?.trim()) {
        setError('pharmacyName', { 
          type: 'required', 
          message: 'Pharmacy name is required' 
        });
        toast.error('Pharmacy name is required');
        setIsLoading(false);
        return;
      }
    }
    
    try {
      // Prepare registration data
      const registrationData = {
        username: data.username?.trim() || data.email.split('@')[0],
        email: data.email?.trim().toLowerCase(),
        password: data.password,
        role: data.role,
        profile: {
          firstName: data.firstName?.trim(),
          lastName: data.lastName?.trim(),
          phone: data.phone?.trim() || '',
          address: data.address?.trim() || '',
          city: data.city?.trim() || '',
          state: data.state?.trim() || '',
          zipCode: data.zipCode?.trim() || ''
        }
      };

      // Add pharmacy-specific data
      if (data.role === 'pharmacy') {
        registrationData.pharmacyName = pharmacyName.trim();
        
        // Location is REQUIRED for pharmacies
        if (!pharmacyLocation) {
          toast.error('Please select your pharmacy location on the map');
          setIsLoading(false);
          return;
        }
        
        // Save location data
        registrationData.location = {
          type: 'Point',
          coordinates: [pharmacyLocation.lng, pharmacyLocation.lat] // MongoDB expects [longitude, latitude]
        };
        
        console.log('Pharmacy location being saved:', {
          pharmacyName: pharmacyName,
          location: registrationData.location
        });
      }

      console.log('Sending registration data:', registrationData);
      
      const result = await registerUser(registrationData);
      console.log('Register result:', result);
      
      if (result.success) {
        const successMessage = data.role === 'pharmacy' 
          ? `Welcome to TenaMed, ${data.firstName}! Your pharmacy "${pharmacyName}" has been registered successfully and is pending approval.` 
          : `Welcome to TenaMed, ${data.firstName}! Your ${data.role} account has been created successfully.`;
        
        toast.success(successMessage, { duration: 5000 });
        setFeedback({ type: 'success', message: 'Account created successfully! Redirecting...' });
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Something went wrong. Please try again later.';
      
      if (errorMessage.includes('already exists')) {
        setError('email', {
          type: 'server',
          message: 'An account with this email already exists.',
        });
        setError('username', {
          type: 'server',
          message: 'This username is already taken.',
        });
      }
      
      toast.error(errorMessage, { duration: 5000 });
      setFeedback({ type: 'error', message: errorMessage });
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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:bg-gradient-to-r dark:from-blue-500 dark:to-indigo-500 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 dark:bg-gray-900/20 rounded-xl backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white dark:text-gray-100">TM</span>
            </div>
            <h1 className="text-2xl font-bold text-white dark:text-gray-100">Create Your Account</h1>
            <p className="text-blue-100 dark:text-blue-300 mt-1 text-sm">Join TenaMed today</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                <input
                  {...register('firstName', { required: 'First name is required' })}
                  type="text"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.firstName ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-gray-100`}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                <input
                  {...register('lastName', { required: 'Last name is required' })}
                  type="text"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.lastName ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-gray-100`}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <input
                {...register('username', {
                  minLength: {
                    value: 3,
                    message: 'Username must be at least 3 characters',
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: 'Only letters, numbers, and underscores allowed',
                  },
                })}
                type="text"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.username ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-gray-100`}
                placeholder="yonatan_01"
              />
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">Leave blank to auto-generate from your email.</p>
            </div>

            {/* Email */}
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
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone (optional)</label>
              <input
                {...register('phone')}
                type="tel"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.phone ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-gray-100`}
                placeholder="Enter phone number (optional)"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
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
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-colors"
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

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
              <div className="relative">
                <input
                  {...register('confirmPassword', {
                    validate: (value) =>
                      value === password || 'Passwords do not match',
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`w-full px-3 py-2 pr-10 rounded-lg border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-gray-100`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">I am a</label>
              <select
                {...register('role', { 
                  required: 'Please select your role',
                  onChange: (e) => {
                    setSelectedRole(e.target.value);
                  }
                })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.role ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-white dark:bg-gray-900 dark:text-gray-100`}
                aria-label="Select your role"
                value={selectedRole}
              >
                <option value="">Select your role</option>
                <option value="patient">Patient - Order and manage prescriptions</option>
                <option value="pharmacy">Pharmacy Owner - Manage pharmacy inventory and orders</option>
                <option value="delivery_person">Delivery Person - Handle medication deliveries</option>
              </select>
              {errors.role && (
                <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Select the role that best describes how you'll use TenaMed.
              </p>
            </div>

            {/* Pharmacy-specific fields */}
            {selectedRole === 'pharmacy' && (
              <>
                {/* Pharmacy Name */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pharmacy Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      !pharmacyName ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                    } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-gray-100`}
                    placeholder="Enter pharmacy name"
                  />
                  {!pharmacyName && (
                    <p className="text-red-500 text-xs mt-1">Pharmacy name is required</p>
                  )}
                </div>

                {/* Pharmacy Location Picker */}
                <div className="mt-4 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Pharmacy Location
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                    Please select your pharmacy's location on the map. This will help patients find you.
                  </p>
                  <PharmacyLocationPicker 
                    onLocationSelect={(location) => setPharmacyLocation(location)} 
                    initialPosition={pharmacyLocation}
                  />
                  {pharmacyLocation ? (
                    <div className="mt-2 text-xs text-green-700 dark:text-green-300">
                      Location selected: {pharmacyLocation.lat.toFixed(6)}, {pharmacyLocation.lng.toFixed(6)}
                    </div>
                  ) : (
                    <p className="text-red-500 text-xs mt-2">Please select a location on the map</p>
                  )}
                </div>

                {/* Address Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('city', { 
                        required: 'City is required'
                      })}
                      type="text"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        errors.city ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                      } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-gray-100`}
                      placeholder="City"
                    />
                    {errors.city && (
                      <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      State/Region <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('state', { 
                        required: 'State/Region is required'
                      })}
                      type="text"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        errors.state ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                      } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-gray-100`}
                      placeholder="State/Region"
                    />
                    {errors.state && (
                      <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('address', { 
                      required: 'Street address is required'
                    })}
                    type="text"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      errors.address ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                    } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-gray-100`}
                    placeholder="Street address"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    ZIP/Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('zipCode', { 
                      required: 'ZIP/Postal code is required'
                    })}
                    type="text"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      errors.zipCode ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                    } focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-gray-100`}
                    placeholder="ZIP/Postal code"
                  />
                  {errors.zipCode && (
                    <p className="text-red-500 text-xs mt-1">{errors.zipCode.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:bg-gradient-to-r dark:from-blue-500 dark:to-indigo-500 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-70 mt-4"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
              Already have an account?{' '}
              <Link
                to="/login"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate('/login');
                }}
                className="font-medium text-blue-600 dark:text-blue-300 hover:text-blue-500 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;