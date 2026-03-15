'use client';

import { useRouter } from 'next/navigation';
import PulseBackground from './(patient)/components/PulseBackground';

export default function MedicalLandingPage() {
  const router = useRouter();

  return (
    <>
      <PulseBackground />
      <main className="min-h-screen flex flex-col items-center justify-center px-3 sm:px-6 lg:px-8 py-6 sm:py-10 relative z-10">
        <div className="w-full max-w-6xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold text-white mb-4 sm:mb-6 leading-snug sm:leading-tight break-words">
            Dynamic{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-blue-300 to-cyan-300 block sm:inline">
              Medicare Syndicate
            </span>
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-violet-100 mb-6 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
            Book your next appointment at the medical center of your choice. If you're a medical center,
            manage your appointments smartly and connect your branches under one network.
          </p>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 sm:p-8 lg:p-10 border border-white/20 shadow-xl mb-8 sm:mb-12 mx-2 sm:mx-auto w-full max-w-2xl">
            <p className="text-violet-200 text-sm sm:text-base mb-6">Select your role to start your healthcare journey</p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
              <button
                onClick={() => router.push('/createprofile')}
                className="group relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-10 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 w-full sm:w-auto text-sm sm:text-base"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Patient
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>

              <button
                onClick={() => router.push('/medical')}
                className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3 sm:py-4 px-6 sm:px-10 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 w-full sm:w-auto text-sm sm:text-base"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Medical Center
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
              <button
                onClick={() => router.push('/doctorLogin')}
                className="group relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-10 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 w-full sm:w-auto text-sm sm:text-base"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Doctor/Practitioner
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-white max-w-4xl mx-auto">
            {[
              { color: 'bg-violet-500', title: '24/7 Access', desc: 'Round-the-clock access to healthcare services and support', icon: (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />) },
              { color: 'bg-blue-500', title: 'Secure & Private', desc: 'Your medical data is protected with enterprise-grade security', icon: (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />) },
              { color: 'bg-purple-500', title: 'Expert Network', desc: 'Connect with qualified healthcare professionals worldwide', icon: (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0zM7 10a2 2 0 11-4 0 2 2 0z" />) },
            ].map((feature, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-lg rounded-xl p-4 sm:p-6 border border-white/10 text-center sm:text-left">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${feature.color} rounded-lg flex items-center justify-center mb-3 sm:mb-4 mx-auto sm:mx-0`}>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{feature.icon}</svg>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-violet-200 text-sm sm:text-base">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}