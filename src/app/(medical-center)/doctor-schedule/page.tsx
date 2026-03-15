// doctor-schedule/page.tsx
'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/app/redux/lib/hooks';
import { 
  fetchDoctorSchedule, 
  clearDoctorSchedule,
  fetchDoctorAppointments,
  DoctorPersonalSchedule, 
  DoctorDaySchedule, 
  DoctorSlot, 
  DoctorAppointment 
} from '@/app/redux/slices/DoctorSchedule';
import { logoutPractitioner } from '@/app/redux/slices/doctorLogin';

// Types
interface WeekGroup {
  weekStart: string;
  weekEnd: string;
  days: DoctorDaySchedule[];
}

interface AuthState {
  token: string | null;
  session: {
    _id: string;
    name?: string;
    medical_center_ids?: string[];
    [key: string]: any;
  } | null;
  loading: boolean;
  user?: {
    _id: string;
    name?: string;
    [key: string]: any;
  };
}

interface RootState {
  auth: AuthState;
  doctorSchedule: {
    data: DoctorPersonalSchedule | null;
    appointments: DoctorAppointment[];
    loadingSchedule: boolean;
    loadingAppointments: boolean;
    error: string | null;
  };
}

interface PatientInfo {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

interface AppointmentDisplay {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  status: string;
  reasonForVisit?: string;
  symptoms?: string;
  appointmentDuration?: number;
  medicalCenter?: string;
  appointmentId: string;
  createdAt: string;
  updatedAt: string;
}

export default function DoctorSchedulePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [currentDate] = useState(new Date());
  const [activeWeek, setActiveWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'list'>('week');
  const [selectedSlot, setSelectedSlot] = useState<DoctorSlot | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const appointmentModalRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Auth state
  const { session, token, loading: authLoading } = useAppSelector((s: RootState) => s.auth);
  
  // Doctor schedule state
  const { 
    data: doctorSchedule, 
    appointments,
    loadingSchedule, 
    loadingAppointments, 
    error: scheduleError 
  } = useAppSelector((s: RootState) => s.doctorSchedule);

  // Combined loading state
  const loading = authLoading || loadingSchedule || loadingAppointments;

  // Helper functions
  const toISODate = useCallback((d: string | Date): string => {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().split('T')[0];
  }, []);

  const formatTime = useCallback((time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }, []);

  const formatDateTime = useCallback((dateTime: string): string => {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getDayName = useCallback((date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }, []);

  // Process appointments to extract patient info properly
  const processAppointments = useCallback((appointments: DoctorAppointment[]): AppointmentDisplay[] => {
    return appointments.map(appointment => {
      let patientName = 'Unknown Patient';
      let patientEmail = 'N/A';
      let patientPhone = 'N/A';

      // Extract patient info from different possible structures
      if (appointment.patient_name) {
        patientName = appointment.patient_name;
      } else if (appointment.patient_id) {
        if (typeof appointment.patient_id === 'object') {
          const patient = appointment.patient_id as PatientInfo;
          patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient';
          patientEmail = patient.email || 'N/A';
          patientPhone = patient.phone || 'N/A';
        }
      }

      // Override with appointment-specific contact info if available
      if (appointment.patient_email) {
        patientEmail = appointment.patient_email;
      }
      if (appointment.patient_phone) {
        patientPhone = appointment.patient_phone;
      }

      // Extract medical center info
      let medicalCenter = 'N/A';
      if (appointment.medical_center_id) {
        if (typeof appointment.medical_center_id === 'object') {
          medicalCenter = appointment.medical_center_id.facility_name || 'N/A';
        } else {
          medicalCenter = appointment.medical_center_id;
        }
      }

      return {
        id: appointment._id || appointment.appointment_id || '',
        patientName,
        patientEmail,
        patientPhone,
        status: appointment.status || 'pending',
        reasonForVisit: appointment.reason_for_visit,
        symptoms: appointment.symptoms,
        appointmentDuration: appointment.appointment_duration,
        medicalCenter,
        appointmentId: appointment.appointment_id || appointment._id?.slice(-8) || '',
        createdAt: appointment.createdAt || new Date().toISOString(),
        updatedAt: appointment.updatedAt || new Date().toISOString()
      };
    });
  }, []);

  // Calculate statistics and filtered weeks
  const { filteredWeeks, stats, processedAppointments } = useMemo(() => {
    const defaultStats = { 
      totalSlots: 0, 
      totalDays: 0, 
      upcomingSlots: 0,
      todaySlots: 0,
      peakHourSlots: 0,
      availableSlots: 0,
      totalAppointments: 0
    };

    if (!doctorSchedule?.dailySchedules) {
      return { 
        filteredWeeks: [] as WeekGroup[], 
        stats: defaultStats,
        processedAppointments: [] as AppointmentDisplay[]
      };
    }

    let totalSlots = 0;
    let upcomingSlots = 0;
    let peakHourSlots = 0;
    let availableSlots = 0;
    let totalAppointments = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process and filter days
    const processedDays: DoctorDaySchedule[] = doctorSchedule.dailySchedules.map(day => {
      const dayDate = new Date(day.date);
      const isToday = toISODate(dayDate) === toISODate(today);
      const isPast = dayDate < today && !isToday;
      
      // Count slots and statistics
      day.timeSlots.forEach(slot => {
        totalSlots++;
        if (!isPast) {
          upcomingSlots++;
          if (slot.isPeakHour) peakHourSlots++;
          if (slot.availableCapacity > 0) availableSlots++;
        }
        
        // Count appointments from slot
        if (slot.appointments) {
          totalAppointments += slot.appointments.length;
        }
      });

      return {
        ...day,
        date: day.date,
        dayName: day.dayName || getDayName(dayDate),
        dayOfWeek: day.dayOfWeek || dayDate.getDay(),
      };
    });

    // Sort by date
    processedDays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by week (Sunday start)
    const weeks: WeekGroup[] = [];
    let currentWeekStart: Date | null = null;
    let currentWeekDays: DoctorDaySchedule[] = [];

    const pushWeek = () => {
      if (!currentWeekStart || currentWeekDays.length === 0) return;
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      weeks.push({
        weekStart: toISODate(currentWeekStart),
        weekEnd: toISODate(weekEnd),
        days: currentWeekDays,
      });
    };

    for (const day of processedDays) {
      const dayDate = new Date(day.date);
      const weekStartDate = new Date(dayDate);
      weekStartDate.setDate(dayDate.getDate() - dayDate.getDay());
      weekStartDate.setHours(0, 0, 0, 0);

      if (!currentWeekStart) {
        currentWeekStart = weekStartDate;
        currentWeekDays = [day];
        continue;
      }

      if (weekStartDate.getTime() === currentWeekStart.getTime()) {
        currentWeekDays.push(day);
      } else {
        pushWeek();
        currentWeekStart = weekStartDate;
        currentWeekDays = [day];
      }
    }

    pushWeek();

    // Calculate today's slots
    const todaySlots = doctorSchedule.dailySchedules.find(
      d => toISODate(new Date(d.date)) === toISODate(today)
    )?.timeSlots.length || 0;

    // Process all appointments
    const allProcessedAppointments = processAppointments(appointments);

    return {
      filteredWeeks: weeks,
      stats: {
        totalSlots,
        totalDays: doctorSchedule.dailySchedules.length,
        upcomingSlots,
        todaySlots,
        peakHourSlots,
        availableSlots,
        totalAppointments
      },
      processedAppointments: allProcessedAppointments
    };
  }, [doctorSchedule, appointments, toISODate, getDayName, processAppointments]);

  const getTimeSlotsForSelectedDay = useMemo(() => {
    if (!selectedDay || !doctorSchedule?.dailySchedules) return [];
    const day = doctorSchedule.dailySchedules.find(d => toISODate(d.date) === selectedDay);
    return day?.timeSlots || [];
  }, [selectedDay, doctorSchedule, toISODate]);

  // Scroll to today on load
  useEffect(() => {
    if (filteredWeeks.length > 0 && scrollContainerRef.current) {
      setTimeout(() => {
        const todayIndex = filteredWeeks.findIndex(week => 
          week.days.some(day => toISODate(new Date(day.date)) === toISODate(new Date()))
        );
        if (todayIndex !== -1) {
          setActiveWeek(todayIndex);
        }
      }, 500);
    }
  }, [filteredWeeks, toISODate]);

  // Clear schedule on component unmount
  useEffect(() => {
    return () => {
      dispatch(clearDoctorSchedule());
    };
  }, [dispatch]);

  // Fetch schedule and appointments when component mounts
  useEffect(() => {
    if (token && session?._id && !loading && !doctorSchedule) {
      dispatch(fetchDoctorSchedule());
      dispatch(fetchDoctorAppointments());
    }
  }, [token, session?._id, dispatch, loading, doctorSchedule]);

  // Smooth scroll handlers
  const handleScroll = useCallback((direction: 'left' | 'right') => {
    if (!dayScrollRef.current) return;

    setIsScrolling(true);
    const scrollAmount = 300;
    const currentScroll = dayScrollRef.current.scrollLeft;
    
    if (direction === 'left') {
      dayScrollRef.current.scrollTo({
        left: currentScroll - scrollAmount,
        behavior: 'smooth'
      });
    } else {
      dayScrollRef.current.scrollTo({
        left: currentScroll + scrollAmount,
        behavior: 'smooth'
      });
    }

    setTimeout(() => setIsScrolling(false), 300);
  }, []);

  // Handle outside click for modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (appointmentModalRef.current && !appointmentModalRef.current.contains(event.target as Node)) {
        setShowAppointmentModal(false);
        setSelectedSlot(null);
      }
    };

    if (showAppointmentModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAppointmentModal]);

  // Handlers
  const handleLogout = async () => {
    await dispatch(logoutPractitioner());
    dispatch(clearDoctorSchedule());
    router.push('/doctorLogin');
  };

  const handleRetry = () => {
    dispatch(fetchDoctorSchedule());
    dispatch(fetchDoctorAppointments());
  };

  const handleViewAppointments = (slot: DoctorSlot) => {
    setSelectedSlot(slot);
    setShowAppointmentModal(true);
  };

  const handleCloseModal = () => {
    setShowAppointmentModal(false);
    setSelectedSlot(null);
  };

  const handleWeekScroll = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && activeWeek > 0) {
      setActiveWeek(activeWeek - 1);
    } else if (direction === 'next' && activeWeek < filteredWeeks.length - 1) {
      setActiveWeek(activeWeek + 1);
    }
  };

  const handleDaySelect = (date: string) => {
    setSelectedDay(date);
    setViewMode('day');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Function to get appointment status color
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Function to get appointment status icon
  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'confirmed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-800">Loading Schedule</h3>
            <p className="text-sm text-gray-500">Fetching your schedule and appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  // Authentication error
  if (!session || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Expired</h2>
            <p className="text-gray-600 mb-6">Please log in to access your schedule</p>
            <button
              onClick={() => router.push('/doctorLogin')}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Schedule error
  if (scheduleError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Schedule Error</h2>
            <p className="text-gray-600 mb-2">{scheduleError}</p>
            <p className="text-sm text-gray-500 mb-6">We couldn't load your schedule</p>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
              >
                Try Again
              </button>
              <button
                onClick={handleLogout}
                className="w-full border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-50 transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Appointment Schedule
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome back, Dr. {session.name || doctorSchedule?.doctorInfo?.name || 'Doctor'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {doctorSchedule?.doctorInfo?.specialization && (
                <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border border-blue-200">
                  {doctorSchedule.doctorInfo.specialization}
                </span>
              )}
              
              <button
                onClick={handleRetry}
                className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="Refresh schedule"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2.5 rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3 3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      {stats.totalSlots > 0 && (
        <div className="bg-white/80 border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Slots', value: stats.totalSlots, color: 'from-blue-50 to-blue-100/50', border: 'border-blue-100', text: 'text-blue-700' },
                { label: 'Upcoming', value: stats.upcomingSlots, color: 'from-emerald-50 to-emerald-100/50', border: 'border-emerald-100', text: 'text-emerald-700' },
                { label: 'Today', value: stats.todaySlots, color: 'from-amber-50 to-amber-100/50', border: 'border-amber-100', text: 'text-amber-700' },
                { label: 'Peak Hours', value: stats.peakHourSlots, color: 'from-violet-50 to-violet-100/50', border: 'border-violet-100', text: 'text-violet-700' },
                { label: 'Available', value: stats.availableSlots, color: 'from-green-50 to-green-100/50', border: 'border-green-100', text: 'text-green-700' },
                { label: 'Appointments', value: stats.totalAppointments, color: 'from-gray-50 to-gray-100/50', border: 'border-gray-100', text: 'text-gray-700' },
              ].map((stat, index) => (
                <div 
                  key={index}
                  className={`bg-gradient-to-br ${stat.color} p-3 rounded-xl border ${stat.border} transition-all duration-200 hover:scale-105 cursor-default`}
                >
                  <p className={`text-xs ${stat.text} font-medium mb-1`}>{stat.label}</p>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="inline-flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'week'
                  ? 'bg-white shadow-md text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'day'
                  ? 'bg-white shadow-md text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white shadow-md text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List View
            </button>
          </div>
          
          {/* Upcoming Appointments Count */}
          {processedAppointments.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl border border-blue-200">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm font-medium text-blue-700">
                {processedAppointments.filter(a => a.status === 'confirmed').length} Confirmed Appointments
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredWeeks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 text-center border border-gray-200/50">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-200">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Scheduled Appointments</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              You don&apos;t have any scheduled appointments for the upcoming weeks.
            </p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Schedule
            </button>
          </div>
        ) : viewMode === 'week' ? (
          <div className="space-y-6" ref={scrollContainerRef}>
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => handleWeekScroll('prev')}
                disabled={activeWeek === 0}
                className={`p-3 rounded-xl transition-all ${activeWeek === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 hover:shadow'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Week {activeWeek + 1} of {filteredWeeks.length}
                </h3>
                <p className="text-sm text-gray-600">
                  {new Date(filteredWeeks[activeWeek].weekStart).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric' 
                  })} - {new Date(filteredWeeks[activeWeek].weekEnd).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
              
              <button
                onClick={() => handleWeekScroll('next')}
                disabled={activeWeek === filteredWeeks.length - 1}
                className={`p-3 rounded-xl transition-all ${activeWeek === filteredWeeks.length - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 hover:shadow'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Days Horizontal Scroll Container */}
            <div className="relative">
              <button
                onClick={() => handleScroll('left')}
                disabled={isScrolling}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-2 bg-white border border-gray-200 rounded-full shadow-lg hidden md:flex items-center justify-center hover:bg-gray-50 transition-all"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div 
                className="overflow-x-auto pb-6 -mx-2 px-2 custom-scrollbar-horizontal"
                ref={dayScrollRef}
              >
                <div className="flex space-x-4 min-w-max px-2">
                  {filteredWeeks[activeWeek]?.days.map((day) => {
                    const dayDate = new Date(day.date);
                    const isToday = toISODate(dayDate) === toISODate(new Date());
                    const totalSlots = day.timeSlots.length;
                    const dayAppointments = day.timeSlots.reduce((acc, slot) => 
                      acc + (slot.appointments?.length || 0), 0);
                    
                    return (
                      <div
                        key={day.date}
                        className={`flex-shrink-0 w-80 border rounded-xl p-4 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                          isToday
                            ? 'border-blue-300 bg-gradient-to-br from-blue-50 via-white to-blue-100/30 shadow-md'
                            : 'border-gray-200 bg-white hover:shadow-lg hover:border-gray-300'
                        }`}
                        onClick={() => handleDaySelect(toISODate(dayDate))}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className={`text-lg font-semibold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                              {day.dayName}
                            </span>
                            <p className="text-sm text-gray-600 mt-1">
                              {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {isToday && (
                              <span className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-1 rounded-full shadow-sm">Today</span>
                            )}
                          </div>
                        </div>
                        
                        {totalSlots > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Appointments</span>
                              <span className="text-sm font-bold text-gray-900">{dayAppointments}</span>
                            </div>
                            
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                              {day.timeSlots.slice(0, 4).map((slot) => {
                                const doctorAssignment = slot.assignedDoctors?.[0];
                                const patientCount = doctorAssignment?.currentPatients || 0;
                                const maxPatients = doctorAssignment?.maxPatients || slot.capacity || 1;
                                const fillPercentage = Math.min((patientCount / maxPatients) * 100, 100);
                                const slotAppointments = slot.appointments || [];
                                
                                return (
                                  <div
                                    key={slot.id}
                                    className={`rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:scale-[1.01] border-gray-200 bg-white hover:shadow-md`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewAppointments(slot);
                                    }}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900">
                                          {formatTime(slot.start)}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        {slot.isPeakHour && (
                                          <span className="text-xs bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 px-2 py-0.5 rounded border border-yellow-200">Peak</span>
                                        )}
                                        <span className={`text-xs px-2 py-0.5 rounded border ${
                                          slot.consultationType === 'video' 
                                            ? 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border-purple-200'
                                            : 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200'
                                        }`}>
                                          {slot.consultationType}
                                        </span>
                                        {slotAppointments.length > 0 && (
                                          <span className="text-xs bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                                            {slotAppointments.length}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="mb-2">
                                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                                        <span>{patientCount}/{maxPatients} patients</span>
                                        <span>{slot.duration}min</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                          className={`h-1.5 rounded-full transition-all duration-300 ${
                                            fillPercentage >= 80 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                            fillPercentage >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                            'bg-gradient-to-r from-green-500 to-green-600'
                                          }`}
                                          style={{ width: `${fillPercentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                    
                                    {/* Appointment preview */}
                                    {slotAppointments.length > 0 && (
                                      <div className="mt-2">
                                        <div className="space-y-2">
                                          {processAppointments(slotAppointments).slice(0, 2).map((appointment, idx) => (
                                            <div key={idx} className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center">
                                                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                  </svg>
                                                </div>
                                                <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">
                                                  {appointment.patientName.split(' ')[0]}
                                                </span>
                                              </div>
                                              <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(appointment.status)}`}>
                                                {appointment.status}
                                              </span>
                                            </div>
                                          ))}
                                          {slotAppointments.length > 2 && (
                                            <div className="text-xs text-gray-500 text-center">
                                              +{slotAppointments.length - 2} more patients
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {totalSlots > 4 && (
                              <div className="pt-2 border-t border-gray-100">
                                <p className="text-sm text-gray-500 text-center">
                                  +{totalSlots - 4} more time slots
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-sm text-gray-400">No appointments scheduled</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <button
                onClick={() => handleScroll('right')}
                disabled={isScrolling}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-2 bg-white border border-gray-200 rounded-full shadow-lg hidden md:flex items-center justify-center hover:bg-gray-50 transition-all"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Scroll Indicator */}
            <div className="flex justify-center space-x-2">
              {filteredWeeks.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveWeek(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeWeek
                      ? 'w-8 bg-gradient-to-r from-blue-500 to-blue-600'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : viewMode === 'day' && selectedDay ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {getDayName(new Date(selectedDay))}
                </h3>
                <p className="text-gray-600">
                  {new Date(selectedDay).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setViewMode('week')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
                >
                  ← Back to Week View
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getTimeSlotsForSelectedDay.map((slot) => {
                const doctorAssignment = slot.assignedDoctors?.[0];
                const patientCount = doctorAssignment?.currentPatients || 0;
                const maxPatients = doctorAssignment?.maxPatients || slot.capacity || 1;
                const fillPercentage = Math.min((patientCount / maxPatients) * 100, 100);
                const slotAppointments = slot.appointments || [];
                
                return (
                  <div
                    key={slot.id}
                    className={`border rounded-xl p-4 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] border-gray-200 bg-white`}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-4 gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg font-bold text-gray-900">
                            {formatTime(slot.start)} - {formatTime(slot.end)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{slot.duration} minutes</p>
                      </div>
                      <div className="flex flex-col items-start sm:items-end space-y-1 w-full sm:w-auto">
                        <div className="flex flex-wrap gap-1">
                          {slot.isPeakHour && (
                            <span className="text-xs bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 px-2 py-1 rounded-full border border-yellow-200">Peak Hour</span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            slot.consultationType === 'video' 
                              ? 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border-purple-200'
                              : slot.consultationType === 'in-person'
                              ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200'
                              : 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {slot.consultationType}
                          </span>
                        </div>
                        {slotAppointments.length > 0 && (
                          <span className="text-xs bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 px-2 py-1 rounded-full border border-blue-200">
                            {slotAppointments.length} appointment{slotAppointments.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Patient Capacity</span>
                        <span className="text-sm font-bold text-gray-900">{patientCount}/{maxPatients}</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            fillPercentage >= 80 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                            fillPercentage >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                            'bg-gradient-to-r from-green-500 to-green-600'
                          }`}
                          style={{ width: `${fillPercentage}%` }}
                        ></div>
                      </div>
                      
                      {slot.specialization && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-sm text-blue-600 font-medium truncate">{slot.specialization}</span>
                        </div>
                      )}
                      
                      {/* Appointment preview */}
                      {slotAppointments.length > 0 && (
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-sm text-gray-700 font-medium mb-2">Appointments:</p>
                          <div className="space-y-2">
                            {processAppointments(slotAppointments).slice(0, 3).map((appointment, index) => (
                              <div 
                                key={index}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleViewAppointments(slot)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center">
                                    {getStatusIcon(appointment.status)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{appointment.patientName}</p>
                                    <p className="text-xs text-gray-500">{appointment.patientEmail}</p>
                                  </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(appointment.status)}`}>
                                  {appointment.status}
                                </span>
                              </div>
                            ))}
                            {slotAppointments.length > 3 && (
                              <button
                                onClick={() => handleViewAppointments(slot)}
                                className="w-full text-sm text-blue-600 hover:text-blue-800 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
                              >
                                View all {slotAppointments.length} appointments →
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        <button
                          onClick={() => handleViewAppointments(slot)}
                          className="flex-1 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:shadow border border-blue-200 hover:border-blue-300"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar-horizontal">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patients
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Appointments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWeeks.flatMap((week) =>
                    week.days.flatMap((day) =>
                      day.timeSlots.map((slot) => {
                        const doctorAssignment = slot.assignedDoctors?.[0];
                        const patientCount = doctorAssignment?.currentPatients || 0;
                        const maxPatients = doctorAssignment?.maxPatients || slot.capacity || 1;
                        const slotAppointments = slot.appointments || [];
                        
                        return (
                          <tr 
                            key={slot.id} 
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(day.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatTime(slot.start)} - {formatTime(slot.end)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span className={`text-xs px-2 py-1 rounded-full border ${
                                  slot.consultationType === 'video' 
                                    ? 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border-purple-200'
                                    : 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200'
                                }`}>
                                  {slot.consultationType}
                                </span>
                                {slot.isPeakHour && (
                                  <span className="text-xs bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 px-2 py-1 rounded-full border border-yellow-200">Peak</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{patientCount}/{maxPatients}</div>
                              <div className="w-32 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    (patientCount / maxPatients) >= 0.8 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                    (patientCount / maxPatients) >= 0.5 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                    'bg-gradient-to-r from-green-500 to-green-600'
                                  }`}
                                  style={{ width: `${(patientCount / maxPatients) * 100}%` }}
                                ></div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {slotAppointments.length} appointment{slotAppointments.length !== 1 ? 's' : ''}
                              </div>
                              {slotAppointments.length > 0 && (
                                <div className="mt-1">
                                  {processAppointments(slotAppointments).slice(0, 2).map((appointment, idx) => (
                                    <div key={idx} className="text-xs text-gray-600 truncate">
                                      • {appointment.patientName}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                  slot.availableCapacity > 0
                                    ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200'
                                    : 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200'
                                }`}>
                                  {slot.availableCapacity > 0 ? 'Available' : 'Full'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => handleViewAppointments(slot)}
                                  className="text-blue-600 hover:text-blue-900 hover:underline"
                                >
                                  View Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Schedule last updated: {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Showing appointments for the next {doctorSchedule?.dailySchedules?.length || 21} days
          </p>
        </div>
      </main>

      {/* Appointment Details Modal - COMPLETELY REDESIGNED */}
      {showAppointmentModal && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
            ref={appointmentModalRef}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 bg-white border-b border-gray-200/60 flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Appointment Details
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100/50 px-3 py-1.5 rounded-lg border border-blue-200">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-blue-800">
                        {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}
                      </span>
                      <span className="text-sm text-blue-600">• {selectedSlot.duration} min</span>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-gray-100/50 px-3 py-1.5 rounded-lg border border-gray-200">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">
                        {selectedSlot.appointments?.length || 0} appointment{selectedSlot.appointments?.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="p-2.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all duration-200"
                    aria-label="Close modal"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Contact Reminder Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100/80 border-b border-blue-200/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Important: Make sure you contact your patient to discuss everything in every situation
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Clear communication ensures better patient care and understanding
                  </p>
                </div>
              </div>
            </div>
            
            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-hidden">
              {/* Slot Info Panel - Fixed at top */}
              <div className="px-6 py-5 border-b border-gray-200 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Time Slot</p>
                    <p className="font-medium text-gray-900">{formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium text-gray-900">{selectedSlot.duration} minutes</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Consultation Type</p>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                      selectedSlot.consultationType === 'video'
                        ? 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200'
                        : 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200'
                    }`}>
                      {selectedSlot.consultationType}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                      selectedSlot.availableCapacity > 0
                        ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200'
                        : 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200'
                    }`}>
                      {selectedSlot.availableCapacity > 0 ? `${selectedSlot.availableCapacity} Available` : 'Full'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Appointments Container - Scrollable */}
              <div 
                ref={modalContentRef}
                className="h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar p-6"
              >
                {/* Scroll Indicator */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pb-4 mb-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-lg">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">
                        Patient Appointments ({selectedSlot.appointments?.length || 0})
                      </h4>
                    </div>
                    
                    {/* Desktop Scroll Tool */}
                    <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <span>Use scrollbar or mouse wheel to navigate</span>
                    </div>
                  </div>
                </div>
                
                {selectedSlot.appointments && selectedSlot.appointments.length > 0 ? (
                  <div className="space-y-6">
                    {processAppointments(selectedSlot.appointments).map((appointment) => (
                      <div 
                        key={appointment.id}
                        className="border border-gray-200 rounded-2xl bg-white hover:shadow-lg transition-all duration-300 overflow-hidden"
                      >
                        {/* Appointment Header */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100/30 px-6 py-4 border-b border-gray-200">
                          <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center">
                                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <div>
                                  <h5 className="text-lg font-bold text-gray-900">
                                    {appointment.patientName}
                                  </h5>
                                  <p className="text-sm text-gray-600">Appointment ID: {appointment.appointmentId}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(appointment.status)}
                                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(appointment.status)}`}>
                                  {appointment.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Patient Information Grid */}
                        <div className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Contact Information */}
                            <div className="space-y-6">
                              <div>
                                <h6 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  Contact Information
                                </h6>
                                <div className="space-y-4">
                                  <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <div>
                                      <p className="text-sm text-gray-600">Email</p>
                                      <p className="font-medium text-gray-900 break-all">{appointment.patientEmail}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <div>
                                      <p className="text-sm text-gray-600">Phone</p>
                                      <p className="font-medium text-gray-900">{appointment.patientPhone}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Medical Information */}
                            <div className="space-y-6">
                              {(appointment.reasonForVisit || appointment.symptoms) && (
                                <div>
                                  <h6 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    Medical Information
                                  </h6>
                                  <div className="space-y-3">
                                    {appointment.reasonForVisit && (
                                      <div className="bg-gradient-to-r from-amber-50 to-amber-100/30 p-4 rounded-lg border border-amber-200">
                                        <p className="text-sm text-gray-600 mb-1">Reason for Visit</p>
                                        <p className="text-gray-900">{appointment.reasonForVisit}</p>
                                      </div>
                                    )}
                                    
                                    {appointment.symptoms && (
                                      <div className="bg-gradient-to-r from-red-50 to-red-100/30 p-4 rounded-lg border border-red-200">
                                        <p className="text-sm text-gray-600 mb-1">Symptoms</p>
                                        <p className="text-gray-900">{appointment.symptoms}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Appointment Details */}
                            <div className="space-y-6">
                              <div>
                                <h6 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Appointment Details
                                </h6>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                      <p className="text-sm text-gray-600 mb-1">Duration</p>
                                      <p className="font-medium text-gray-900">
                                        {appointment.appointmentDuration || selectedSlot.duration} minutes
                                      </p>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                      <p className="text-sm text-gray-600 mb-1">Created</p>
                                      <p className="font-medium text-gray-900 text-sm">
                                        {formatDateTime(appointment.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {appointment.medicalCenter && appointment.medicalCenter !== 'N/A' && (
                                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/30 p-4 rounded-lg border border-emerald-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <p className="text-sm font-medium text-emerald-700">Medical Center</p>
                                      </div>
                                      <p className="text-gray-900">{appointment.medicalCenter}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Contact Reminder */}
                              <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 p-4 rounded-lg border border-blue-200">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h6 className="text-sm font-semibold text-blue-800 mb-1">
                                      Patient Contact Reminder
                                    </h6>
                                    <p className="text-sm text-blue-700">
                                      Contact {appointment.patientName.split(' ')[0]} before appointment for confirmation.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Appointment Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span>Last updated: {formatDateTime(appointment.updatedAt)}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <button className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Add Notes
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Mobile Scroll Indicator */}
                    <div className="lg:hidden text-center py-6">
                      <div className="inline-flex items-center gap-2 text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span className="text-sm">Swipe or use scrollbar</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 border-2 border-dashed border-gray-300/50 rounded-2xl bg-gradient-to-br from-gray-50/50 to-gray-100/30">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-semibold text-gray-700 mb-3">No Appointments Scheduled</h4>
                    <p className="text-gray-500 max-w-md mx-auto">
                      There are no appointments scheduled for this time slot yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white border-t border-gray-200/60 flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    Total Capacity: {selectedSlot.assignedDoctors?.[0]?.maxPatients || selectedSlot.capacity || 0} • 
                    Booked: {selectedSlot.assignedDoctors?.[0]?.currentPatients || 0} • 
                    Available: {selectedSlot.availableCapacity}
                  </span>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add custom scrollbar styles for both desktop and mobile
const customScrollbarStyles = `
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 #f1f1f1;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
  }
  
  .custom-scrollbar-horizontal {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 #f1f1f1;
  }
  
  .custom-scrollbar-horizontal::-webkit-scrollbar {
    height: 6px;
  }
  
  .custom-scrollbar-horizontal::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  .custom-scrollbar-horizontal::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 3px;
  }
  
  .custom-scrollbar-horizontal::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
  }
  
  /* Mobile touch scrolling enhancements */
  @media (max-width: 768px) {
    .custom-scrollbar {
      -webkit-overflow-scrolling: touch;
    }
    
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
  }
`;

// Inject custom scrollbar styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = customScrollbarStyles;
  document.head.appendChild(style);
}