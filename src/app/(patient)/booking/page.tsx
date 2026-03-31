'use client';

import { Suspense, useState, useEffect, useCallback, JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import * as bookingActions from '@/app/reduxPatient/slices/patient/bookingSlice';
import { RootState, AppDispatch } from '@/app/redux/store';
import { ToastContainer, toast, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ================= TYPES MATCHING SLICE =================

type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'failed'
  | 'no-show'
  | 'rescheduled';

type PaymentStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'refunded'
  | 'paid'
  | 'none'
  | 'not_required';

type DateRangeOption = 'today' | 'tomorrow' | 'week' | 'all';
type ConsultationType = 'face-to-face' | 'telemedicine' | 'follow-up';
type BookingStep = 'select-doctor' | 'booking-details';

interface Address {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postal: string;
  lat?: number;
  lng?: number;
}

interface Practitioner {
  _id: string;
  practitioner_id: string;
  full_name: string;
  role?: string;
  professional_license_number?: string;
  license_type?: string;
  specialties?: string[];
  contact_email?: string;
  verification_status: string;
  is_active: boolean;
  added_at: string;
  last_updated: string;
}

interface Statistics {
  total_patients: number;
  total_appointments: number;
  monthly_appointments: number;
  average_rating: number;
  response_time: number;
}

interface DoctorForBooking {
  doctorId: string;
  doctorName: string;
  role?: string;
  specialization: string[];
  maxPatients: number;
  currentPatients: number;
  availableSlots: number;
  consultationType: string;
  colorCode: string;
  isAvailable?: boolean;
  isBooked?: boolean;
}

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  capacity: number;
  availableCapacity: number;
  type: string;
  isPeakHour: boolean;
  assignedDoctors: DoctorForBooking[];
  specialization: string;
  specializations: string[];
  consultationType: string;
}

interface DailySchedule {
  date: string;
  dayName: string;
  isWorking: boolean;
  timeSlots: TimeSlot[];
  lunchBreaks: unknown[];
  sessions: { morning: unknown; afternoon: unknown; night: unknown };
}

interface ScheduleData {
  _id: string;
  schedule_id: string;
  medical_center_id: string;
  windowStart: string;
  windowEnd: string;
  dailySchedules: DailySchedule[];
  historicalDays: unknown[];
  assignedDoctors: string[];
  isActive: boolean;
  defaultDoctors: unknown[];
  slotDuration: number;
  bufferTime: number;
  maxDoctorsPerSlot: number;
  createdBy: string;
  updatedBy: string;
  lateArrivals: unknown[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface MedicalCenter {
  _id: string;
  medical_center_id: string;
  facility_name: string;
  facility_type: string;
  company_reg_number: string;
  healthcare_reg_number: string;
  official_domain_email: string;
  phone: string;
  address: Address;
  practitioners: Practitioner[];
  settings: unknown;
  statistics: Statistics;
  billing: unknown;
  theme_colors?: { primary: string; secondary: string };
  verification_status: string;
  is_verified: boolean;
  is_active: boolean;
  parent_center_id: string | null;
  branches: unknown[];
  created_at: string;
  updated_at: string;
  __v: number;
  paymentSettings?: {
    bookingDeposit?: number;
    consultationFee?: number;
  };
}

interface BookingPatientInfo {
  _id: string;
  email: string;
  name: string;
  phone: string;
}

interface Appointment {
  _id: string;
  appointment_id: string;
  patient_id: string;
  medical_center_id: string;
  practitioner_id: string;
  date: string;
  slot_id: string;
  reason_for_visit: string;
  symptoms: string;
  consultation_type: string;
  status: AppointmentStatus;
  payment_status: PaymentStatus;
  payment_reference?: string;
  payment_required?: boolean;
  created_at: string;
  updated_at: string;
}

interface BookingModalData {
  isOpen: boolean;
  medicalCenter: MedicalCenter | null;
  schedule: ScheduleData | null;
  date: string;
  slot: TimeSlot | null;
  selectedDoctor: DoctorForBooking | null;
  reasonForVisit: string;
  symptoms: string;
  preferredSpecialization: string;
  consultationType: ConsultationType;
  step: BookingStep;
}

interface BookingStateShape {
  medicalCenter: MedicalCenter | null;
  centerAppointments: Appointment[];
  schedule: ScheduleData | null;
  loading: boolean;
  scheduleLoading: boolean;
  error: string | null;
  selectedDateRange: DateRangeOption;
  bookingModal: BookingModalData;
  availableDoctors: DoctorForBooking[];
  bookingLoading: boolean;
  bookingError: string | null;
  successMessage: string | null;
  patientInfo: BookingPatientInfo | null;
  doctorAvailability: unknown[];
  viewMode: 'slots' | 'doctors';
  bookingStatus: 'idle' | 'pending' | 'paid' | 'confirmed' | 'failed';
  appointments: Appointment[];
}

// ================= UTILITIES =================

const utils = {
  formatAddress: (center: MedicalCenter | null) =>
    center?.address
      ? [center.address.line1, center.address.line2, center.address.city, center.address.province]
          .filter(Boolean)
          .join(', ')
      : 'Address not available',

  formatTime: (timeString: string = '') => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  },

  formatDate: (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),

  getInitials: (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3),

  getSlotStatus: (slot: TimeSlot) => {
    if (!slot.assignedDoctors || slot.assignedDoctors.length === 0) {
      return { status: 'no-doctors' as const, availableDoctors: 0, bookedDoctors: 0 };
    }

    const availableDoctors = slot.assignedDoctors.filter((d) => !d.isBooked).length;
    const bookedDoctors = slot.assignedDoctors.filter((d) => d.isBooked).length;

    return {
      status: availableDoctors > 0 ? ('available' as const) : ('all-booked' as const),
      availableDoctors,
      bookedDoctors,
    };
  },

  getDoctorStatus: (doctor: DoctorForBooking) => {
    if (doctor.isBooked) {
      return {
        text: 'Booked',
        color: 'text-rose-700',
        bg: 'bg-rose-100',
        dot: 'bg-rose-500',
        icon: '❌',
      };
    }

    return {
      text: 'Available',
      color: 'text-emerald-700',
      bg: 'bg-emerald-100',
      dot: 'bg-emerald-500',
      icon: '✅',
    };
  },
};

// ================= UI COMPONENTS =================

const ScrollableContainer = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`overflow-y-auto overflow-x-hidden pr-1 sm:pr-2 ${className}`}
    style={{
      scrollbarWidth: 'thin',
      scrollbarColor: '#94a3b8 transparent',
      WebkitOverflowScrolling: 'touch',
    }}
  >
    <style jsx>{`
      div::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      div::-webkit-scrollbar-track {
        background: transparent;
      }
      div::-webkit-scrollbar-thumb {
        background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
        border-radius: 999px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }
      div::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(to bottom, #94a3b8, #64748b);
        border: 2px solid transparent;
        background-clip: padding-box;
      }
    `}</style>
    {children}
  </div>
);

const SurfaceCard = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${className}`}
  >
    {children}
  </div>
);

const SoftBackground = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f8fafc_45%,#f1f5f9_100%)]">
    {children}
  </div>
);

const formControlClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 caret-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 appearance-none';

const Icon = ({ name, className = '' }: { name: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    user: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    ),
    calendar: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
    clock: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    location: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </>
    ),
    building: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    ),
    lock: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    ),
    check: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    warning: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    ),
    error: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    chevron: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 9l-7 7-7-7" />,
    arrowLeft: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    ),
    close: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />,
    spinner: (
      <>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </>
    ),
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[name]}
    </svg>
  );
};

const PaymentStatusIndicator = ({ status }: { status: string }) => {
  const configs: Record<string, { color: string; bg: string; text: string }> = {
    pending: { color: 'text-amber-700', bg: 'bg-amber-100', text: 'Awaiting Payment' },
    paid: { color: 'text-blue-700', bg: 'bg-blue-100', text: 'Payment Verified' },
    confirmed: { color: 'text-emerald-700', bg: 'bg-emerald-100', text: 'Appointment Confirmed' },
    failed: { color: 'text-rose-700', bg: 'bg-rose-100', text: 'Payment Failed' },
    default: { color: 'text-slate-700', bg: 'bg-slate-100', text: 'Ready to Book' },
  };

  const config = configs[status] || configs.default;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold ${config.bg} ${config.color}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${status === 'confirmed' ? 'bg-emerald-500' : status === 'pending' ? 'bg-amber-500' : status === 'paid' ? 'bg-blue-500' : status === 'failed' ? 'bg-rose-500' : 'bg-slate-500'}`} />
      <span>{config.text}</span>
    </div>
  );
};

const DoctorAvatar = ({ doctor, size = 56 }: { doctor: DoctorForBooking; size?: number }) => (
  <div
    className="shrink-0 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      background: `linear-gradient(135deg, ${doctor.colorCode || '#2563eb'}, ${doctor.colorCode || '#2563eb'}cc)`,
    }}
  >
    {doctor.doctorName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()}
  </div>
);

const DoctorAvatarSmall = ({ doctor }: { doctor: DoctorForBooking }) => {
  const status = utils.getDoctorStatus(doctor);
  const initials = doctor.doctorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex w-[72px] flex-col items-center gap-1.5">
      <div className="relative">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${doctor.colorCode || '#2563eb'}, ${doctor.colorCode || '#2563eb'}aa)`,
          }}
        >
          {initials}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${status.dot}`}
        />
      </div>
      <div className="w-full text-center">
        <div className="truncate text-[11px] font-semibold text-slate-700">
          Dr. {doctor.doctorName.split(' ')[0]}
        </div>
        <div className={`mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${status.bg} ${status.color}`}>
          {status.text}
        </div>
      </div>
    </div>
  );
};

const TimeSlotButton = ({
  slot,
  onClick,
}: {
  slot: TimeSlot;
  day: DailySchedule;
  onClick: () => void;
}) => {
  const slotStatus = utils.getSlotStatus(slot);
  const isAvailable = slotStatus.status === 'available';
  const hasDoctors = slot.assignedDoctors && slot.assignedDoctors.length > 0;

  const containerClass = !hasDoctors
    ? 'border-slate-200 bg-slate-50'
    : isAvailable
      ? 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50 hover:border-emerald-300 hover:shadow-lg'
      : 'border-rose-200 bg-gradient-to-br from-white to-rose-50';

  return (
    <button
      onClick={onClick}
      disabled={!isAvailable}
      className={`group relative min-h-[178px] rounded-2xl border p-4 text-left transition-all duration-200 ${containerClass} disabled:cursor-not-allowed disabled:opacity-80`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-bold text-slate-900">{utils.formatTime(slot.start)}</div>
          <div className="text-xs font-medium text-slate-500">{utils.formatTime(slot.end)}</div>
        </div>

        <div
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            !hasDoctors
              ? 'bg-slate-200 text-slate-700'
              : isAvailable
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
          }`}
        >
          {!hasDoctors ? 'No Doctors' : isAvailable ? 'Available' : 'Booked Out'}
        </div>
      </div>

      {hasDoctors ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {slot.assignedDoctors.slice(0, 4).map((doctor) => (
              <DoctorAvatarSmall key={doctor.doctorId} doctor={doctor} />
            ))}

            {slot.assignedDoctors.length > 4 && (
              <div className="flex w-[72px] flex-col items-center gap-1.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                  +{slot.assignedDoctors.length - 4}
                </div>
                <div className="text-[10px] text-slate-500">more</div>
              </div>
            )}
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-3 text-[11px] font-medium">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {slotStatus.availableDoctors} Available
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              {slotStatus.bookedDoctors} Booked
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm font-medium text-slate-500">
          No doctors assigned to this time slot.
        </div>
      )}
    </button>
  );
};

const StatusBanner = ({
  tone,
  children,
}: {
  tone: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
}) => {
  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  return <div className={`rounded-2xl border px-4 py-3.5 text-sm font-medium ${styles[tone]}`}>{children}</div>;
};

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
  onBackToDoctorSelection,
}: {
  bookingModal: BookingModalData;
  availableDoctors: DoctorForBooking[];
  bookingLoading: boolean;
  bookingError: string | null;
  specializations: string[];
  patientInfo: BookingPatientInfo | null;
  onClose: () => void;
  onSelectDoctor: (doctor: DoctorForBooking) => void;
  onBookAppointment: (bookingData: BookingModalData) => Promise<void>;
  onBackToDoctorSelection: () => void;
}) => {
  const [localModal, setLocalModal] = useState<BookingModalData>(bookingModal);

  useEffect(() => {
    setLocalModal(bookingModal);
  }, [bookingModal]);

  const handleBook = async () => {
    await onBookAppointment(localModal);
  };

  const availableDoctorsList = availableDoctors.filter((d) => !d.isBooked);
  const bookedDoctorsList = availableDoctors.filter((d) => d.isBooked);

  const slotStart = localModal.slot?.start || '';
  const slotEnd = localModal.slot?.end || '';
  const requiresPayment = (localModal.medicalCenter?.paymentSettings?.bookingDeposit ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
      <div className="absolute inset-0 flex items-end justify-center sm:items-center p-0 sm:p-5">
        <SurfaceCard className="h-[94vh] w-full overflow-hidden rounded-t-[28px] rounded-b-none sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-[32px]">
          <ScrollableContainer className="h-full max-h-[94vh] sm:max-h-[92vh]">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {localModal.step === 'select-doctor' ? 'Step 1 of 2' : 'Step 2 of 2'}
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                    {localModal.step === 'select-doctor' ? 'Select Doctor' : 'Book Appointment'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {localModal.step === 'select-doctor'
                      ? 'Choose an available doctor for this slot.'
                      : 'Review details and complete your booking.'}
                  </p>
                </div>

                <button
                  onClick={onClose}
                  disabled={bookingLoading}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {patientInfo && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Patient
                    </div>
                    <p className="text-base font-semibold text-slate-900">{patientInfo.name}</p>
                    <p className="text-sm text-slate-600">{patientInfo.email}</p>
                  </div>
                )}

                {localModal.medicalCenter && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Booking Details
                    </div>
                    <h4 className="text-base font-semibold text-slate-900">
                      {localModal.medicalCenter.facility_name}
                    </h4>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <div>{utils.formatDate(localModal.date)}</div>
                      <div>
                        {utils.formatTime(slotStart)} - {utils.formatTime(slotEnd)}
                      </div>
                      <div>{utils.formatAddress(localModal.medicalCenter)}</div>
                    </div>
                  </div>
                )}
              </div>

              {localModal.step === 'select-doctor' && (
                <div className="space-y-5">
                  {availableDoctorsList.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Available Doctors
                      </h4>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {availableDoctorsList.map((doctor) => (
                          <button
                            key={doctor.doctorId}
                            type="button"
                            onClick={() => onSelectDoctor(doctor)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              localModal.selectedDoctor?.doctorId === doctor.doctorId
                                ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100'
                                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <DoctorAvatar doctor={doctor} />
                              <div className="min-w-0 flex-1">
                                <h5 className="truncate text-lg font-bold text-slate-900">
                                  Dr. {doctor.doctorName}
                                </h5>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                    {doctor.role || 'Doctor'}
                                  </span>
                                  {doctor.specialization?.slice(0, 2).map((spec, idx) => (
                                    <span
                                      key={idx}
                                      className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700"
                                    >
                                      {spec}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {bookedDoctorsList.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Unavailable Doctors
                      </h4>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {bookedDoctorsList.map((doctor) => (
                          <div
                            key={doctor.doctorId}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-70"
                          >
                            <div className="flex items-start gap-4">
                              <DoctorAvatar doctor={doctor} />
                              <div className="min-w-0 flex-1">
                                <h5 className="truncate text-lg font-bold text-slate-700">
                                  Dr. {doctor.doctorName}
                                </h5>
                                <div className="mt-2 inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                                  Already Booked
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
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Selected Doctor
                        </div>
                        <h5 className="text-lg font-bold text-slate-900">
                          Dr. {localModal.selectedDoctor.doctorName}
                        </h5>
                      </div>

                      <button
                        onClick={onBackToDoctorSelection}
                        disabled={bookingLoading}
                        className="inline-flex items-center gap-2 self-start rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                      >
                        <Icon name="arrowLeft" className="h-4 w-4" />
                        Change Doctor
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Reason for Visit *
                    </label>
                    <textarea
                      value={localModal.reasonForVisit}
                      onChange={(e) =>
                        setLocalModal({
                          ...localModal,
                          reasonForVisit: e.target.value,
                          symptoms: e.target.value,
                        })
                      }
                      className={`${formControlClass} min-h-[140px] resize-y`}
                      rows={5}
                      placeholder="Please describe the reason for your visit..."
                      disabled={bookingLoading}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Preferred Specialization
                      </label>
                      <select
                        value={localModal.preferredSpecialization}
                        onChange={(e) =>
                          setLocalModal({ ...localModal, preferredSpecialization: e.target.value })
                        }
                        className={formControlClass}
                      >
                        <option value="">Select specialization</option>
                        {specializations.map((spec) => (
                          <option key={spec} value={spec.toLowerCase()}>
                            {spec}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Consultation Type
                      </label>
                      <select
                        value={localModal.consultationType}
                        onChange={(e) =>
                          setLocalModal({
                            ...localModal,
                            consultationType: e.target.value as ConsultationType,
                          })
                        }
                        className={formControlClass}
                      >
                        <option value="face-to-face">Face to Face</option>
                        <option value="telemedicine">Telemedicine</option>
                        <option value="follow-up">Follow Up</option>
                      </select>
                    </div>
                  </div>

                  {bookingError && <StatusBanner tone="error">{bookingError}</StatusBanner>}

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                    <button
                      onClick={onClose}
                      disabled={bookingLoading}
                      className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleBook}
                      disabled={bookingLoading || !localModal.reasonForVisit}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {bookingLoading ? (
                        <>
                          <Icon name="spinner" className="h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : requiresPayment ? (
                        <>Proceed to Payment</>
                      ) : (
                        <>Confirm Booking</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ScrollableContainer>
        </SurfaceCard>
      </div>
    </div>
  );
};

// ================= MAIN PAGE CONTENT (Client Component) =================

function BookingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const medicalCenterId = searchParams.get('medicalCenterId');
  const dispatch = useDispatch<AppDispatch>();

  const bookingState = useSelector((state: RootState) => state.booking) as BookingStateShape;

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
    bookingStatus,
    appointments,
  } = bookingState;

  const [showAppointments, setShowAppointments] = useState(false);

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

  const handlePaymentCallback = useCallback(async () => {
    toast.info('Confirming payment...', { autoClose: false });
    await dispatch(bookingActions.pollForConfirmationThunk());
    await dispatch(bookingActions.fetchPatientAppointmentsThunk());
    toast.dismiss();
  }, [dispatch]);

  useEffect(() => {
    const paymentRef = searchParams.get('reference') || searchParams.get('trxref');
    if (paymentRef && patientInfo) {
      handlePaymentCallback();
    }
  }, [searchParams, patientInfo, handlePaymentCallback]);

  const pendingPaidAppointment = appointments.find(
    (appt) =>
      appt.payment_required === true &&
      (appt.status === 'pending' || appt.payment_status === 'pending')
  );

  const expiryTime = pendingPaidAppointment
    ? new Date(pendingPaidAppointment.created_at).getTime() + 15 * 60 * 1000
    : null;

  const getScheduleDays = useCallback((): DailySchedule[] => {
    if (!schedule?.dailySchedules) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const filteredDays = schedule.dailySchedules.filter((day) => {
      const dayDate = new Date(day.date);
      return dayDate >= today;
    });

    const ranges: Record<DateRangeOption, () => DailySchedule[]> = {
      today: () =>
        filteredDays.filter((day) => {
          const dayDate = new Date(day.date);
          return dayDate.toDateString() === today.toDateString();
        }),
      tomorrow: () => {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return filteredDays.filter((day) => {
          const dayDate = new Date(day.date);
          return dayDate.toDateString() === tomorrow.toDateString();
        });
      },
      week: () => {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return filteredDays.filter((day) => {
          const dayDate = new Date(day.date);
          return dayDate <= weekEnd;
        });
      },
      all: () => filteredDays,
    };

    return ranges[selectedDateRange]();
  }, [schedule, selectedDateRange]);

  const createMinimalMedicalCenter = useCallback(
    (centerId: string, scheduleData: ScheduleData): MedicalCenter => ({
      _id: centerId,
      medical_center_id: centerId,
      facility_name: scheduleData.medical_center_id || 'Medical Center',
      facility_type: '',
      company_reg_number: '',
      healthcare_reg_number: '',
      official_domain_email: '',
      phone: '',
      address: {
        line1: '',
        city: '',
        province: '',
        postal: '',
      },
      practitioners: [],
      settings: null,
      statistics: {
        total_patients: 0,
        total_appointments: 0,
        monthly_appointments: 0,
        average_rating: 0,
        response_time: 0,
      },
      billing: null,
      theme_colors: { primary: '', secondary: '' },
      verification_status: '',
      is_verified: false,
      is_active: true,
      parent_center_id: null,
      branches: [],
      created_at: '',
      updated_at: '',
      __v: 0,
      paymentSettings: { bookingDeposit: 0 },
    }),
    []
  );

  const handleSlotClick = (date: string, slot: TimeSlot) => {
    if (!patientInfo) {
      toast.error('Please log in to book appointments');
      router.push('/createprofile');
      return;
    }

    if (!schedule || !medicalCenterId) {
      toast.error('Schedule not available');
      return;
    }

    const slotStatus = utils.getSlotStatus(slot);
    if (slotStatus.status !== 'available') {
      toast.error('No available doctors for this slot');
      return;
    }

    const minimalMedicalCenter = createMinimalMedicalCenter(medicalCenterId, schedule);

    dispatch(
      bookingActions.handleSlotClickThunk({
        date,
        slot,
        medicalCenter: minimalMedicalCenter,
        schedule,
      })
    );
  };

  const handleBookAppointment = async (bookingData: BookingModalData): Promise<void> => {
    dispatch(
      bookingActions.handleBookAppointmentThunk({
        ...bookingData,
        schedule: bookingData.schedule ?? schedule,
        symptoms: bookingData.symptoms || bookingData.reasonForVisit,
      })
    );
  };

  const dateRangeButtons: Array<{ id: DateRangeOption; label: string; icon: string }> = [
    { id: 'today', label: 'Today', icon: '📅' },
    { id: 'tomorrow', label: 'Tomorrow', icon: '⏭️' },
    { id: 'week', label: 'This Week', icon: '📆' },
    { id: 'all', label: 'All Dates', icon: '🗓️' },
  ];

  const specializations = [
    'General Practice',
    'Cardiology',
    'Dermatology',
    'Orthopedics',
    'Pediatrics',
    'Neurology',
    'Ophthalmology',
    'Psychiatry',
    'Dentistry',
    'Emergency Medicine',
  ];

  const scheduleDays = getScheduleDays();

  return (
    <SoftBackground>
      <ToastContainer position="top-right" autoClose={5000} transition={Slide} />

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => router.push('/entry')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <Icon name="arrowLeft" className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Book Appointment
                </h1>
                <p className="truncate text-sm text-slate-500">
                  Schedule your medical appointment
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {bookingStatus !== 'idle' && <PaymentStatusIndicator status={bookingStatus} />}

              {patientInfo && appointments.length > 0 && (
                <button
                  onClick={() => setShowAppointments(!showAppointments)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <Icon name="calendar" className="h-4 w-4" />
                  Appointments ({appointments.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="space-y-6">
          {expiryTime && expiryTime > Date.now() && (
            <StatusBanner tone="warning">
              Complete payment to confirm your appointment. Expires in{' '}
              {Math.ceil((expiryTime - Date.now()) / 60000)} minutes.
            </StatusBanner>
          )}

          {successMessage && <StatusBanner tone="success">{successMessage}</StatusBanner>}

          {bookingError && <StatusBanner tone="error">{bookingError}</StatusBanner>}

          {scheduleLoading && (
            <SurfaceCard className="p-10 sm:p-14">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                <p className="text-sm font-medium text-slate-600">Loading schedule...</p>
              </div>
            </SurfaceCard>
          )}

          {error && !scheduleLoading && (
            <SurfaceCard className="p-8">
              <div className="text-center text-sm font-medium text-rose-700">{error}</div>
            </SurfaceCard>
          )}

          {!scheduleLoading && !error && schedule && patientInfo && (
            <>
              <SurfaceCard className="p-5 sm:p-6 lg:p-7">
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Date Range
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      {dateRangeButtons.map((range) => (
                        <button
                          key={range.id}
                          onClick={() => dispatch(bookingActions.setSelectedDateRange(range.id))}
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                            selectedDateRange === range.id
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>{range.icon}</span>
                          <span>{range.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SurfaceCard>

              {showAppointments && appointments.length > 0 && (
                <SurfaceCard className="p-5 sm:p-6 lg:p-7">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Your Appointments</h2>
                      <p className="text-sm text-slate-500">This section keeps the same data and behavior.</p>
                    </div>
                  </div>

                  <ScrollableContainer className="max-h-[360px]">
                    <div className="space-y-3">
                      {appointments.map((appointment) => (
                        <div
                          key={appointment._id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">
                                {appointment.appointment_id}
                              </div>
                              <div className="mt-1 text-sm text-slate-600">
                                {utils.formatDate(appointment.date)}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                                {appointment.status}
                              </span>
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                {appointment.payment_status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollableContainer>
                </SurfaceCard>
              )}

              <SurfaceCard className="p-4 sm:p-6 lg:p-7">
                <ScrollableContainer className="max-h-[72vh]">
                  <div className="space-y-6 pr-1">
                    {scheduleDays.length > 0 ? (
                      scheduleDays.map((day) => (
                        <div
                          key={day.date}
                          className={`overflow-hidden rounded-3xl border ${
                            day.isWorking
                              ? 'border-slate-200 bg-white'
                              : 'border-rose-200 bg-rose-50'
                          }`}
                        >
                          <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
                                  {day.dayName}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                  {utils.formatDate(day.date)}
                                </p>
                              </div>

                              <span
                                className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide ${
                                  day.isWorking
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    day.isWorking ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                />
                                {day.isWorking ? 'Open' : 'Closed'}
                              </span>
                            </div>
                          </div>

                          {day.isWorking && (
                            <div className="p-4 sm:p-6">
                              {day.timeSlots?.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                  {day.timeSlots.slice(0, 14).map((slot) => (
                                    <TimeSlotButton
                                      key={slot.id}
                                      slot={slot}
                                      day={day}
                                      onClick={() => handleSlotClick(day.date, slot)}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                  <p className="text-sm font-medium text-slate-500">
                                    No time slots available for this day.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
                        <p className="mx-auto max-w-md text-sm font-medium text-slate-500">
                          This medical center hasn&apos;t set up their schedule for the selected period.
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollableContainer>
              </SurfaceCard>
            </>
          )}
        </div>
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
          onSelectDoctor={(doctor) => dispatch(bookingActions.handleSelectDoctorThunk(doctor))}
          onBookAppointment={handleBookAppointment}
          onBackToDoctorSelection={() => dispatch(bookingActions.handleBackToDoctorSelectionThunk())}
        />
      )}
    </SoftBackground>
  );
}

// ================= FALLBACK COMPONENT =================

function BookingPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading booking...</p>
      </div>
    </div>
  );
}

// ================= EXPORTED PAGE WITH SUSPENSE =================

export default function BookingPage() {
  return (
    <Suspense fallback={<BookingPageFallback />}>
      <BookingPageClient />
    </Suspense>
  );
}