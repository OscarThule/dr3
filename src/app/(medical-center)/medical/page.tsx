'use client';

import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/redux/store';
import {
  setActiveForm,
  setIsRegistered,
  setError,
  setSuccess,
  addPractitioner,
  removePractitioner,
  updateFormField,
  updateAddressField,
  updateBankField,
  updatePractitionerField,
  updateLoginField,
  getCurrentLocation,
  registerMedicalCenter,
  loginUser,
  forgotPassword,
  updateForgotPasswordField,
} from '@/app/redux/slices/medicalSlice';
import type { Practitioner } from '@/app/redux/slices/medicalSlice';
import { useEffect, useState } from 'react';

export default function MedicalCenterPortal() {
  const dispatch = useDispatch<AppDispatch>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Get the entire medicalCenter state first to avoid destructuring issues
  const medicalCenterState = useSelector((state: RootState) => state.medicalCenter);

  // Safe destructuring with fallback values
  const {
    isRegistered = false,
    isLoading = false,
    error = '',
    success = '',
    activeForm = 'login',
    formData = {
      facility_name: '',
      company_reg_number: '',
      healthcare_reg_number: '',
      facility_type: 'clinic',
      official_domain_email: '',
      phone: '',
      address: {
        line1: '',
        city: '',
        province: '',
        postal: '',
        lat: null,
        lng: null,
      },
      practitioners: [],
      bankDetails: {
        bank_name: '',
        account_number: '',
        bank_code: '',
        account_type: 'current',
      },
    },
    newPractitioner = {
      full_name: '',
      role: 'doctor',
      professional_license_number: '',
      license_type: 'HPCSA',
      license_doc_url: '',
      contact_email: '',
      contact_phone: '',
      verification_status: 'unverified' as const,
    },
    loginData = {
      email: '',
      password: '',
    },
    forgotPasswordData = { email: '' },
    isGettingLocation = false,
    locationError = '',
  } = medicalCenterState || {};

  const facilityTypes = [
    { value: 'surgery', label: '🏥 Surgery', description: 'Specialized surgical facility' },
    { value: 'clinic', label: '🩺 Clinic', description: 'General medical clinic' },
    { value: 'hospital', label: '🏨 Hospital', description: 'Full-service hospital' },
    { value: 'community_health', label: '🌍 Community Health', description: 'Community healthcare center' },
    { value: 'mobile_unit', label: '🚐 Mobile Unit', description: 'Mobile medical service' },
    { value: 'other', label: '⚕️ Other', description: 'Other medical facility type' },
  ];

  const practitionerRoles = [
    { value: 'doctor', label: '👨‍⚕️ Doctor' },
    { value: 'nurse', label: '👩‍⚕️ Nurse' },
    { value: 'clinical_manager', label: '📋 Clinical Manager' },
    { value: 'admin', label: '💼 Administrator' },
  ];

  const licenseTypes = [
    { value: 'HPCSA', label: 'HPCSA' },
    { value: 'SANC', label: 'SANC' },
    { value: 'other', label: 'Other Council' },
  ];

  const accountTypes = [
    { value: 'current', label: 'Current Account' },
    { value: 'savings', label: 'Savings Account' },
  ];

  const provinces = [
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'North West',
    'Northern Cape',
    'Western Cape',
  ];

  // Enhanced Handlers with Error Handling
  const handleGetCurrentLocation = () => {
    dispatch(getCurrentLocation());
  };

  const handleInputChange = (field: string, value: string | boolean | number) => {
    dispatch(updateFormField({ field, value }));
  };

  const handleAddressChange = (field: string, value: string) => {
    dispatch(updateAddressField({ field, value }));
  };

  const handleBankChange = (field: string, value: string) => {
    dispatch(updateBankField({ field, value }));
  };

  const handleNewPractitionerChange = (field: string, value: string | boolean | number) => {
    dispatch(updatePractitionerField({ field, value }));
  };

  const handleAddPractitioner = () => {
    if (newPractitioner.full_name && newPractitioner.contact_email) {
      dispatch(addPractitioner());
    } else {
      dispatch(setError('Practitioner name and email are required'));
    }
  };

  const handleRemovePractitioner = (practitionerId: string) => {
    dispatch(removePractitioner(practitionerId));
  };

  const handleLoginChange = (field: string, value: string) => {
    dispatch(updateLoginField({ field, value }));
  };

  // Enhanced Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginData.email || !loginData.password) {
      dispatch(setError('Please enter both email and password'));
      return;
    }

    try {
      const result = await dispatch(loginUser(loginData)).unwrap();

      if (result.success) {
        dispatch(setSuccess('Login successful! Redirecting...'));
        // Redirect to dashboard or set user session
        setTimeout(() => {
          window.location.href = '/mainPage';
        }, 2000);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed. Please try again.';
      dispatch(setError(errorMessage));
    }
  };

  // Enhanced Registration Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.facility_name ||
      !formData.healthcare_reg_number ||
      !formData.official_domain_email ||
      !password
    ) {
      dispatch(setError('Please fill in all required fields including password'));
      return;
    }

    if (password !== confirmPassword) {
      dispatch(setError('Passwords do not match'));
      return;
    }

    if (password.length < 6) {
      dispatch(setError('Password must be at least 6 characters long'));
      return;
    }

    if (formData.practitioners.length === 0) {
      dispatch(setError('Please add at least one practitioner'));
      return;
    }

    // Bank details validation
    if (
      !formData.bankDetails.bank_name ||
      !formData.bankDetails.account_number ||
      !formData.bankDetails.bank_code
    ) {
      dispatch(setError('Please fill in all bank details fields'));
      return;
    }

    try {
      // Prepare data with password and bank details
      const registrationData = {
        ...formData,
        password: password,
      };

      // Submit registration data using Redux thunk
      const result = await dispatch(registerMedicalCenter(registrationData)).unwrap();

      if (result.success) {
        dispatch(setSuccess('Registration completed successfully!'));
        dispatch(setIsRegistered(true));
      } else {
        dispatch(setError(result.message || 'Registration failed. Please try again.'));
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Registration failed. Please try again.';
      dispatch(setError(errorMessage));
    }
  };

  const handleForgotPasswordChange = (value: string) => {
    dispatch(updateForgotPasswordField({ field: 'email', value }));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotPasswordData.email) {
      dispatch(setError('Please enter your email'));
      return;
    }

    try {
      const result = await dispatch(forgotPassword(forgotPasswordData)).unwrap();
      dispatch(setSuccess(result.message || 'Reset link sent to your email'));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send reset email';
      dispatch(setError(errorMessage));
    }
  };

  // Clear errors when switching forms
  useEffect(() => {
    if (activeForm === 'login' || activeForm === 'register') {
      dispatch(setError(''));
      dispatch(setSuccess(''));
    }
  }, [activeForm, dispatch]);

  // Auto-clear success messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        dispatch(setSuccess(''));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, dispatch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-white/10 backdrop-blur-md border-b border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">DMS</h1>
            </div>
            <div className="text-sm text-white/80 font-medium">For Medical Centers</div>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error and Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl text-red-300 flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
            <button
              onClick={() => dispatch(setError(''))}
              className="text-red-300 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 backdrop-blur-md border border-green-500/20 rounded-2xl text-green-300 flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {success}
            </div>
            <button
              onClick={() => dispatch(setSuccess(''))}
              className="text-green-300 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {!isRegistered && activeForm === 'forgot' && (
          <div className="max-w-md mx-auto bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl">
            <h2 className="text-2xl text-white font-bold mb-4 text-center">Reset Password</h2>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                value={forgotPasswordData.email}
                onChange={(e) => handleForgotPasswordChange(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white"
                disabled={isLoading}
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-cyan-500 text-white py-3 rounded-xl font-semibold"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => dispatch(setActiveForm('login'))}
                className="w-full text-cyan-400 mt-2"
              >
                Back to login
              </button>
            </form>
          </div>
        )}

        {!isRegistered && activeForm !== 'forgot' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Login */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 hover:bg-white/15 transition-all duration-500">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-white/70">Sign in to your medical center account</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(e) => handleLoginChange('email', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                    placeholder="admin@medicalcenter.com"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => handleLoginChange('password', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-cyan-400 bg-white/5 border-white/20 rounded focus:ring-cyan-400"
                      disabled={isLoading}
                    />
                    <span className="ml-2 text-sm text-white/80">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => dispatch(setActiveForm('forgot'))}
                    className="text-sm text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Signing In...
                    </>
                  ) : (
                    'Sign In to Dashboard'
                  )}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-white/20">
                <div className="text-center">
                  <p className="text-white/70 mb-4">New to DMS?</p>
                  <button
                    onClick={() => {
                      dispatch(setActiveForm('register'));
                      dispatch(setError(''));
                      dispatch(setSuccess(''));
                    }}
                    disabled={isLoading}
                    className="w-full border-2 border-cyan-400 text-cyan-400 py-3 rounded-xl font-semibold hover:bg-cyan-400/10 transition-all duration-300 backdrop-blur-sm disabled:opacity-50"
                  >
                    Register Your Center
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side - Registration */}
            {activeForm === 'register' && (
              <div className="bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-blue-500/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 text-white hover:bg-white/5 transition-all duration-500">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-2">Join Our Network</h2>
                  <p className="text-white/70">
                    Register your medical facility with all required details
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 max-h-[700px] overflow-y-auto pr-4 custom-scrollbar">
                  <style jsx>{`
                    .custom-scrollbar::-webkit-scrollbar {
                      width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                      background: rgba(255, 255, 255, 0.1);
                      border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                      background: rgba(255, 255, 255, 0.3);
                      border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                      background: rgba(255, 255, 255, 0.5);
                    }
                  `}</style>

                  {/* Facility Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Facility Name *
                      </label>
                      <input
                        type="text"
                        value={formData.facility_name}
                        onChange={(e) => handleInputChange('facility_name', e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                        placeholder="Enter facility name"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Facility Type *
                      </label>
                      <select
                        value={formData.facility_type}
                        onChange={(e) => handleInputChange('facility_type', e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white backdrop-blur-sm"
                        disabled={isLoading}
                      >
                        {facilityTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Registration Numbers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Company Registration #
                      </label>
                      <input
                        type="text"
                        value={formData.company_reg_number}
                        onChange={(e) => handleInputChange('company_reg_number', e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                        placeholder="CIPC registration number"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Healthcare License # *
                      </label>
                      <input
                        type="text"
                        value={formData.healthcare_reg_number}
                        onChange={(e) => handleInputChange('healthcare_reg_number', e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                        placeholder="Department of Health license"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Official Domain Email *
                      </label>
                      <input
                        type="email"
                        value={formData.official_domain_email}
                        onChange={(e) => handleInputChange('official_domain_email', e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                        placeholder="admin@facility.co.za"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                        placeholder="+27 XX XXX XXXX"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Password Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                        placeholder="Enter password"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                        placeholder="Confirm password"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-white/90">
                        Facility Address *
                      </label>
                      <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={isGettingLocation || isLoading}
                        className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm transition-all duration-300 disabled:opacity-50 backdrop-blur-sm"
                      >
                        {isGettingLocation ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Getting Location...</span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <span>Use Current Location</span>
                          </>
                        )}
                      </button>
                    </div>

                    {locationError && (
                      <div
                        className={`p-3 rounded-lg text-sm backdrop-blur-sm ${
                          locationError.includes('successfully')
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {locationError}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-white/80 mb-1">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={formData.address.line1}
                        onChange={(e) => handleAddressChange('line1', e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                        placeholder="Street address line 1"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-white/80 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={formData.address.city}
                          onChange={(e) => handleAddressChange('city', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                          placeholder="City"
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/80 mb-1">
                          Province
                        </label>
                        <select
                          value={formData.address.province}
                          onChange={(e) => handleAddressChange('province', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white backdrop-blur-sm"
                          required
                          disabled={isLoading}
                        >
                          <option value="">Select Province</option>
                          {provinces.map((province) => (
                            <option key={province} value={province}>
                              {province}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/80 mb-1">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={formData.address.postal}
                          onChange={(e) => handleAddressChange('postal', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                          placeholder="Postal code"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bank Details Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-white/90 mb-2">Bank Details</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-white/80 mb-1">
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          value={formData.bankDetails.bank_name}
                          onChange={(e) => handleBankChange('bank_name', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                          placeholder="Enter bank name"
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/80 mb-1">
                          Account Number *
                        </label>
                        <input
                          type="text"
                          value={formData.bankDetails.account_number}
                          onChange={(e) => handleBankChange('account_number', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                          placeholder="Enter account number"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-white/80 mb-1">
                          Branch Code *
                        </label>
                        <input
                          type="text"
                          value={formData.bankDetails.bank_code}
                          onChange={(e) => handleBankChange('bank_code', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                          placeholder="Enter bank code"
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/80 mb-1">
                          Account Type *
                        </label>
                        <select
                          value={formData.bankDetails.account_type}
                          onChange={(e) => handleBankChange('account_type', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white backdrop-blur-sm"
                          required
                          disabled={isLoading}
                        >
                          <option value="">Select Account Type</option>
                          {accountTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Practitioners Section */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Responsible Practitioners *
                    </label>

                    {/* Add Practitioner Form */}
                    <div className="bg-white/10 rounded-xl p-4 mb-4 space-y-4 backdrop-blur-sm">
                      <h4 className="text-sm font-medium text-white/90">Add New Practitioner</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-white/80 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={newPractitioner.full_name}
                            onChange={(e) =>
                              handleNewPractitionerChange('full_name', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 text-sm backdrop-blur-sm"
                            placeholder="Full name"
                            disabled={isLoading}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-white/80 mb-1">
                            Role *
                          </label>
                          <select
                            value={newPractitioner.role}
                            onChange={(e) =>
                              handleNewPractitionerChange('role', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white text-sm backdrop-blur-sm"
                            disabled={isLoading}
                          >
                            {practitionerRoles.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-white/80 mb-1">
                            Professional License #
                          </label>
                          <input
                            type="text"
                            value={newPractitioner.professional_license_number}
                            onChange={(e) =>
                              handleNewPractitionerChange('professional_license_number', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 text-sm backdrop-blur-sm"
                            placeholder="License number"
                            disabled={isLoading}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-white/80 mb-1">
                            License Type
                          </label>
                          <select
                            value={newPractitioner.license_type}
                            onChange={(e) =>
                              handleNewPractitionerChange('license_type', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white text-sm backdrop-blur-sm"
                            disabled={isLoading}
                          >
                            {licenseTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-white/80 mb-1">
                            Contact Email *
                          </label>
                          <input
                            type="email"
                            value={newPractitioner.contact_email}
                            onChange={(e) =>
                              handleNewPractitionerChange('contact_email', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 text-sm backdrop-blur-sm"
                            placeholder="practitioner@email.com"
                            disabled={isLoading}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-white/80 mb-1">
                            Contact Phone
                          </label>
                          <input
                            type="tel"
                            value={newPractitioner.contact_phone}
                            onChange={(e) =>
                              handleNewPractitionerChange('contact_phone', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 text-sm backdrop-blur-sm"
                            placeholder="Phone number"
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddPractitioner}
                        disabled={isLoading}
                        className="w-full bg-white/10 text-white py-2 rounded-lg font-medium hover:bg-white/20 transition-all duration-300 text-sm backdrop-blur-sm disabled:opacity-50"
                      >
                        Add Practitioner
                      </button>
                    </div>

                    {/* Practitioners List */}
                    {formData.practitioners.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-white/90">
                          Added Practitioners ({formData.practitioners.length})
                        </h4>
                        {formData.practitioners.map((practitioner: Practitioner) => (
                          <div
                            key={practitioner.practitioner_id}
                            className="bg-white/10 rounded-lg p-3 backdrop-blur-sm"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-white/90">
                                    {practitioner.full_name}
                                  </span>
                                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full text-white/90">
                                    {practitionerRoles.find((r) => r.value === practitioner.role)?.label}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full ${
                                      practitioner.verification_status === 'verified'
                                        ? 'bg-green-500/20 text-green-300'
                                        : practitioner.verification_status === 'rejected'
                                        ? 'bg-red-500/20 text-red-300'
                                        : 'bg-yellow-500/20 text-yellow-300'
                                    }`}
                                  >
                                    {practitioner.verification_status}
                                  </span>
                                </div>
                                <div className="text-xs text-white/70 space-y-1">
                                  {practitioner.professional_license_number && (
                                    <div>
                                      License: {practitioner.professional_license_number} (
                                      {practitioner.license_type})
                                    </div>
                                  )}
                                  <div>Email: {practitioner.contact_email}</div>
                                  {practitioner.contact_phone && (
                                    <div>Phone: {practitioner.contact_phone}</div>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemovePractitioner(practitioner.practitioner_id)}
                                disabled={isLoading}
                                className="text-red-400 hover:text-red-300 text-sm ml-2 transition-colors disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || formData.practitioners.length === 0}
                    className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white py-3 rounded-xl font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Registering...
                      </>
                    ) : (
                      'Register Medical Facility'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          /* Success State */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-12 text-center hover:bg-white/15 transition-all duration-500">
              <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2 className="text-3xl font-bold text-white mb-4">Registration Submitted!</h2>
              <p className="text-white/70 text-lg mb-8">
                Thank you for registering{' '}
                <strong className="text-white">{formData.facility_name}</strong> with our platform.
                Our team will review your information and contact you within 24-48 hours.
              </p>

              <div className="bg-white/10 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                <h3 className="font-semibold text-white mb-3">What happens next?</h3>
                <div className="space-y-3 text-sm text-white/70">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs">
                      1
                    </div>
                    <span>Verification of facility credentials and documents</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs">
                      2
                    </div>
                    <span>Practitioner license verification</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs">
                      3
                    </div>
                    <span>Bank details verification</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs">
                      4
                    </div>
                    <span>Onboarding call with our team</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs">
                      5
                    </div>
                    <span>Access to your professional dashboard</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => {
                    dispatch(setIsRegistered(false));
                    dispatch(setActiveForm('login'));
                  }}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 backdrop-blur-sm"
                >
                  Back to Login
                </button>
                <button className="border-2 border-cyan-400 text-cyan-400 px-8 py-3 rounded-xl font-semibold hover:bg-cyan-400/10 transition-all duration-300 backdrop-blur-sm">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}