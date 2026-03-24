'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  ReactNode,
  ElementType,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DoctorNav from '@/app/(medical-center)/components/DoctorNav';
import { useAppDispatch, useAppSelector } from '@/app/redux/lib/hooks';
import {
  fetchAppointments,
  loadMedicalCenterSettings,
  handleReschedule,
  cancelAppointment,
  setSelectedAppointment,
  setSearchTerm,
  setNewDate,
  setNewTime,
  setShowRescheduleModal,
  clearNotifications,
  updateAppointmentInList,
  setFilter,
  clearFilters,
  clearAuth,
  syncAuthFromStorage,
  setSuccess,
} from '@/app/redux/slices/mainPageSlice';
import { socketService } from '@/app/redux/lib/socket';

// Icons
import {
  CalendarDays,
  Clock,
  Search,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  Mail,
  Stethoscope,
  FileText,
  Calendar,
  Users,
  Activity,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  Plus,
  TrendingUp,
  Video,
  CalendarCheck,
  Clock4,
  UserCheck,
  ShieldCheck,
  Heart,
  Brain,
  Bone,
  Eye,
  Baby,
  ChevronDown,
  Settings,
  Sparkles,
  Thermometer,
  Syringe,
  Hospital,
  Bell,
  HelpCircle,
  Download,
  Share2,
  LogOut,
  AlertTriangle,
  Shield,
  Check,
  BarChart3,
  Wallet,
  CreditCard,
  Receipt,
  FolderOpen,
  DollarSign,
} from 'lucide-react';

// ============ TYPE DEFINITIONS ============

type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no-show'
  | 'rescheduled';

type ConsultationType =
  | 'online'
  | 'offline'
  | 'face-to-face'
  | 'telemedicine'
  | 'follow-up';

type Urgency = 'emergency' | 'urgent' | 'routine';
type PatientSector = 'government' | 'private';
type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded' | 'none';

interface Booking {
  _id: string;
  appointment_id?: string;
  patientId?: string;
  patient_id?: string;
  patientFileId?: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientAge: number;
  patientGender: string;
  emergencyContact: string;
  medicalCondition: string;
  symptoms: string;
  notes: string;
  preferredDate: string;
  preferredTime: string;
  assignedDate: string;
  assignedTime: string;
  status: AppointmentStatus;
  urgency: Urgency;
  patientSector: PatientSector;
  consultationType: ConsultationType;
  autoApproved: boolean;
  assignedDoctor: string;
  doctorName: string;
  doctorSpecialization: string[];
  appointmentDate: Date | string;
  slotStart: string;
  slotEnd: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  isShiftedSlot?: boolean;
  shiftNotes?: string;
  consultation_fee?: number;
  deposit_amount?: number;
  platform_fee?: number;
  total_amount?: number;
  payment_amount_paid?: number;
  currency?: string;
  is_paid?: boolean;
  payment_required?: boolean;
  payment_status?: PaymentStatus;
  payment_reference?: string | null;
}

interface Doctor {
  _id: string;
  name: string;
  specialization: string[];
  email: string;
  phone: string;
  isActive: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  description?: string;
}

// Badge variant type used across components
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

// Filter structure used in the UI
interface Filters {
  status: string;
  date: string;
  practitioner: string;
}

// ============ HELPERS ============

const formatCurrency = (amount?: number, currency = 'ZAR') => {
  const safeAmount = Number(amount || 0);

  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `R ${safeAmount.toFixed(2)}`;
  }
};

const toNumber = (value: unknown) => Number(value || 0);

// ============ MEMOIZED COMPONENTS ============

const ModernCard = memo(
  ({
    children,
    className = '',
    hover = true,
    glass = false,
  }: {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    glass?: boolean;
  }) => (
    <div
      className={`
      bg-white/90 backdrop-blur-lg rounded-2xl border border-white/40 shadow-lg shadow-black/5
      ${hover ? 'hover:shadow-xl hover:shadow-black/10 hover:-translate-y-0.5' : ''}
      ${glass ? 'backdrop-blur-xl bg-white/60 border-white/30' : ''}
      transition-all duration-300
      ${className}
    `}
    >
      {children}
    </div>
  ),
);
ModernCard.displayName = 'ModernCard';

const Badge = memo(
  ({
    children,
    variant = 'default',
    size = 'sm',
  }: {
    children: ReactNode;
    variant?: BadgeVariant;
    size?: 'sm' | 'md' | 'lg';
  }) => {
    const variantClasses: Record<BadgeVariant, string> = {
      default: 'bg-gray-100 text-gray-800 border-gray-200',
      success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      warning: 'bg-amber-100 text-amber-800 border-amber-200',
      danger: 'bg-red-100 text-red-800 border-red-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      purple: 'bg-violet-100 text-violet-800 border-violet-200',
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };

    return (
      <span
        className={`
        inline-flex items-center rounded-full border font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
      `}
      >
        {children}
      </span>
    );
  },
);
Badge.displayName = 'Badge';

const StatCard = memo(
  ({ title, value, icon, trend, color = 'blue', description }: StatCardProps) => {
    const colorClasses: Record<StatCardProps['color'], string> = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-emerald-500 to-emerald-600',
      purple: 'from-violet-500 to-violet-600',
      orange: 'from-amber-500 to-amber-600',
      red: 'from-rose-500 to-rose-600',
    };

    return (
      <ModernCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
            {trend !== undefined && (
              <div className="flex items-center mt-2">
                <span
                  className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {trend >= 0 ? '+' : ''}
                  {trend}%
                </span>
                <span className="text-sm text-gray-500 ml-2">from yesterday</span>
              </div>
            )}
          </div>
          <div
            className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white`}
          >
            {icon}
          </div>
        </div>
      </ModernCard>
    );
  },
);
StatCard.displayName = 'StatCard';

const LoadingSkeleton = memo(() => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <ModernCard key={i} className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </ModernCard>
    ))}
  </div>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

const EmptyState = memo(
  ({
    searchTerm,
    filters,
    onClear,
  }: {
    searchTerm: string;
    filters: Filters;
    onClear: () => void;
  }) => (
    <ModernCard className="text-center py-16">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-2xl flex items-center justify-center">
          <CalendarDays className="w-10 h-10 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          No appointments found
        </h3>
        <p className="text-gray-600 mb-6">
          {searchTerm || Object.values(filters).some((f) => f)
            ? 'Try adjusting your search or filters'
            : 'When patients book appointments, they will appear here.'}
        </p>
        {(searchTerm || Object.values(filters).some((f) => f)) && (
          <button
            onClick={onClear}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>
    </ModernCard>
  ),
);
EmptyState.displayName = 'EmptyState';

// ============ MAIN COMPONENT ============

export default function DoctorAppointments() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const {
    appointments,
    selectedAppointment,
    showRescheduleModal,
    newDate,
    newTime,
    searchTerm,
    medicalCenterSettings,
    loading,
    stats,
    error,
    success,
    filters,
    medicalCenterId,
  } = useAppSelector((state) => state.mainPage);

  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'upcoming' | 'past'>(
    'today',
  );
  const [showFilters, setShowFilters] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const centerId = localStorage.getItem('medicalCenterId');

      if (!token || !centerId) {
        router.push('/medical');
        return false;
      }

      dispatch(syncAuthFromStorage());
      setIsAuthenticated(true);
      return true;
    };

    if (!checkAuth()) return;
  }, [dispatch, router]);

  const getEffectiveDate = useCallback((apt: Booking) => apt.assignedDate || apt.preferredDate, []);
  const getEffectiveTime = useCallback((apt: Booking) => apt.assignedTime || apt.preferredTime, []);

  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  const isTomorrow = useCallback((date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    );
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt: Booking) => {
      const matchesSearch =
        searchTerm === '' ||
        apt.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.medicalCondition?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patientPhone?.includes(searchTerm) ||
        apt.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.appointment_id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = !filters.status || apt.status === filters.status;
      const matchesDate = !filters.date || apt.assignedDate === filters.date;
      const matchesPractitioner =
        !filters.practitioner || apt.assignedDoctor === filters.practitioner;

      return matchesSearch && matchesStatus && matchesDate && matchesPractitioner;
    });
  }, [appointments, searchTerm, filters]);

  const todaysAppointments = useMemo(
    () =>
      filteredAppointments.filter((apt: Booking) =>
        isToday(new Date(getEffectiveDate(apt))),
      ),
    [filteredAppointments, isToday, getEffectiveDate],
  );

  const tomorrowsAppointments = useMemo(
    () =>
      filteredAppointments.filter((apt: Booking) =>
        isTomorrow(new Date(getEffectiveDate(apt))),
      ),
    [filteredAppointments, isTomorrow, getEffectiveDate],
  );

  const upcomingAppointments = useMemo(
    () =>
      filteredAppointments.filter((apt: Booking) => {
        const date = new Date(getEffectiveDate(apt));
        return !isToday(date) && !isTomorrow(date) && date > new Date();
      }),
    [filteredAppointments, isToday, isTomorrow, getEffectiveDate],
  );

  const pastAppointments = useMemo(
    () =>
      filteredAppointments.filter(
        (apt: Booking) => new Date(getEffectiveDate(apt)) < new Date(),
      ),
    [filteredAppointments, getEffectiveDate],
  );

  // Revenue helpers
  const calculateRevenue = useCallback(
    (items: Booking[]) => {
      return items.reduce(
        (acc, apt) => {
          const paid = toNumber(apt.payment_amount_paid);
          const expected = toNumber(apt.total_amount);
          const consultation = toNumber(apt.consultation_fee);
          const deposit = toNumber(apt.deposit_amount);
          const platform = toNumber(apt.platform_fee);

          acc.totalPaid += paid;
          acc.totalExpected += expected;
          acc.totalConsultation += consultation;
          acc.totalDeposits += deposit;
          acc.totalPlatformFees += platform;

          if (apt.payment_status === 'success') acc.successfulPayments += 1;
          if (apt.payment_status === 'pending') acc.pendingPayments += 1;
          if (apt.payment_status === 'failed') acc.failedPayments += 1;

          return acc;
        },
        {
          totalPaid: 0,
          totalExpected: 0,
          totalConsultation: 0,
          totalDeposits: 0,
          totalPlatformFees: 0,
          successfulPayments: 0,
          pendingPayments: 0,
          failedPayments: 0,
        },
      );
    },
    [],
  );

  const todayRevenue = useMemo(
    () => calculateRevenue(todaysAppointments),
    [todaysAppointments, calculateRevenue],
  );
  const tomorrowRevenue = useMemo(
    () => calculateRevenue(tomorrowsAppointments),
    [tomorrowsAppointments, calculateRevenue],
  );
  const upcomingRevenue = useMemo(
    () => calculateRevenue(upcomingAppointments),
    [upcomingAppointments, calculateRevenue],
  );
  const totalRevenue = useMemo(
    () => calculateRevenue(filteredAppointments),
    [filteredAppointments, calculateRevenue],
  );

  const statsWithBreakdown = useMemo(() => {
    const totalAppointments = appointments.length;
    const confirmed = appointments.filter((a: Booking) => a.status === 'confirmed').length;
    const pending = appointments.filter((a: Booking) => a.status === 'pending').length;
    const cancelled = appointments.filter((a: Booking) => a.status === 'cancelled').length;
    const completed = appointments.filter((a: Booking) => a.status === 'completed').length;

    return {
      ...stats,
      total: totalAppointments,
      confirmed,
      pending,
      cancelled,
      completed,
      confirmationRate:
        totalAppointments > 0 ? Math.round((confirmed / totalAppointments) * 100) : 0,
    };
  }, [appointments, stats]);

  // Load initial data
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        await Promise.all([
          dispatch(fetchAppointments({})),
          dispatch(loadMedicalCenterSettings()),
        ]);
      } catch (error) {
        if (error instanceof Error && error.message?.includes('Session expired')) {
          dispatch(clearAuth());
          router.push('/medical');
        }
      }
    };

    loadData();
  }, [dispatch, isAuthenticated, router]);

  // Socket connection
  useEffect(() => {
    if (!isAuthenticated) return;

    socketService.connect();
    socketService.joinRoom('doctors');

    const handleNewBooking = () => {
      dispatch(fetchAppointments({}));
    };

    const handleBookingUpdated = (data: { booking: Booking }) => {
      dispatch(
        updateAppointmentInList({
          bookingId: data.booking._id,
          updates: data.booking,
        }),
      );
    };

    socketService.onEvent('newBooking', handleNewBooking);
    socketService.onEvent('bookingUpdated', handleBookingUpdated);

    return () => {
      socketService.offEvent('newBooking', handleNewBooking);
      socketService.offEvent('bookingUpdated', handleBookingUpdated);
      socketService.disconnect();
    };
  }, [dispatch, isAuthenticated]);

  // Auto-clear notifications
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        dispatch(clearNotifications());
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error, success, dispatch]);

  const handleLogout = useCallback(() => {
    dispatch(clearAuth());
    router.push('/medical');
  }, [dispatch, router]);

  const formatTime = useCallback((time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const getStatusConfig = useCallback(
    (status: AppointmentStatus): { color: BadgeVariant; icon: ElementType; label: string } => {
      const configs = {
        confirmed: { color: 'success' as const, icon: CheckCircle, label: 'Confirmed' },
        pending: { color: 'warning' as const, icon: Clock, label: 'Pending' },
        cancelled: { color: 'danger' as const, icon: X, label: 'Cancelled' },
        completed: { color: 'success' as const, icon: CheckCircle, label: 'Completed' },
        'no-show': { color: 'danger' as const, icon: X, label: 'No Show' },
        rescheduled: { color: 'info' as const, icon: RefreshCw, label: 'Rescheduled' },
      };
      return configs[status] || { color: 'default' as const, icon: Clock, label: status };
    },
    [],
  );

  const getPaymentStatusConfig = useCallback(
    (status?: PaymentStatus): { color: BadgeVariant; label: string } => {
      const configs = {
        success: { color: 'success' as const, label: 'Paid' },
        pending: { color: 'warning' as const, label: 'Payment Pending' },
        failed: { color: 'danger' as const, label: 'Payment Failed' },
        refunded: { color: 'info' as const, label: 'Refunded' },
        none: { color: 'default' as const, label: 'No Payment' },
      };
      return configs[status || 'none'] || configs.none;
    },
    [],
  );

  const getUrgencyIcon = useCallback((urgency: Urgency) => {
    switch (urgency) {
      case 'emergency':
        return <Activity className="w-4 h-4 text-red-600" />;
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <Clock4 className="w-4 h-4 text-blue-600" />;
    }
  }, []);

  const getSpecializationIcon = useCallback((specialization: string) => {
    const icons: Record<string, ReactNode> = {
      cardiology: <Heart className="w-4 h-4 text-red-500" />,
      neurology: <Brain className="w-4 h-4 text-purple-500" />,
      orthopedics: <Bone className="w-4 h-4 text-amber-500" />,
      ophthalmology: <Eye className="w-4 h-4 text-blue-500" />,
      dentistry: <Stethoscope className="w-4 h-4 text-gray-500" />,
      pediatrics: <Baby className="w-4 h-4 text-pink-500" />,
      general: <User className="w-4 h-4 text-green-500" />,
      'internal medicine': <Thermometer className="w-4 h-4 text-orange-500" />,
      dermatology: <Sparkles className="w-4 h-4 text-yellow-500" />,
      psychiatry: <Brain className="w-4 h-4 text-indigo-500" />,
      surgery: <Syringe className="w-4 h-4 text-red-400" />,
      emergency: <Hospital className="w-4 h-4 text-red-600" />,
    };
    return icons[specialization?.toLowerCase()] || (
      <Stethoscope className="w-4 h-4 text-gray-400" />
    );
  }, []);

  const getPatientFileId = useCallback((appointment: Booking) => {
    return (
      appointment.patientFileId ||
      appointment.patientId ||
      appointment.patient_id ||
      appointment._id
    );
  }, []);

  // Appointment Card Component
  const AppointmentCard = memo(({ appointment }: { appointment: Booking }) => {
    const statusConfig = getStatusConfig(appointment.status);
    const paymentConfig = getPaymentStatusConfig(appointment.payment_status);
    const StatusIcon = statusConfig.icon;

    const remainingBalance = Math.max(
      toNumber(appointment.consultation_fee) - toNumber(appointment.deposit_amount),
      0,
    );

    const patientFileId = getPatientFileId(appointment);

    return (
      <ModernCard hover className="p-5">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {appointment.patientName}
                </h3>
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  <Badge variant={statusConfig.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>

                  <Badge variant={paymentConfig.color}>
                    <CreditCard className="w-3 h-3 mr-1" />
                    {paymentConfig.label}
                  </Badge>

                  <Badge
                    variant={
                      appointment.urgency === 'emergency'
                        ? 'danger'
                        : appointment.urgency === 'urgent'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {getUrgencyIcon(appointment.urgency)}
                    <span className="ml-1">{appointment.urgency}</span>
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                ID: {(appointment.appointment_id || appointment._id).slice(-8)}
              </span>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Medical Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Stethoscope className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">Medical Condition</span>
              </div>
              <p className="text-gray-900">
                {appointment.medicalCondition || 'Not specified'}
              </p>

              {appointment.symptoms && (
                <>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Symptoms</span>
                  </div>
                  <p className="text-gray-900">{appointment.symptoms}</p>
                </>
              )}

              <div className="flex items-center space-x-2">
                {getSpecializationIcon(appointment.doctorSpecialization?.[0] || 'general')}
                <span className="font-medium text-gray-700">Specialization</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {(appointment.doctorSpecialization || []).map((spec, index) => (
                  <Badge key={index} variant="info" size="sm">
                    {getSpecializationIcon(spec)}
                    <span className="ml-1">{spec}</span>
                  </Badge>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">Doctor Booked</span>
              </div>
              <p className="text-gray-900 font-semibold">
                {appointment.doctorName || 'Unassigned Doctor'}
              </p>
            </div>

            {/* Patient & Appointment Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">Appointment Time</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-800 text-sm">
                    {formatDate(getEffectiveDate(appointment))}
                  </span>
                </div>

                <div className="flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-800 text-sm">
                    {formatTime(getEffectiveTime(appointment))}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">Patient Details</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-800 text-sm font-medium">
                    {appointment.patientPhone}
                  </span>
                </div>

                <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-800 text-sm truncate font-medium">
                    {appointment.patientEmail}
                  </span>
                </div>

                <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-800 text-sm font-medium">
                    {appointment.patientAge} yrs • {appointment.patientGender}
                  </span>
                </div>

                <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <ShieldCheck className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-800 text-sm font-medium capitalize">
                    {appointment.patientSector}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-emerald-700" />
                <span className="font-semibold text-emerald-900">Payment Summary</span>
              </div>
              <Badge variant={paymentConfig.color} size="sm">
                <Receipt className="w-3 h-3 mr-1" />
                {paymentConfig.label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-white/70 rounded-xl p-3 border border-white">
                <p className="text-gray-500">Consultation Fee</p>
                <p className="font-bold text-gray-900">
                  {formatCurrency(appointment.consultation_fee, appointment.currency || 'ZAR')}
                </p>
              </div>

              <div className="bg-white/70 rounded-xl p-3 border border-white">
                <p className="text-gray-500">Deposit</p>
                <p className="font-bold text-gray-900">
                  {formatCurrency(appointment.deposit_amount, appointment.currency || 'ZAR')}
                </p>
              </div>

              <div className="bg-white/70 rounded-xl p-3 border border-white">
                <p className="text-gray-500">Platform Fee</p>
                <p className="font-bold text-gray-900">
                  {formatCurrency(appointment.platform_fee, appointment.currency || 'ZAR')}
                </p>
              </div>

              <div className="bg-white/70 rounded-xl p-3 border border-white">
                <p className="text-gray-500">Total deposit To Pay</p>
                <p className="font-bold text-gray-900">
                  {formatCurrency(appointment.total_amount, appointment.currency || 'ZAR')}
                </p>
              </div>

              <div className="bg-white/70 rounded-xl p-3 border border-white">
                <p className="text-gray-500">Balance Left</p>
                <p className="font-bold text-amber-700">
                  {formatCurrency(remainingBalance, appointment.currency || 'ZAR')}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <span>Payment Required: {appointment.payment_required ? 'Yes' : 'No'}</span>
              <span>Paid: {appointment.is_paid ? 'Yes' : 'No'}</span>
              {appointment.payment_reference && (
                <span className="font-mono">Ref: {appointment.payment_reference}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center flex-wrap gap-2">
              {appointment.isShiftedSlot && (
                <Badge variant="warning" size="sm">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Time Shifted
                </Badge>
              )}

              {(appointment.consultationType === 'online' ||
                appointment.consultationType === 'telemedicine') && (
                <Badge variant="purple" size="sm">
                  <Video className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              )}

              <Badge variant="default" size="sm">
                <Calendar className="w-3 h-3 mr-1" />
                Created: {new Date(appointment.createdAt).toLocaleDateString()}
              </Badge>

              <Link
                href={`/patient-files/${patientFileId}`}
                className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors font-medium flex items-center space-x-2"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Open Patient File</span>
              </Link>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  dispatch(setSelectedAppointment(appointment));
                  dispatch(setNewDate(getEffectiveDate(appointment)));
                  dispatch(setNewTime(getEffectiveTime(appointment)));
                  dispatch(setShowRescheduleModal(true));
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Reschedule</span>
              </button>

              <button
                onClick={() =>
                  dispatch(
                    cancelAppointment({
                      bookingId: appointment._id,
                      reason: 'Cancelled by medical center',
                    }),
                  )
                }
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      </ModernCard>
    );
  });
  AppointmentCard.displayName = 'AppointmentCard';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading && appointments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <DoctorNav />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  const appointmentsToShow = {
    today: todaysAppointments,
    tomorrow: tomorrowsAppointments,
    upcoming: upcomingAppointments,
    past: pastAppointments,
  }[activeTab];

  const revenueForActiveTab = {
    today: todayRevenue,
    tomorrow: tomorrowRevenue,
    upcoming: upcomingRevenue,
    past: totalRevenue,
  }[activeTab];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <DoctorNav />

      {(error || success) && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg mb-2">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
                <button onClick={() => dispatch(clearNotifications())}>
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">{success}</p>
                </div>
                <button onClick={() => dispatch(clearNotifications())}>
                  <X className="w-4 h-4 text-green-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                  <Hospital className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Appointment Dashboard
                  </h1>
                  {medicalCenterSettings && (
                    <p className="text-gray-600 text-sm">
                      {medicalCenterSettings.facility_name} • ID:{' '}
                      {medicalCenterId?.slice(-8)}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mt-1 text-sm">
                Manage your medical center&apos;s appointments, payments, and patient files
              </p>
            </div>

            <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
              <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-xl">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">
                  Center ID: {medicalCenterId?.slice(-8)}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-2xl shadow hover:shadow-xl transition-all duration-300 hover:from-gray-200 hover:to-gray-300 font-semibold flex items-center space-x-2 text-sm group"
              >
                <LogOut className="w-4 h-4 text-gray-600 group-hover:scale-110 transition-transform" />
                <span>Logout</span>
              </button>

              <Link
                href="/add-practitioner"
                className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:from-green-600 hover:to-emerald-700 font-semibold flex items-center space-x-2 text-sm group"
              >
                <Plus className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Add Practitioner</span>
              </Link>

              <Link
                href="/medical-staff"
                className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:from-blue-600 hover:to-blue-700 font-semibold flex items-center space-x-2 text-sm group"
              >
                <Users className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Medical Staff</span>
              </Link>

              <Link
                href="/weekly-schedules"
                className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:from-purple-600 hover:to-purple-700 font-semibold flex items-center space-x-2 text-sm group"
              >
                <Calendar className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Weekly Schedules</span>
              </Link>

              <Link
                href="/medical-center-settings"
                className="px-4 py-2.5 bg-white/80 backdrop-blur-xl border border-gray-300 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-gray-700 hover:bg-white font-semibold flex items-center space-x-2 text-sm group"
              >
                <Settings className="w-4 h-4 text-gray-600 group-hover:rotate-90 transition-transform" />
                <span>Medical Center Settings</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Today's Appointments"
            value={stats.today}
            icon={<CalendarCheck className="w-6 h-6" />}
            color="blue"
            description={`${todaysAppointments.length} filtered`}
          />
          <StatCard
            title="Tomorrow"
            value={stats.tomorrow}
            icon={<CalendarDays className="w-6 h-6" />}
            color="green"
            description={`${tomorrowsAppointments.length} filtered`}
          />
          <StatCard
            title="This Week"
            value={stats.week}
            icon={<Calendar className="w-6 h-6" />}
            color="purple"
            description={`${upcomingAppointments.length} upcoming`}
          />
          <StatCard
            title="Confirmation Rate"
            value={`${statsWithBreakdown.confirmationRate}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="orange"
            description={`${statsWithBreakdown.confirmed} confirmed of ${statsWithBreakdown.total}`}
          />
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Money Made Today"
            value={formatCurrency(todayRevenue.totalPaid)}
            icon={<DollarSign className="w-6 h-6" />}
            color="green"
            description={`${todayRevenue.successfulPayments} successful payments`}
          />
          <StatCard
            title="Tomorrow Expected"
            value={formatCurrency(tomorrowRevenue.totalExpected)}
            icon={<Wallet className="w-6 h-6" />}
            color="blue"
            description={`${tomorrowRevenue.pendingPayments} pending payments`}
          />
          <StatCard
            title="Upcoming Expected"
            value={formatCurrency(upcomingRevenue.totalExpected)}
            icon={<Receipt className="w-6 h-6" />}
            color="purple"
            description={`${upcomingRevenue.successfulPayments} paid already`}
          />
          <StatCard
            title="Total Collected"
            value={formatCurrency(totalRevenue.totalPaid)}
            icon={<CreditCard className="w-6 h-6" />}
            color="orange"
            description={`${totalRevenue.failedPayments} failed payments`}
          />
        </div>

        {/* Advanced Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-lg font-bold text-amber-600">
                  {statsWithBreakdown.pending}
                </p>
              </div>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Completed</p>
                <p className="text-lg font-bold text-emerald-600">
                  {statsWithBreakdown.completed}
                </p>
              </div>
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Cancelled</p>
                <p className="text-lg font-bold text-red-600">
                  {statsWithBreakdown.cancelled}
                </p>
              </div>
              <X className="w-5 h-5 text-red-400" />
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Urgent Cases</p>
                <p className="text-lg font-bold text-red-600">
                  {
                    appointments.filter(
                      (a: Booking) => a.urgency === 'urgent' || a.urgency === 'emergency',
                    ).length
                  }
                </p>
              </div>
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Deposits</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(totalRevenue.totalDeposits)}
                </p>
              </div>
              <Wallet className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Platform Fees</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(totalRevenue.totalPlatformFees)}
                </p>
              </div>
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <ModernCard className="p-4 mb-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients, doctors, conditions, email, phone, appointment ID..."
                  value={searchTerm}
                  onChange={(e) => dispatch(setSearchTerm(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2 group"
              >
                <Filter className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                <span>Filters</span>
                {Object.values(filters).some((f) => f) && (
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                )}
              </button>

              <button
                onClick={() => dispatch(fetchAppointments({}))}
                className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors group"
                title="Refresh appointments"
              >
                <RefreshCw className="w-5 h-5 text-gray-500 group-hover:rotate-180 transition-transform" />
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  dispatch(setSuccess('Link copied to clipboard!'));
                }}
                className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors group"
                title="Share dashboard"
              >
                <Share2 className="w-5 h-5 text-gray-500 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        dispatch(setFilter({ key: 'status', value: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
                    >
                      <option value="">All Status</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                      <option value="rescheduled">Rescheduled</option>
                      <option value="no-show">No Show</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={filters.date}
                    onChange={(e) =>
                      dispatch(setFilter({ key: 'date', value: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Practitioner
                  </label>
                  <div className="relative">
                    <select
                      value={filters.practitioner}
                      onChange={(e) =>
                        dispatch(setFilter({ key: 'practitioner', value: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
                    >
                      <option value="">All Practitioners</option>
                      {medicalCenterSettings?.doctors?.map((doctor: Doctor) => (
                        <option key={doctor._id} value={doctor._id}>
                          {doctor.name} ({doctor.specialization[0] || 'General'})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Bell className="w-4 h-4" />
                <span>
                  Showing {filteredAppointments.length} of {appointments.length}{' '}
                  appointments
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    dispatch(setSearchTerm(''));
                    dispatch(clearFilters());
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear all
                </button>

                <button className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-1">
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>

                <button className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-sm rounded-lg hover:bg-emerald-100 transition-colors flex items-center space-x-1">
                  <BarChart3 className="w-3 h-3" />
                  <span>Analytics</span>
                </button>
              </div>
            </div>
          </div>
        </ModernCard>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-2xl">
            {[
              {
                id: 'today',
                label: 'Today',
                count: todaysAppointments.length,
                icon: <CalendarCheck className="w-4 h-4" />,
              },
              {
                id: 'tomorrow',
                label: 'Tomorrow',
                count: tomorrowsAppointments.length,
                icon: <CalendarDays className="w-4 h-4" />,
              },
              {
                id: 'upcoming',
                label: 'Upcoming',
                count: upcomingAppointments.length,
                icon: <Calendar className="w-4 h-4" />,
              },
              {
                id: 'past',
                label: 'Past',
                count: pastAppointments.length,
                icon: <Clock4 className="w-4 h-4" />,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'upcoming' | 'today' | 'tomorrow' | 'past')}
                className={`
                  flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300
                  ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-lg scale-[1.02]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }
                `}
              >
                <div className="flex items-center justify-center space-x-2">
                  {tab.icon}
                  <span className="font-semibold">{tab.label}</span>
                  <span
                    className={`
                      px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center
                      ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-200 text-gray-600'
                      }
                    `}
                  >
                    {tab.count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Active tab revenue summary */}
        <ModernCard className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-gray-500">Collected</p>
              <p className="text-lg font-bold text-emerald-600">
                {formatCurrency(revenueForActiveTab.totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Expected</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(revenueForActiveTab.totalExpected)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Consultation Total</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(revenueForActiveTab.totalConsultation)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Deposits</p>
              <p className="text-lg font-bold text-purple-600">
                {formatCurrency(revenueForActiveTab.totalDeposits)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Successful Payments</p>
              <p className="text-lg font-bold text-orange-600">
                {revenueForActiveTab.successfulPayments}
              </p>
            </div>
          </div>
        </ModernCard>

        {/* Appointments List */}
        <div className="space-y-4">
          {appointmentsToShow.length === 0 ? (
            <EmptyState
              searchTerm={searchTerm}
              filters={filters}
              onClear={() => {
                dispatch(setSearchTerm(''));
                dispatch(clearFilters());
              }}
            />
          ) : (
            appointmentsToShow.map((appointment: Booking) => (
              <AppointmentCard key={appointment._id} appointment={appointment} />
            ))
          )}
        </div>

        {/* Reschedule Modal */}
        {showRescheduleModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <ModernCard className="max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Reschedule Appointment</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    for {selectedAppointment.patientName}
                  </p>
                </div>
                <button
                  onClick={() => dispatch(setShowRescheduleModal(false))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={newDate}
                    onChange={(e) => dispatch(setNewDate(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Time
                  </label>
                  <div className="relative">
                    <select
                      value={newTime}
                      onChange={(e) => dispatch(setNewTime(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
                    >
                      <option value="">Select a time</option>
                      {[
                        '09:00',
                        '10:00',
                        '11:00',
                        '12:00',
                        '14:00',
                        '15:00',
                        '16:00',
                        '17:00',
                      ].map((time) => (
                        <option key={time} value={time}>
                          {formatTime(time)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Rescheduling Information</p>
                      <p className="text-blue-700">
                        The patient will be notified of the new appointment time. Previous
                        time slot will be made available for other patients.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => dispatch(setShowRescheduleModal(false))}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => dispatch(handleReschedule())}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors font-medium text-sm shadow-md hover:shadow-lg"
                  >
                    Confirm Reschedule
                  </button>
                </div>
              </div>
            </ModernCard>
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Appointment Summary
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Appointments</span>
                  <span className="font-semibold">{appointments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending Approval</span>
                  <span className="font-semibold text-amber-600">
                    {statsWithBreakdown.pending}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed Today</span>
                  <span className="font-semibold text-emerald-600">
                    {
                      todaysAppointments.filter((a: Booking) => a.status === 'completed')
                        .length
                    }
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Revenue Summary</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Collected Today</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(todayRevenue.totalPaid)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Expected This Week</span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(upcomingRevenue.totalExpected)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Collected</span>
                  <span className="font-semibold text-purple-600">
                    {formatCurrency(totalRevenue.totalPaid)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Medical Center Info
              </h4>
              <div className="space-y-2">
                {medicalCenterSettings && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Center Name</span>
                      <span className="font-semibold truncate max-w-[150px]">
                        {medicalCenterSettings.facility_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Doctors</span>
                      <span className="font-semibold">
                        {medicalCenterSettings.doctors?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Center ID</span>
                      <span className="font-semibold font-mono">
                        {medicalCenterId?.slice(-8)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">System Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <span className="font-semibold">
                    {new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Session Status</span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                    <span className="font-semibold text-emerald-600">Active</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data Version</span>
                  <span className="font-semibold font-mono">v1.0.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}