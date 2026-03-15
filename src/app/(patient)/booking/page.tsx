'use client';

import { useState, useEffect, useCallback, useMemo, JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import * as bookingActions from '@/app/reduxPatient/slices/patient/bookingSlice';
import { RootState, AppDispatch } from '@/app/redux/store';
import { ToastContainer, toast, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import type  DoctorForBooking  from '@/app/reduxPatient/slices/patient/bookingSlice';

// ============ SIMPLIFIED TYPES ============
interface Doctor {
  doctorId: string;
  doctorName: string;
  role?: string;
  specialization: string[];
  colorCode: string;
  isBooked?: boolean;
  isAvailable?: boolean;
  maxPatients: number;
  currentPatients: number;
  availableSlots: number;
  consultationType: string;
}

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  capacity: number;
  availableCapacity: number;
  type: string;
  isPeakHour: boolean;
  assignedDoctors?: Doctor[];
  specialization?: string;
  specializations?: string[];
  consultationType?: string;
}

interface DailySchedule {
  date: string;
  dayName: string;
  isWorking: boolean;
  timeSlots: TimeSlot[];
}

interface MedicalCenter {
  _id: string;
  facility_name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    province: string;
  };
}

interface PatientInfo {
  _id: string;
  name: string;
  email: string;
}

interface Appointment {
  _id: string;
  appointment_id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'failed';
  payment_status: 'pending' | 'success' | 'failed' | 'refunded' |'paid'| 'none';

  date: string;
  slot_id: string;
  reason_for_visit: string;
  practitioner_id: string;
  created_at: string;
}

// ============ UTILITY FUNCTIONS ============
const utils = {
  formatAddress: (center: MedicalCenter | null) => center?.address ? 
    [center.address.line1, center.address.line2, center.address.city, center.address.province]
      .filter(Boolean).join(', ') : 'Address not available',
  
  formatTime: (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  },
  
  formatDate: (dateString: string) => new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }),
  
  getInitials: (name: string) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) : 'MC',
  
  getSlotStatus: (slot: TimeSlot) => {
    if (!slot.assignedDoctors?.length) return { status: 'no-doctors', availableDoctors: 0, bookedDoctors: 0 };
    const availableDoctors = slot.assignedDoctors.filter(d => !d.isBooked).length;
    const bookedDoctors = slot.assignedDoctors.filter(d => d.isBooked).length;

    return {
      status: availableDoctors > 0 ? 'available' : 'all-booked',
      availableDoctors,
      bookedDoctors
    };
  },
  
  // UPDATED: Get doctor status based ONLY on isBooked
  getDoctorStatus: (doctor: Doctor) => {
    if (doctor.isBooked) {
      return { text: 'Booked', color: 'text-red-600', bg: 'bg-red-100', icon: '❌' };
    }
    return { text: 'Available', color: 'text-green-600', bg: 'bg-green-100', icon: '✅' };
  }
};

// ============ SIMPLIFIED UI COMPONENTS ============
const ScrollableContainer = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`overflow-y-auto ${className}`}>
    {children}
  </div>
);

const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/80 border border-white/20 shadow-lg rounded-xl ${className}`}>
    {children}
  </div>
);

const GradientBackground = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
    {children}
  </div>
);

const Icon = ({ name, className = '' }: { name: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    clock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    location: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></>,
    building: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    lock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    microphone: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />,
    warning: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z" />,
    error: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    chevron: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />,
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
    close: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
    refresh: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
    spinner: <><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></>
  };
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">{icons[name]}</svg>;
};

// ============ COMPACT COMPONENTS ============
const PaymentStatusIndicator = ({ status }: { status: string }) => {
  const configs: Record<string, { color: string; bg: string; icon: string; text: string }> = {
    pending: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: '⏳', text: 'Awaiting Payment' },
    paid: { color: 'text-blue-600', bg: 'bg-blue-100', icon: '✅', text: 'Payment Verified' },
    confirmed: { color: 'text-green-600', bg: 'bg-green-100', icon: '🎉', text: 'Appointment Confirmed' },
    failed: { color: 'text-red-600', bg: 'bg-red-100', icon: '❌', text: 'Payment Failed' },
    default: { color: 'text-gray-600', bg: 'bg-gray-100', icon: '📋', text: 'Ready to Book' }
  };
  const config = configs[status] || configs.default;
  return <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.bg} ${config.color} font-medium`}><span>{config.icon}</span><span>{config.text}</span></div>;
};

const DoctorAvatar = ({ doctor, size = 8 }: { doctor: Doctor; size?: number }) => (
  <div className={`w-${size} h-${size} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}
    style={{ background: `linear-gradient(135deg, ${doctor.colorCode || '#4F46E5'}, ${doctor.colorCode || '#4F46E5'}80)` }}>
    {doctor.doctorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
  </div>
);

const DoctorAvatarSmall = ({ doctor }: { doctor: Doctor }) => {
  const status = utils.getDoctorStatus(doctor);
  const initials = doctor.doctorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <div className="flex flex-col items-center space-y-1">
      <div className="relative">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
          style={{ background: `linear-gradient(135deg, ${doctor.colorCode || '#4F46E5'}, ${doctor.colorCode || '#4F46E5'}80)` }}
        >
          {initials}
        </div>
        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${status.bg} ${status.color} text-xs border-2 border-white`}>
          {status.icon}
        </div>
      </div>
      <div className="text-xs text-center">
        <div className="font-medium text-gray-700 truncate max-w-[60px]">
          Dr. {doctor.doctorName.split(' ')[0]}
        </div>
        <div className={`text-xs px-1 py-0.5 rounded ${status.bg} ${status.color}`}>
          {status.text}
        </div>
      </div>
    </div>
  );
};

const TimeSlotButton = ({ slot, day, onClick }: { slot: any; day: any; onClick: () => void }) => {
  const slotStatus = utils.getSlotStatus(slot);
  const isAvailable = slotStatus.status === 'available';
  const hasDoctors = slot.assignedDoctors?.length > 0;
  
  const bgClass = !hasDoctors ? 'from-gray-100 to-gray-200 border-gray-300' :
    isAvailable ? 'from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100 hover:border-green-300' :
    'from-red-50 to-pink-50 border-red-200';
  
  return (
    <button 
      onClick={onClick} 
      disabled={!isAvailable}
      className={`group p-4 rounded-xl border transition-all duration-300 text-center relative overflow-hidden bg-gradient-to-br ${bgClass} min-h-[140px]`}
    >
      {isAvailable && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"/>
      )}
      
      <div className="relative z-10">
        <div className="text-lg font-bold text-gray-800 mb-3">
          {utils.formatTime(slot.start)}
          <div className="text-xs font-normal text-gray-500">
            {utils.formatTime(slot.end)}
          </div>
        </div>
        
        <div className="flex flex-col items-center space-y-2">
          {hasDoctors ? (
            <>
              <div className="flex flex-wrap justify-center gap-2">
                {slot.assignedDoctors?.slice(0, 4).map((doctor: Doctor) => (
                  <DoctorAvatarSmall key={doctor.doctorId} doctor={doctor} />
                ))}
                {slot.assignedDoctors && slot.assignedDoctors.length > 4 && (
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs">
                      +{slot.assignedDoctors.length - 4}
                    </div>
                    <div className="text-xs text-gray-500">more</div>
                  </div>
                )}
              </div>
              
              <div className="text-xs mt-2">
                <div className="flex items-center justify-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-green-600">{slotStatus.availableDoctors} Available</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-red-600">{slotStatus.bookedDoctors} Booked</span>
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-red-500 font-semibold text-sm py-2">No Doctors</div>
          )}
        </div>
      </div>
    </button>
  );
};

// ============ BOOKING MODAL (Updated with only isBooked logic) ============
const BookingModal = ({ 
  bookingModal, 
  availableDoctors, 
  bookingLoading, 
  bookingError, 
  specializations, 
  patientInfo, 
  onClose, 
  onSelectDoctor, 
  onBookAppointment, 
  onBackToDoctorSelection 
}: any) => {
  const [localModal, setLocalModal] = useState(bookingModal);

  useEffect(() => {
    setLocalModal(bookingModal);
  }, [bookingModal]);

  const handleBook = async () => {
    await onBookAppointment(localModal);
  };

  const modalConfigs: Record<string, { title: string; desc: string }> = {
    'select-doctor': { title: '👨‍⚕️ Select Doctor', desc: 'Choose your preferred doctor for this time slot' },
    'booking-details': { title: '📅 Book Appointment', desc: 'Complete your appointment details' }
  };

  const config = modalConfigs[localModal.step] || { title: 'Booking', desc: '' };

  // UPDATED: Filter doctors based ONLY on isBooked
  const availableDoctorsList = availableDoctors.filter((d: Doctor) => !d.isBooked);
  const bookedDoctorsList = availableDoctors.filter((d: Doctor) => d.isBooked);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50"/>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <ScrollableContainer className="max-h-[90vh]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {config.title}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">{config.desc}</p>
                </div>
                <button onClick={onClose} disabled={bookingLoading} className="p-2 hover:bg-gray-100 rounded-lg">
                  <Icon name="close" className="w-6 h-6 text-gray-500"/>
                </button>
              </div>

              {patientInfo && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <Icon name="user" className="w-5 h-5 text-white"/>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{patientInfo.name}</p>
                        <p className="text-sm text-gray-600">{patientInfo.email}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Patient ID: {patientInfo._id?.slice(0, 6)}...</span>
                  </div>
                </div>
              )}

              {localModal.medicalCenter && (
                <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-100">
                  <h4 className="font-bold text-gray-800 text-lg mb-3 flex items-center gap-2">
                    <Icon name="building" className="w-5 h-5 text-green-600"/>{localModal.medicalCenter.facility_name}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Icon name="calendar" className="w-4 h-4 text-blue-500"/>
                        <span className="font-medium">Date:</span><span>{utils.formatDate(localModal.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Icon name="clock" className="w-4 h-4 text-purple-500"/>
                        <span className="font-medium">Time:</span><span>{utils.formatTime(localModal.slot?.start)} - {utils.formatTime(localModal.slot?.end)}</span>
                      </div>
                    </div>
                    <div className="text-gray-600">
                      <p className="flex items-center gap-2"><Icon name="location" className="w-4 h-4 text-green-500"/>{utils.formatAddress(localModal.medicalCenter)}</p>
                    </div>
                  </div>
                </div>
              )}

              {localModal.step === 'select-doctor' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-800 text-lg">Available Doctors for this Slot</h4>
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        {availableDoctorsList.length} Available
                      </span>
                      {bookedDoctorsList.length > 0 && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          {bookedDoctorsList.length} Booked
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <h5 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      Available Doctors
                    </h5>
                    {availableDoctorsList.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Icon name="user" className="w-8 h-8 text-gray-400"/>
                        </div>
                        <h5 className="font-semibold text-gray-700 mb-2">No Available Doctors</h5>
                        <p className="text-gray-500 text-sm max-w-md mx-auto">All doctors are booked for this time slot. Please try another time slot or check back later.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {availableDoctorsList.map((doctor: Doctor) => (
                          <div 
                            key={doctor.doctorId} 
                            onClick={() => onSelectDoctor(doctor)}
                            className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-lg cursor-pointer ${
                              localModal.selectedDoctor?.doctorId === doctor.doctorId
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-200 bg-white hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <DoctorAvatar doctor={doctor}/>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h5 className="font-bold text-gray-800 text-lg">Dr. {doctor.doctorName}</h5>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">{doctor.role || 'Doctor'}</span>
                                      {doctor.specialization?.slice(0, 2).map((spec, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">{spec}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Available
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {bookedDoctorsList.length > 0 && (
                    <div className="mt-6">
                      <h5 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        Already Booked Doctors
                      </h5>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-60">
                        {bookedDoctorsList.map((doctor: Doctor) => (
                          <div 
                            key={doctor.doctorId}
                            className="p-4 rounded-xl border border-gray-200 bg-gray-50 cursor-not-allowed"
                          >
                            <div className="flex items-start gap-4">
                              <DoctorAvatar doctor={doctor}/>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h5 className="font-bold text-gray-600 text-lg">Dr. {doctor.doctorName}</h5>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs">{doctor.role || 'Doctor'}</span>
                                      {doctor.specialization?.slice(0, 2).map((spec, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs">{spec}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Booked
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {localModal.step === 'booking-details' && localModal.selectedDoctor && (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <DoctorAvatar doctor={localModal.selectedDoctor} size={12}/>
                        <div>
                          <h5 className="font-bold text-gray-800">Dr. {localModal.selectedDoctor.doctorName}</h5>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{localModal.selectedDoctor.role || 'Doctor'}</span>
                            {localModal.selectedDoctor.specialization?.map((spec: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{spec}</span>
                            ))}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              Available
                            </span>
                          </div>
                        </div>
                      </div>
                      <button onClick={onBackToDoctorSelection} disabled={bookingLoading} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                        <Icon name="arrowLeft" className="w-4 h-4"/> Change Doctor
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Icon name="lock" className="w-5 h-5 text-yellow-600"/>
                      </div>
                      <div>
                        <h6 className="font-semibold text-yellow-800 mb-1">Secure Payment Process</h6>
                        <p className="text-yellow-700 text-sm">1. Create appointment → 2. Pay with Paystack → 3. Confirmation via webhook → 4. Appointment confirmed</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Visit *</label>
                      <textarea value={localModal.reasonForVisit || ''} onChange={(e) => setLocalModal({...localModal, reasonForVisit: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3} placeholder="Please describe the reason for your visit..." required disabled={bookingLoading}/>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Specialization</label>
                        <div className="relative">
                          <select value={localModal.preferredSpecialization || ''} onChange={(e) => setLocalModal({...localModal, preferredSpecialization: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white">
                            <option value="">Select specialization</option>
                            {specializations.map((spec: string) => <option key={spec} value={spec.toLowerCase()}>{spec}</option>)}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"><Icon name="chevron" className="w-5 h-5 text-gray-400"/></div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Consultation Type</label>
                        <div className="relative">
                          <select value={localModal.consultationType || 'face-to-face'} onChange={(e) => setLocalModal({...localModal, consultationType: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none bg-white">
                            <option value="face-to-face">Face to Face</option>
                            <option value="telemedicine">Telemedicine</option>
                            <option value="follow-up">Follow Up</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"><Icon name="chevron" className="w-5 h-5 text-gray-400"/></div>
                        </div>
                      </div>
                    </div>

                    {bookingError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <Icon name="error" className="w-5 h-5 text-red-500"/>
                          </div>
                          <p className="text-red-700 font-medium">{bookingError}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                      <button onClick={onClose} disabled={bookingLoading} className="px-6 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-100">
                        Cancel
                      </button>
                      <button onClick={handleBook} disabled={bookingLoading || !localModal.reasonForVisit}
                        className="px-8 py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 flex items-center gap-2">
                        {bookingLoading ? <><Icon name="spinner" className="animate-spin h-5 w-5"/> Processing...</> : <><Icon name="lock" className="w-5 h-5"/> Proceed to Payment</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollableContainer>
        </GlassCard>
      </div>
    </div>
  );
};

// ============ MAIN PAGE COMPONENT ============
export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const medicalCenterId = searchParams.get('medicalCenterId');
  const dispatch = useDispatch<AppDispatch>();

  // Redux selectors
  const { 
    schedule, 
    scheduleLoading, 
    error, 
    selectedDateRange, 
    bookingModal, 
    availableDoctors, 
    bookingLoading, 
    bookingError, 
    successMessage, 
    patientInfo, 
    viewMode, 
    bookingStatus, 
    appointments 
  } = useSelector((state: RootState) => state.booking);

  // State
  const [showAppointments, setShowAppointments] = useState(false);
  const [expiryTime, setExpiryTime] = useState<number | null>(null);

  // Effects
  useEffect(() => { 
    dispatch(bookingActions.syncPatientInfoFromStorage()); 
  }, [dispatch]);

  useEffect(() => { 
    if (medicalCenterId) {
      dispatch(bookingActions.fetchScheduleWithAvailabilityThunk(medicalCenterId));
    }
  }, [medicalCenterId, dispatch]);

  useEffect(() => { 
    if (patientInfo?._id) {
      dispatch(bookingActions.fetchPatientAppointmentsThunk());
    }
  }, [patientInfo?._id, dispatch]);

  useEffect(() => { 
    const paymentRef = searchParams.get('reference') || searchParams.get('trxref');
    if (paymentRef && patientInfo) {
      handlePaymentCallback();
    }
  }, [searchParams, patientInfo]);

  useEffect(() => {
    const pendingAppointment = appointments.find(appt => 
      appt.status === 'pending' || appt.payment_status === 'pending'
    );
    if (pendingAppointment) {
      setExpiryTime(new Date(pendingAppointment.created_at).getTime() + (15 * 60 * 1000));
    } else {
      setExpiryTime(null);
    }
  }, [appointments]);

  // Handlers
  const handlePaymentCallback = async () => {
    toast.info('Confirming payment...', { autoClose: false });
    await dispatch(bookingActions.pollForConfirmationThunk());
    await dispatch(bookingActions.fetchPatientAppointmentsThunk());
    toast.dismiss();
  };

  // Get schedule days
  const getScheduleDays = useCallback(() => {
    if (!schedule?.dailySchedules) return [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const dailySchedules = schedule.dailySchedules as any[];
    
    const filteredDays = dailySchedules.filter((day: any) => {
      const dayDate = new Date(day.date);
      return dayDate >= today;
    });
    
    const ranges: Record<string, () => any[]> = {
      today: () => filteredDays.filter((day: any) => {
        const dayDate = new Date(day.date);
        return dayDate.toDateString() === today.toDateString();
      }),
      tomorrow: () => {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return filteredDays.filter((day: any) => {
          const dayDate = new Date(day.date);
          return dayDate.toDateString() === tomorrow.toDateString();
        });
      },
      week: () => {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return filteredDays.filter((day: any) => {
          const dayDate = new Date(day.date);
          return dayDate <= weekEnd;
        });
      },
      all: () => filteredDays
    };
    
    return ranges[selectedDateRange]?.() || filteredDays;
  }, [schedule, selectedDateRange]);

  // UPDATED: Stats calculation using only isBooked
  const scheduleStats = useMemo(() => {
    const scheduleDays = getScheduleDays();
    if (scheduleDays.length === 0) return null;
    
    const workingDays = scheduleDays.filter((day: any) => day.isWorking);
    const totalSlots = workingDays.reduce((acc: number, day: any) => 
      acc + (day.timeSlots?.length || 0), 0);
    
    // UPDATED: Only check for !doc.isBooked
    const availableSlots = workingDays.reduce((acc: number, day: any) => 
      acc + (day.timeSlots?.filter((slot: any) => 
        slot.assignedDoctors?.some((doc: any) => !doc.isBooked)
      ).length || 0), 0);
    
    const doctorIds = new Set<string>();
    workingDays.forEach((day: any) => 
      day.timeSlots?.forEach((slot: any) => 
        slot.assignedDoctors?.forEach((doc: any) => { 
          // UPDATED: Only check for !doc.isBooked
          if (!doc.isBooked) doctorIds.add(doc.doctorId); 
        })
      )
    );
    
    return { 
      workingDays: workingDays.length, 
      totalSlots, 
      availableSlots, 
      totalDoctors: doctorIds.size, 
      availabilityPercentage: totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0 
    };
  }, [getScheduleDays]);

  const handleSlotClick = (date: string, slot: any) => {
    if (!patientInfo) { 
      toast.error('Please log in to book appointments'); 
      router.push('/createprofile'); 
      return; 
    }
    
    const slotStatus = utils.getSlotStatus(slot);
    if (slotStatus.status !== 'available') { 
      toast.error('No available doctors for this slot'); 
      return; 
    }
    
    const minimalMedicalCenter: MedicalCenter = { 
      _id: medicalCenterId || '', 
      facility_name: schedule?.medical_center_id || 'Medical Center', 
      address: { 
        line1: '', 
        city: '', 
        province: '' 
      } 
    };
    
    dispatch(bookingActions.handleSlotClickThunk({ 
      date, 
      slot, 
      medicalCenter: minimalMedicalCenter, 
      schedule 
    }));
  };

  const handleBookAppointment = async (bookingData: any) => {
    dispatch(bookingActions.handleBookAppointmentThunk(bookingData));
  };

  const dateRangeButtons = [
    { id: 'today', label: 'Today', icon: '📅' },
    { id: 'tomorrow', label: 'Tomorrow', icon: '⏭️' },
    { id: 'week', label: 'This Week', icon: '📆' },
    { id: 'all', label: 'All Dates', icon: '🗓️' }
  ];
  
  const specializations = [
    'General Practice', 'Cardiology', 'Dermatology', 'Orthopedics', 
    'Pediatrics', 'Neurology', 'Ophthalmology', 'Psychiatry', 
    'Dentistry', 'Emergency Medicine'
  ];
  
  const scheduleDays = getScheduleDays();

  return (
    <GradientBackground>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" transition={Slide}/>
      
      <header className="sticky top-0 z-40 bg-white/80 border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/entry')} className="p-2 hover:bg-gray-100 rounded-xl">
                <Icon name="arrowLeft" className="w-6 h-6 text-gray-600"/>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Book Appointment</h1>
                <p className="text-sm text-gray-500">Schedule your medical appointment</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {bookingStatus !== 'idle' && (
                <div className="hidden md:block">
                  <PaymentStatusIndicator status={bookingStatus}/>
                </div>
              )}
              
              {patientInfo && appointments.length > 0 && (
                <button onClick={() => setShowAppointments(!showAppointments)} className="px-4 py-2 bg-blue-100 text-blue-700 font-medium rounded-xl hover:bg-blue-200 flex items-center gap-2">
                  <Icon name="calendar" className="w-5 h-5"/> Appointments ({appointments.length})
                </button>
              )}
              
              {patientInfo && (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-700">{patientInfo.name || patientInfo.email}</p>
                    <p className="text-xs text-gray-500">Patient</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <Icon name="user" className="w-5 h-5 text-white"/>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
        {expiryTime && expiryTime > Date.now() && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Icon name="clock" className="w-6 h-6 text-amber-600"/>
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800">Pending Payment</h3>
                  <p className="text-amber-700 text-sm">
                    Complete payment to confirm your appointment. Expires in {Math.ceil((expiryTime - Date.now()) / 60000)} minutes.
                  </p>
                </div>
              </div>
              <button onClick={() => dispatch(bookingActions.fetchPatientAppointmentsThunk())} className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600">
                Refresh
              </button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Icon name="check" className="w-6 h-6 text-green-600"/>
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Success!</h3>
                  <p className="text-green-700 text-sm">{successMessage}</p>
                </div>
              </div>
              <button onClick={() => dispatch(bookingActions.clearAllMessages())} className="text-green-600 hover:text-green-800">
                <Icon name="close" className="w-5 h-5"/>
              </button>
            </div>
          </div>
        )}

        {bookingError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Icon name="error" className="w-6 h-6 text-red-600"/>
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">Error</h3>
                  <p className="text-red-700 text-sm">{bookingError}</p>
                </div>
              </div>
              <button onClick={() => dispatch(bookingActions.clearBookingError())} className="text-red-600 hover:text-red-800">
                <Icon name="close" className="w-5 h-5"/>
              </button>
            </div>
          </div>
        )}

        {!patientInfo && (
          <GlassCard className="mb-8 p-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="lock" className="w-12 h-12 text-amber-600"/>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Authentication Required</h2>
              <p className="text-gray-600 mb-8">You need to be logged in as a patient to book appointments.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => router.push('/login')} className="px-8 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600">Sign In</button>
                <button onClick={() => router.push('/register')} className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600">Create Account</button>
              </div>
            </div>
          </GlassCard>
        )}

        {scheduleLoading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"/>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">Loading Schedule</h3>
            <p className="text-gray-500">Fetching doctor availability...</p>
          </div>
        )}

        {error && !scheduleLoading && (
          <GlassCard className="p-8 mb-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="error" className="w-12 h-12 text-red-600"/>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Error Loading Schedule</h2>
              <p className="text-gray-600 mb-8">{error}</p>
              <button onClick={() => router.push('/entry')} className="px-8 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600">Back to Medical Centers</button>
            </div>
          </GlassCard>
        )}

        {!scheduleLoading && !error && schedule && patientInfo && (
          <>
            <GlassCard className="mb-8 p-6 md:p-8">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 mb-8">
                <div className="flex-1">
                  <div className="flex items-start gap-6">
                    <div className="w-24 h-24 rounded-2xl bg-blue-500 flex items-center justify-center shadow-xl">
                      <span className="text-3xl font-bold text-white">{utils.getInitials(schedule.medical_center_id)}</span>
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Medical Center Schedule</h1>
                      <div className="flex flex-wrap gap-3 mb-6">
                        {['🏥 APPOINTMENTS', '✅ ACTIVE', `👤 ${patientInfo.name?.split(' ')[0] || 'Patient'}`].map((text, i) => (
                          <span key={i} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm">{text}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 min-w-[280px]">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Icon name="user" className="w-8 h-8 text-white"/>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-lg">{patientInfo.name || 'Patient'}</div>
                      <div className="text-sm text-gray-600 mb-2">{patientInfo.email}</div>
                      <div className="text-xs text-blue-600 font-medium">Ready to book appointments</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-3">Date Range:</div>
                  <div className="flex flex-wrap gap-2">
                    {dateRangeButtons.map((range) => (
                      <button key={range.id} onClick={() => dispatch(bookingActions.setSelectedDateRange(range.id as any))}
                        className={`px-5 py-2.5 rounded-xl text-sm transition-all duration-300 flex items-center gap-2 ${
                          selectedDateRange === range.id ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        <span>{range.icon}</span>{range.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm font-semibold text-gray-600 mb-2">Doctor Status Legend:</div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="text-sm text-gray-700">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span className="text-sm text-gray-700">Booked</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 md:p-8">
              <ScrollableContainer className="max-h-[600px]">
                <div className="space-y-8 pr-2">
                  {scheduleDays.length > 0 ? scheduleDays.map((day: any) => (
                    <div key={day.date} className={`rounded-2xl border ${day.isWorking ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-4 mb-3">
                          <h3 className="text-xl font-bold text-gray-800">{day.dayName}</h3>
                          <span className="text-sm text-gray-500">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                            day.isWorking ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {day.isWorking ? 'OPEN' : 'CLOSED'}
                          </span>
                        </div>
                      </div>

                      {day.isWorking && (
                        <div className="p-6">
                          {day.timeSlots?.length > 0 ? (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {day.timeSlots.slice(0, 14).map((slot: any) => (
                                  <TimeSlotButton key={slot.id} slot={slot} day={day} onClick={() => handleSlotClick(day.date, slot)}/>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-xl">
                              <p className="text-gray-500">No time slots available for this day.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
                      <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Icon name="clock" className="w-10 h-10 text-gray-400"/>
                      </div>
                      <h4 className="font-semibold text-gray-700 mb-3">No Schedule Available</h4>
                      <p className="text-gray-500 max-w-md mx-auto">
                        This medical center hasn't set up their schedule for the selected period.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollableContainer>
            </GlassCard>
          </>
        )}
      </main>

      {bookingModal.isOpen && patientInfo && (
        <BookingModal
          bookingModal={bookingModal}
          availableDoctors={availableDoctors}
          bookingLoading={bookingLoading}
          bookingError={bookingError}
          specializations={specializations}
          patientInfo={patientInfo}
          onClose={() => dispatch(bookingActions.closeBookingModal())}
          onSelectDoctor={(doctor: Doctor) => dispatch(bookingActions.handleSelectDoctorThunk(doctor))}
          onBookAppointment={handleBookAppointment}
          onBackToDoctorSelection={() => dispatch(bookingActions.handleBackToDoctorSelectionThunk())}
        />
      )}
    </GradientBackground>
  );
}