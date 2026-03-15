'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/app/reduxPatient/store';
import {
  fetchMedicalCenters,
  loadPatientInfo,
  setSearchTerm,
  setActiveFilter,
  setSortBy,
  logout,
  selectMedicalCenters,
  selectFilteredCenters,
  selectLoading,
  selectError,
  selectSearchTerm,
  selectActiveFilter,
  selectSortBy,
  selectPatientInfo,
  selectStats,
  getInitials,
  formatAddress,
  getSpecialties,
  type FilterType,
  type MedicalCenter,
} from '@/app/reduxPatient/slices/patient/landing';

export default function EntryPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Select state from Redux
  const medicalCenters = useAppSelector(selectMedicalCenters);
  const filteredCenters = useAppSelector(selectFilteredCenters);
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);
  const searchTerm = useAppSelector(selectSearchTerm);
  const activeFilter = useAppSelector(selectActiveFilter);
  const sortBy = useAppSelector(selectSortBy);
  const patientInfo = useAppSelector(selectPatientInfo);
  const stats = useAppSelector(selectStats);

  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    hasPatientInfo: !!patientInfo,
    medicalCentersCount: medicalCenters.length,
    filteredCentersCount: filteredCenters.length,
    stats: stats
  });

  // Update debug info when state changes
  useEffect(() => {
    setDebugInfo({
      hasPatientInfo: !!patientInfo,
      medicalCentersCount: medicalCenters.length,
      filteredCentersCount: filteredCenters.length,
      stats: stats
    });
  }, [patientInfo, medicalCenters, filteredCenters, stats]);

  // Initialize
  useEffect(() => {
    console.log('🏁 Initializing EntryPage...');
    console.log('👤 Loading patient info...');
    dispatch(loadPatientInfo());
    
    console.log('🏥 Fetching medical centers...');
    dispatch(fetchMedicalCenters());
  }, [dispatch]);

  // Handle logout
  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
    router.refresh();
  };

  // Handle book appointment button click
  const handleBookAppointment = (centerId: string) => {
    localStorage.setItem('medicalCenterId', centerId);
    router.push(`/booking?medicalCenterId=${centerId}`);
  };

  // Handle view schedule button click
  const handleViewSchedule = (centerId: string) => {
    localStorage.setItem('medicalCenterId', centerId);
    router.push(`/booking?medicalCenterId=${centerId}&view=schedule`);
  };

  // Quick filter buttons
  const filterButtons = [
    { id: 'all' as FilterType, label: 'All Centers', count: stats.totalCenters },
    { id: 'hospital' as FilterType, label: 'Hospitals', count: stats.hospitals },
    { id: 'clinic' as FilterType, label: 'Clinics', count: stats.clinics },
    { id: 'verified' as FilterType, label: 'Verified', count: stats.verifiedCenters },
    { id: 'active' as FilterType, label: 'Active', count: stats.activeCenters },
  ];

  // Debug: Log state changes
  useEffect(() => {
    console.log('📊 Current Redux State:', {
      loading,
      error,
      medicalCentersCount: medicalCenters.length,
      filteredCentersCount: filteredCenters.length,
      stats,
      searchTerm,
      activeFilter,
      sortBy,
      patientInfo: patientInfo ? `${patientInfo.firstName} ${patientInfo.lastName}` : 'No patient info'
    });
  }, [loading, error, medicalCenters, filteredCenters, stats, searchTerm, activeFilter, sortBy, patientInfo]);

  // If still loading initial data
  if (loading && medicalCenters.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Medical Centers</h3>
          <p className="text-gray-500">Please wait while we fetch healthcare facilities...</p>
          <div className="mt-4 text-sm text-gray-600">
            <p>Debug Info:</p>
            <p>Patient Info: {debugInfo.hasPatientInfo ? 'Loaded' : 'Not loaded'}</p>
            <p>Medical Centers: {debugInfo.medicalCentersCount}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Healthcare Connect</h1>
                <p className="text-xs text-gray-500">Find & book medical appointments</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600">Patient:</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {patientInfo ? `${patientInfo.firstName} ${patientInfo.lastName}` : 'Loading...'}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-1.5 rounded-lg font-semibold text-sm hover:from-red-600 hover:to-pink-700 transition-all duration-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        {/* Hero Section */}
        <div className="space-y-5 sm:space-y-6">
          {/* Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-purple-700 rounded-xl sm:rounded-2xl p-5 sm:p-6 text-white shadow-lg">
            <div className="relative z-10">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 leading-tight">
                Welcome back, <span className="text-cyan-300">{patientInfo?.firstName || 'Patient'}!</span>
              </h1>
              <p className="text-blue-100 text-sm sm:text-base md:text-lg mb-6 sm:mb-8">
                Browse medical centers and book appointments with ease
              </p>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/30 rounded-lg flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-grow">
                      <div className="text-xl sm:text-2xl font-bold mb-1">{stats.totalCenters}</div>
                      <div className="text-blue-100 text-xs sm:text-sm">Medical Centers</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/30 rounded-lg flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-grow">
                      <div className="text-xl sm:text-2xl font-bold mb-1">{stats.totalPractitioners}</div>
                      <div className="text-blue-100 text-xs sm:text-sm">Doctors</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/30 rounded-lg flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-grow">
                      <div className="text-xl sm:text-2xl font-bold mb-1">Instant</div>
                      <div className="text-blue-100 text-xs sm:text-sm">Booking</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Search and Filter Section */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-100">
            {/* Search Bar */}
            <div className="relative mb-5 sm:mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 1114 0 7 7 0 01-14 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, location, or specialty..."
                className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 sm:focus:ring-4 focus:ring-blue-100 transition-all duration-300 placeholder-gray-500"
                value={searchTerm}
                onChange={(e) => dispatch(setSearchTerm(e.target.value))}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <span className="text-xs sm:text-sm text-gray-400 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">
                  {filteredCenters.length} centers
                </span>
              </div>
            </div>
            
            {/* Filter Buttons */}
            <div className="mb-5 sm:mb-6">
              <div className="text-xs sm:text-sm font-semibold text-gray-600 mb-2 sm:mb-3 flex items-center gap-2">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                FILTER BY
              </div>
              <div className="flex space-x-2 sm:space-x-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {filterButtons.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => dispatch(setActiveFilter(filter.id))}
                    className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap ${
                      activeFilter === filter.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {filter.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      activeFilter === filter.id
                        ? 'bg-white/30'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Sort and Refresh Row */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:mb-6">
              {/* Sort Dropdown */}
              <div className="flex-1">
                <div className="text-xs sm:text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                  </svg>
                  SORT BY
                </div>
                <div className="relative">
                  <select
                    className="appearance-none w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl sm:rounded-lg bg-white text-sm sm:text-base text-gray-700 font-medium focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer pr-10"
                    value={sortBy}
                    onChange={(e) => dispatch(setSortBy(e.target.value as any))}
                  >
                    <option value="name">Name (A to Z)</option>
                    <option value="rating">Highest Rating</option>
                    <option value="patients">Most Patients</option>
                    <option value="practitioners">Most Doctors</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7l-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Refresh Button */}
              <div className="flex flex-col justify-end">
                <button
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered');
                    dispatch(fetchMedicalCenters());
                  }}
                  disabled={loading}
                  className="group relative px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl sm:rounded-lg text-sm sm:text-base shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/20 to-emerald-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Refresh</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
            <div className="font-bold text-yellow-800 mb-1">Debug Info:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>Loading: {loading ? 'Yes' : 'No'}</div>
              <div>Error: {error || 'None'}</div>
              <div>Medical Centers: {medicalCenters.length}</div>
              <div>Filtered Centers: {filteredCenters.length}</div>
              <div>Active Filter: {activeFilter}</div>
              <div>Search Term: {searchTerm}</div>
            </div>
          </div>
        )}

        {/* Results Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
            {filteredCenters.length} Medical Center{filteredCenters.length !== 1 ? 's' : ''} Found
          </h2>
          <div className="text-xs sm:text-sm text-gray-500">
            Showing {filteredCenters.length} of {medicalCenters.length} centers
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 sm:p-6 md:p-8 text-center mb-5 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-red-700 mb-2">Error Loading Centers</h3>
            <p className="text-red-600 text-sm sm:text-base mb-4">{error}</p>
            <button 
              onClick={() => dispatch(fetchMedicalCenters())}
              className="bg-red-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Medical Centers Grid */}
        {!loading && !error && filteredCenters.length > 0 && (
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            {filteredCenters.map((center: MedicalCenter) => {
              if (!center) return null;
              
              return (
                <div 
                  key={center._id} 
                  className="bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden"
                >
                  {/* Header gradient */}
                  <div 
                    className="h-2 w-full"
                    style={{
                      background: `linear-gradient(90deg, ${center.theme_colors?.primary || '#3B82F6'}, ${center.theme_colors?.secondary || '#10B981'})`
                    }}
                  ></div>
                  
                  <div className="p-4 sm:p-5 md:p-6">
                    {/* Header with logo and info */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3 sm:gap-0">
                      <div className="flex items-start space-x-3 sm:space-x-4">
                        {/* Logo */}
                        <div 
                          className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md flex-shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${center.theme_colors?.primary || '#3B82F6'}, ${center.theme_colors?.secondary || '#10B981'})`
                          }}
                        >
                          {getInitials(center.facility_name)}
                        </div>
                        
                        {/* Basic Info */}
                        <div className="flex-grow">
                          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-1 line-clamp-1">
                            {center.facility_name || 'Unnamed Center'}
                          </h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                            <span className={`px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                              center.facility_type === 'hospital' ? 'bg-red-100 text-red-800' :
                              center.facility_type === 'clinic' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {(center.facility_type || 'unknown').toUpperCase()}
                            </span>
                            {center.is_verified && (
                              <span className="px-2 py-0.5 sm:py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                VERIFIED
                              </span>
                            )}
                            {center.is_active && (
                              <span className="px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-xs sm:text-sm flex items-start sm:items-center mt-1">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="line-clamp-2">{formatAddress(center)}</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Rating and Distance */}
                      <div className="flex items-center justify-between sm:block sm:text-right">
                        <div className="sm:hidden">
                          <span className="text-xs text-gray-500">{Math.floor(Math.random() * 20) + 1} km</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                          <span className="font-bold text-gray-800 text-base sm:text-lg">
                            {(center.statistics?.average_rating || 0).toFixed(1)}
                          </span>
                        </div>
                        <div className="hidden sm:block text-xs sm:text-sm text-gray-500 mt-1">{Math.floor(Math.random() * 20) + 1} km</div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                      <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg sm:text-xl font-bold text-blue-700">{center.practitioners?.length || 0}</div>
                        <div className="text-xs text-blue-600 font-medium">Doctors</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                        <div className="text-lg sm:text-xl font-bold text-green-700">
                          {(center.statistics?.total_patients || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-green-600 font-medium">Patients</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg">
                        <div className="text-lg sm:text-xl font-bold text-purple-700">
                          {(center.statistics?.monthly_appointments || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-purple-600 font-medium">Monthly</div>
                      </div>
                    </div>

                    {/* Specialties */}
                    {getSpecialties(center).length > 0 && (
                      <div className="mb-4 sm:mb-6">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Available Specialties:</h4>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {getSpecialties(center).map((specialty: string, index: number) => (
                            <span key={index} className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs sm:text-sm">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-4 border-t border-gray-100">
                      <div className="text-xs text-gray-500 w-full sm:w-auto truncate">
                        Document ID: {center._id?.slice(0, 8) || 'N/A'}...
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => handleViewSchedule(center._id)}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm hover:from-blue-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          View Schedule
                        </button>
                        <button 
                          onClick={() => handleBookAppointment(center._id)}
                          className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm hover:from-green-600 hover:to-blue-600 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          Book Appointment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty Results */}
        {!loading && !error && filteredCenters.length === 0 && medicalCenters.length > 0 && (
          <div className="text-center py-8 sm:py-12 bg-white rounded-xl shadow-lg">
            <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">No centers match your search</h3>
            <p className="text-gray-500 text-sm sm:text-base mb-4 sm:mb-6">Try adjusting your filters or search term</p>
            <button 
              onClick={() => {
                dispatch(setSearchTerm(''));
                dispatch(setActiveFilter('all'));
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Initial Empty State */}
        {!loading && !error && medicalCenters.length === 0 && (
          <div className="text-center py-8 sm:py-12 bg-white rounded-xl shadow-lg">
            <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">No Medical Centers Found</h3>
            <p className="text-gray-500 text-sm sm:text-base mb-4 sm:mb-6">There are no medical centers registered.</p>
            <button 
              onClick={() => dispatch(fetchMedicalCenters())}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
            >
              Refresh List
            </button>
          </div>
        )}
      </main>

      {/* Global Styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-1 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
        }
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      `}</style>
    </div>
  );
}