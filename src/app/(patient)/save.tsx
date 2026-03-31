// app/patient-dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function PatientDashboard() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('nearby');

  // Mock medical centers data
  const medicalCenters = [
    {
      id: 1,
      name: "City General Hospital",
      address: "123 Medical Drive, Downtown",
      distance: "0.8 km",
      rating: 4.8,
      visits: 1247,
      bookingsToday: 89,
      specialties: ["Emergency", "Surgery", "Cardiology"],
      image: "/hospital-1.jpg"
    },
    {
      id: 2,
      name: "Unity Medical Center",
      address: "456 Health Avenue, Midtown",
      distance: "1.2 km",
      rating: 4.6,
      visits: 987,
      bookingsToday: 67,
      specialties: ["Pediatrics", "Orthopedics", "Dermatology"],
      image: "/hospital-2.jpg"
    },
    {
      id: 3,
      name: "Premium Care Clinic",
      address: "789 Wellness Street, Uptown",
      distance: "2.1 km",
      rating: 4.9,
      visits: 1563,
      bookingsToday: 112,
      specialties: ["Cosmetic", "Dental", "Wellness"],
      image: "/hospital-3.jpg"
    }
  ];

  const bestRated = [...medicalCenters].sort((a, b) => b.rating - a.rating);
  const mostVisited = [...medicalCenters].sort((a, b) => b.visits - a.visits);
  const highBookings = [...medicalCenters].sort((a, b) => b.bookingsToday - a.bookingsToday);

  const getCurrentList = () => {
    switch (activeTab) {
      case 'nearby': return medicalCenters;
      case 'rated': return bestRated;
      case 'visited': return mostVisited;
      case 'bookings': return highBookings;
      default: return medicalCenters;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">MS</h1>
            </div>
            
            {!isLoggedIn ? (
              <div className="flex space-x-4">
                <button 
                  onClick={() => setIsLoggedIn(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg"
                >
                  Sign In
                </button>
                <button className="border-2 border-blue-500 text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-300">
                  Create Profile
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Welcome, Patient!</span>
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  P
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-3xl p-8 text-white mb-8 shadow-2xl">
          <h1 className="text-4xl font-bold mb-4">Find Your Perfect Medical Center</h1>
          <p className="text-blue-100 text-lg mb-6">
            Discover top-rated healthcare facilities near you. Book appointments instantly with trusted medical professionals.
          </p>
          <div className="flex space-x-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex-1">
              <div className="text-2xl font-bold">{medicalCenters.length}+</div>
              <div className="text-blue-100">Medical Centers</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex-1">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-blue-100">Available</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex-1">
              <div className="text-2xl font-bold">98%</div>
              <div className="text-blue-100">Satisfaction</div>
            </div>
          </div>
        </div>

        {/* Login Prompt */}
        {!isLoggedIn && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8 shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Create your profile to book appointments</h3>
                <p className="text-gray-600">Sign in or register to access our booking system and manage your healthcare journey.</p>
              </div>
              <button 
                onClick={() => setIsLoggedIn(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
              >
                Get Started
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Medical Centers List */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-lg p-2 mb-6 flex space-x-2">
              {[
                { id: 'nearby', label: '🏥 Nearby Centers', count: medicalCenters.length },
                { id: 'rated', label: '⭐ Best Rated', count: bestRated.length },
                { id: 'visited', label: '👥 Most Visited', count: mostVisited.length },
                { id: 'bookings', label: '📈 High Bookings', count: highBookings.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>{tab.label.split(' ')[0]}</span>
                    <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                      {tab.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Medical Centers Grid */}
            <div className="space-y-6">
              {getCurrentList().map((center) => (
                <div key={center.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                          {center.name.split(' ').map(w => w[0]).join('')}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 mb-1">{center.name}</h3>
                          <p className="text-gray-600 mb-2">{center.address}</p>
                          <div className="flex flex-wrap gap-2">
                            {center.specialties.map((specialty, index) => (
                              <span key={index} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1 mb-2 justify-end">
                          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                          <span className="font-bold text-gray-800">{center.rating}</span>
                        </div>
                        <div className="text-sm text-gray-500">{center.distance} away</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                      <div className="flex space-x-6 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>{center.visits} visits</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{center.bookingsToday} bookings today</span>
                        </div>
                      </div>
                      <button 
                        className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 ${
                          isLoggedIn 
                            ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!isLoggedIn}
                      >
                        {isLoggedIn ? 'Book Now' : 'Login to Book'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📍 Medical Centers Map</h2>
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl h-96 flex items-center justify-center mb-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">Interactive Map View</p>
                  <p className="text-gray-500 text-sm mt-2">Showing {medicalCenters.length} centers near you</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <div className="font-semibold text-gray-800">Your Location</div>
                    </div>
                  </div>
                </div>
                
                {medicalCenters.slice(0, 3).map((center, index) => (
                  <div key={center.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-xl transition-colors duration-200">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-green-500' : index === 1 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{center.name}</div>
                      <div className="text-sm text-gray-500">{center.distance} • {center.bookingsToday} bookings</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}