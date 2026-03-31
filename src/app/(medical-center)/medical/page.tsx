'use client';

import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/redux/store';
import {
  setActiveForm,
  setIsRegistered,
  setError,
  setSuccess,
  updateFormField,
  updateAddressField,
  updateBankField,
  updateLoginField,
  registerMedicalCenter,
  loginUser,
  forgotPassword,
  updateForgotPasswordField,
} from '@/app/redux/slices/medicalSlice';
import { useEffect, useState, useCallback } from 'react';
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';

// --- Google Maps configuration ---
const libraries: 'places'[] = ['places'];
const mapContainerStyle = { width: '100%', height: '300px' };
const defaultCenter = { lat: -25.746111, lng: 28.188056 }; // Pretoria, South Africa

export default function MedicalCenterPortal() {
  const dispatch = useDispatch<AppDispatch>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Local loading state for current location
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Redux state
  const medicalCenterState = useSelector((state: RootState) => state.medicalCenter);

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
        line2: '',
        city: '',
        province: '',
        postal: '',
        full_address: '',
        formatted_address: '',
        place_id: '',
        lat: null,
        lng: null,
        location_source: 'address',
        is_location_verified: false,
      },
      practitioners: [],
      bankDetails: {
        bank_name: '',
        account_number: '',
        bank_code: '',
        account_type: 'current',
      },
    },
    loginData = {
      email: '',
      password: '',
    },
    forgotPasswordData = { email: '' },
  } = medicalCenterState || {};

  // --- Google Maps API loading ---
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  // --- Place Autocomplete logic (initialized after script loads) ---
  const {
    ready,
    init,
    value: autocompleteValue,
    setValue: setAutocompleteValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    initOnMount: false, // Wait until Google script is loaded
    debounce: 300,
    requestOptions: {
      componentRestrictions: { country: 'za' },
      // types: ['address'], // Removed to allow broader matching
    },
  });

  // Initialize autocomplete after Maps API is loaded
  useEffect(() => {
    if (isLoaded) {
      init();
    }
  }, [isLoaded, init]);

  // Handle place selection from dropdown
  const handlePlaceSelect = async (placeId: string) => {
    const selected = data.find((place) => place.place_id === placeId);
    if (!selected) return;

    setAutocompleteValue(selected.description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ placeId: selected.place_id });
      const { lat, lng } = await getLatLng(results[0]);

      // Extract address components
      const addressComponents = results[0].address_components;
      let streetNumber = '';
      let route = '';
      let city = '';
      let province = '';
      let postalCode = '';

      for (const comp of addressComponents) {
        const types = comp.types;
        if (types.includes('street_number')) streetNumber = comp.long_name;
        if (types.includes('route')) route = comp.long_name;
        if (types.includes('locality')) city = comp.long_name;
        if (types.includes('administrative_area_level_1')) province = comp.long_name;
        if (types.includes('postal_code')) postalCode = comp.long_name;
      }

      const line1 = streetNumber && route ? `${streetNumber} ${route}` : route;
      const formattedAddress = results[0].formatted_address;

      // Update Redux address state
      dispatch(updateAddressField({ field: 'line1', value: line1 }));
      dispatch(updateAddressField({ field: 'line2', value: '' }));
      dispatch(updateAddressField({ field: 'city', value: city }));
      dispatch(updateAddressField({ field: 'province', value: province }));
      dispatch(updateAddressField({ field: 'postal', value: postalCode }));
      dispatch(updateAddressField({ field: 'full_address', value: formattedAddress }));
      dispatch(updateAddressField({ field: 'formatted_address', value: formattedAddress }));
      dispatch(updateAddressField({ field: 'place_id', value: selected.place_id }));
      dispatch(updateAddressField({ field: 'lat', value: lat }));
      dispatch(updateAddressField({ field: 'lng', value: lng }));
      dispatch(updateAddressField({ field: 'location_source', value: 'autocomplete' }));
      dispatch(updateAddressField({ field: 'is_location_verified', value: true }));
    } catch (error) {
      console.error('Error getting geocode:', error);
      dispatch(setError('Failed to get address details. Please try again.'));
    }
  };

  // Manual address search (search button or Enter key)
  const handleManualAddressSearch = async () => {
    if (!autocompleteValue.trim()) {
      dispatch(setError('Please enter an address'));
      return;
    }

    try {
      const results = await getGeocode({
        address: autocompleteValue,
        componentRestrictions: { country: 'ZA' },
      });

      if (!results.length) {
        dispatch(setError('Address not found. Please enter a more complete address.'));
        return;
      }

      const firstResult = results[0];
      const { lat, lng } = await getLatLng(firstResult);

      // Extract address components
      const addressComponents = firstResult.address_components;
      let streetNumber = '';
      let route = '';
      let city = '';
      let province = '';
      let postalCode = '';

      for (const comp of addressComponents) {
        const types = comp.types;
        if (types.includes('street_number')) streetNumber = comp.long_name;
        if (types.includes('route')) route = comp.long_name;
        if (types.includes('locality')) city = comp.long_name;
        if (types.includes('administrative_area_level_1')) province = comp.long_name;
        if (types.includes('postal_code')) postalCode = comp.long_name;
      }

      const line1 = streetNumber && route ? `${streetNumber} ${route}` : route;
      const formattedAddress = firstResult.formatted_address;

      // Update Redux address state
      dispatch(updateAddressField({ field: 'line1', value: line1 }));
      dispatch(updateAddressField({ field: 'line2', value: '' }));
      dispatch(updateAddressField({ field: 'city', value: city }));
      dispatch(updateAddressField({ field: 'province', value: province }));
      dispatch(updateAddressField({ field: 'postal', value: postalCode }));
      dispatch(updateAddressField({ field: 'full_address', value: formattedAddress }));
      dispatch(updateAddressField({ field: 'formatted_address', value: formattedAddress }));
      dispatch(updateAddressField({ field: 'place_id', value: firstResult.place_id || '' }));
      dispatch(updateAddressField({ field: 'lat', value: lat }));
      dispatch(updateAddressField({ field: 'lng', value: lng }));
      dispatch(updateAddressField({ field: 'location_source', value: 'manual_search' }));
      dispatch(updateAddressField({ field: 'is_location_verified', value: true }));

      clearSuggestions();
      setAutocompleteValue(formattedAddress, false);
      dispatch(setSuccess('Address found and verified.'));
    } catch (error) {
      console.error('Manual address search error:', error);
      dispatch(setError('Could not verify this address. Please refine it.'));
    }
  };

  // Sync autocomplete input with Redux when address changes
  useEffect(() => {
    if (formData.address.formatted_address) {
      setAutocompleteValue(formData.address.formatted_address, false);
    }
  }, [formData.address.formatted_address, setAutocompleteValue]);

  // --- Current location handler with high accuracy and reverse geocoding ---
 

  // --- Handlers ---
  const handleInputChange = (field: string, value: string | boolean | number) => {
    dispatch(updateFormField({ field, value }));
  };

  const handleBankChange = (field: string, value: string) => {
    dispatch(updateBankField({ field, value }));
  };

  const handleLoginChange = (field: string, value: string) => {
    dispatch(updateLoginField({ field, value }));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.facility_name ||
      !formData.healthcare_reg_number ||
      !formData.official_domain_email ||
      !formData.address.formatted_address ||
      !formData.address.lat ||
      !formData.address.lng ||
      !password
    ) {
      dispatch(setError('Please fill in all required fields including a valid address and password'));
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

    if (
      !formData.bankDetails.bank_name ||
      !formData.bankDetails.account_number ||
      !formData.bankDetails.bank_code
    ) {
      dispatch(setError('Please fill in all bank details fields'));
      return;
    }

    try {
      const registrationData = {
        ...formData,
        password: password,
        practitioners: formData.practitioners || [],
      };

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

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        dispatch(setSuccess(''));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, dispatch]);

  // --- Map preview center ---
  const mapCenter = {
    lat: formData.address.lat ?? defaultCenter.lat,
    lng: formData.address.lng ?? defaultCenter.lng,
  };

  // Determine if autocomplete is ready for user interaction
  const isAutocompleteReady = isLoaded && ready;

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
              <h1 className="text-2xl font-bold text-white">MS</h1>
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
            {/* Login Side */}
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
                  <p className="text-white/70 mb-4">New to MS?</p>
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

            {/* Registration Side */}
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
                        className="w-full px-4 py-3 bg-purple-800/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white backdrop-blur-sm"
                        disabled={isLoading}
                      >
                        <option value="surgery" className="bg-purple-900 text-white">🏥 Surgery</option>
                        <option value="clinic" className="bg-purple-900 text-white">🩺 Clinic</option>
                        <option value="hospital" className="bg-purple-900 text-white">🏨 Hospital</option>
                        <option value="community_health" className="bg-purple-900 text-white">🌍 Community Health</option>
                        <option value="mobile_unit" className="bg-purple-900 text-white">🚐 Mobile Unit</option>
                        <option value="other" className="bg-purple-900 text-white">⚕️ Other</option>
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

                  {/* Address Section - Single Google Places Input with Search Icon */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-white/90">
                        Facility Address *
                      </label>
                     
                    </div>

                    {loadError && (
                      <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                        Google Maps failed to load. Check API key, billing, Places API, and domain restrictions.
                      </div>
                    )}

                    {/* Address input with search button */}
                    <div>
                      <label className="block text-xs font-medium text-white/80 mb-1">
                        Search Address *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={autocompleteValue}
                          onChange={(e) => setAutocompleteValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleManualAddressSearch();
                            }
                          }}
                          disabled={isLoading || !isLoaded}
                          placeholder="Type address e.g. 123 Mandela Street, Polokwane"
                          className="w-full px-4 py-3 pr-14 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white placeholder-white/50 backdrop-blur-sm"
                        />
                        <button
                          type="button"
                          onClick={handleManualAddressSearch}
                          disabled={isLoading || !isLoaded || !autocompleteValue.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Search address"
                        >
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Autocomplete suggestions */}
                      {status === 'OK' && data.length > 0 && (
                        <ul className="mt-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 max-h-48 overflow-auto">
                          {data.map((suggestion) => (
                            <li
                              key={suggestion.place_id}
                              onClick={() => handlePlaceSelect(suggestion.place_id)}
                              className="px-4 py-2 hover:bg-white/20 cursor-pointer text-white text-sm"
                            >
                              {suggestion.description}
                            </li>
                          ))}
                        </ul>
                      )}

                      {autocompleteValue && status !== 'OK' && isLoaded && (
                        <p className="mt-2 text-xs text-white/60">
                          No live suggestions yet. You can still click the search icon to verify the address.
                        </p>
                      )}
                    </div>

                    {/* Display the selected address */}
                    {formData.address.formatted_address && (
                      <div className="bg-white/10 rounded-xl p-3 text-sm text-white/80 backdrop-blur-sm">
                        <div className="text-cyan-300">Selected address:</div>
                        <div className="mt-1">{formData.address.formatted_address}</div>
                      </div>
                    )}

                    {/* Map Preview */}
                    {isLoaded && (
                      <div className="mt-4 rounded-xl overflow-hidden border border-white/20">
                        <GoogleMap
                          mapContainerStyle={mapContainerStyle}
                          center={mapCenter}
                          zoom={14}
                          options={{
                            zoomControl: true,
                            streetViewControl: false,
                            mapTypeControl: false,
                          }}
                        >
                          {formData.address.lat && formData.address.lng && (
                            <Marker position={mapCenter} />
                          )}
                        </GoogleMap>
                      </div>
                    )}
                  </div>

                  {/* Bank Details */}
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
                          className="w-full px-4 py-3 bg-purple-800/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 text-white backdrop-blur-sm"
                          required
                          disabled={isLoading}
                        >
                          <option value="current" className="bg-purple-900 text-white">Current Account</option>
                          <option value="savings" className="bg-purple-900 text-white">Savings Account</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
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
                    <span>Bank details verification</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs">
                      3
                    </div>
                    <span>Onboarding call with our team</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs">
                      4
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