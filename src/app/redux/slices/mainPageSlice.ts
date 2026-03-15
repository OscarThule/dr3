import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

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

  notes: string;
  createdAt: Date | string;
  updatedAt: Date | string;

  isShiftedSlot?: boolean;
  shiftNotes?: string;
  originalAppointmentTime?: {
    slotStart: string;
    slotEnd: string;
  };

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

interface AvailableSlot {
  time: string;
  available: number;
  isPeakHour: boolean;
  specializations: string[];
}

interface Doctor {
  _id: string;
  name: string;
  specialization: string[];
  email: string;
  phone: string;
  isActive: boolean;
  colorCode?: string;
}

interface Session {
  enabled: boolean;
  start: string;
  end: string;
}

interface LunchBreak {
  id: string;
  start: string;
  end: string;
  reason: string;
  enabled: boolean;
}

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  type: 'working' | 'lunch' | 'night-shift' | 'night-lunch';
  capacity: number;
  availableCapacity: number;
  isPeakHour: boolean;
  assignedDoctors: Array<{
    doctorId: string;
    doctorName: string;
    specialization: string[];
    maxPatients: number;
    currentPatients: number;
  }>;
  specializations: string[];
  shiftedFrom?: string;
  originalTiming?: {
    start: string;
    end: string;
  };
}

interface DailySchedule {
  date: string;
  dayName: string;
  isWorking: boolean;
  timeSlots: TimeSlot[];
  totalCapacity: number;
  availableSpecializations: string[];
  sessions: {
    morning: Session;
    afternoon: Session;
    night: Session;
    lunches: LunchBreak[];
    nightLunches: LunchBreak[];
  };
}

interface WeeklySchedule {
  _id: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  dailySchedules: DailySchedule[];
  lateArrivals?: Array<{
    doctorId: string;
    doctorName: string;
    date: Date;
    duration: number;
    reason: string;
    timestamp: Date;
  }>;
}

interface MedicalCenterSettings {
  _id: string;
  facility_name: string;
  address: string;
  phone: string;
  email: string;
  doctors: Doctor[];
  currentWeekSchedule?: WeeklySchedule;
  settings: {
    appointment_duration: number;
    buffer_time: number;
    max_daily_appointments: number;
  };
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationInfo;
}

interface BackendAppointment {
  _id: string;
  appointment_id?: string;

  patient_id?:
    | string
    | {
        _id?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        dateOfBirth?: string;
        gender?: string;
        emergencyContact?: string;
      };

  medical_center_id?:
    | string
    | {
        _id?: string;
        facility_name?: string;
        phone?: string;
        address?: {
          line1?: string;
          city?: string;
          province?: string;
          postal?: string;
          lat?: number;
          lng?: number;
          _id?: string;
          line2?: string;
        };
      };

  practitioner_id?:
    | string
    | {
        _id?: string;
        full_name?: string;
        role?: string;
        specialties?: string[];
      }
    | null;

  schedule_id?: string;
  date: string;
  slot_id?: string;
  original_slot_id?: string;
  slot_start: string;
  slot_end: string;

  doctor_name?: string;
  doctor_role?: string;
  doctor_specialization?: string[];

  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;

  reason_for_visit?: string;
  symptoms?: string;
  preferred_specialization?: string;
  consultation_type?: ConsultationType;
  status: AppointmentStatus;
  notes?: string;

  cancellation_reason?: string;
  cancelled_by?: 'patient' | 'doctor' | 'medicalCenter' | 'system';
  cancelled_at?: string;

  is_shifted_slot?: boolean;
  shift_notes?: string;
  appointment_duration?: number;

  createdAt: string;
  updatedAt: string;

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

interface MainPageState {
  appointments: Booking[];
  selectedAppointment: Booking | null;
  showRescheduleModal: boolean;
  newDate: string;
  newTime: string;
  availableSlots: AvailableSlot[];
  searchTerm: string;
  medicalCenterSettings: MedicalCenterSettings | null;
  loading: boolean;
  stats: {
    today: number;
    tomorrow: number;
    week: number;
    month: number;
  };
  error: string | null;
  success: string | null;
  pagination: PaginationInfo;
  filters: {
    status: string;
    date: string;
    practitioner: string;
  };
  authToken: string | null;
  medicalCenterId: string | null;
}

// ============ INITIAL STATE ============

const initialToken =
  typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

const initialMedicalCenterId =
  typeof window !== 'undefined' ? localStorage.getItem('medicalCenterId') : null;

const initialState: MainPageState = {
  appointments: [],
  selectedAppointment: null,
  showRescheduleModal: false,
  newDate: '',
  newTime: '',
  availableSlots: [],
  searchTerm: '',
  medicalCenterSettings: null,
  loading: true,
  stats: {
    today: 0,
    tomorrow: 0,
    week: 0,
    month: 0,
  },
  error: null,
  success: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 100,
    pages: 1,
  },
  filters: {
    status: '',
    date: '',
    practitioner: '',
  },
  authToken: initialToken,
  medicalCenterId: initialMedicalCenterId,
};

// ============ HELPERS ============

const safeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const safeNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const calculateAge = (dateOfBirth?: string): number => {
  if (!dateOfBirth) return 0;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

const inferUrgency = (reason?: string, symptoms?: string): Urgency => {
  const text = `${reason || ''} ${symptoms || ''}`.toLowerCase();

  if (
    text.includes('emergency') ||
    text.includes('severe') ||
    text.includes('critical')
  ) {
    return 'emergency';
  }

  if (
    text.includes('urgent') ||
    text.includes('pain') ||
    text.includes('bleeding')
  ) {
    return 'urgent';
  }

  return 'routine';
};

const mapBackendToBooking = (item: BackendAppointment): Booking => {
  const patient =
    item.patient_id && typeof item.patient_id === 'object' ? item.patient_id : null;

  const practitioner =
    item.practitioner_id && typeof item.practitioner_id === 'object'
      ? item.practitioner_id
      : null;

  const appointmentDate = new Date(item.date);
  const dateStr = Number.isNaN(appointmentDate.getTime())
    ? ''
    : appointmentDate.toISOString().split('T')[0];

  const consultationType: ConsultationType =
    item.consultation_type || 'face-to-face';

  const doctorName =
    safeString(item.doctor_name) ||
    safeString(practitioner?.full_name) ||
    'Unknown Doctor';

  const doctorSpecialization =
    Array.isArray(item.doctor_specialization) && item.doctor_specialization.length > 0
      ? item.doctor_specialization
      : Array.isArray(practitioner?.specialties) && practitioner?.specialties.length
      ? practitioner.specialties
      : ['general'];

  return {
    _id: item._id,
    appointment_id: item.appointment_id || item._id,

    patientId:
      safeString(patient?._id) ||
      safeString(item.patient_id) ||
      '',
    patient_id:
      safeString(patient?._id) ||
      safeString(item.patient_id) ||
      '',
    patientFileId:
      safeString(patient?._id) ||
      safeString(item.patient_id) ||
      item._id,

    patientName:
      safeString(item.patient_name) ||
      `${safeString(patient?.firstName)} ${safeString(patient?.lastName)}`.trim() ||
      'Unknown Patient',

    patientEmail: safeString(item.patient_email) || safeString(patient?.email),
    patientPhone: safeString(item.patient_phone) || safeString(patient?.phone),
    patientAge: calculateAge(patient?.dateOfBirth),
    patientGender: safeString(patient?.gender, 'Not specified'),
    emergencyContact: safeString(patient?.emergencyContact, 'Not provided'),

    medicalCondition: safeString(item.reason_for_visit, 'Not specified'),
    symptoms: safeString(item.symptoms),
    preferredDate: dateStr,
    preferredTime: safeString(item.slot_start),
    assignedDate: dateStr,
    assignedTime: safeString(item.slot_start),

    status: item.status || 'pending',
    urgency: inferUrgency(item.reason_for_visit, item.symptoms),
    patientSector: 'private',
    consultationType,
    autoApproved: false,

    assignedDoctor:
      safeString(practitioner?._id) ||
      safeString(item.practitioner_id) ||
      '',
    doctorName,
    doctorSpecialization,

    appointmentDate: item.date,
    slotStart: safeString(item.slot_start),
    slotEnd: safeString(item.slot_end),

    notes: safeString(item.notes),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,

    isShiftedSlot: Boolean(item.is_shifted_slot),
    shiftNotes: safeString(item.shift_notes),
    originalAppointmentTime: item.original_slot_id
      ? {
          slotStart: safeString(item.slot_start),
          slotEnd: safeString(item.slot_end),
        }
      : undefined,

    consultation_fee: safeNumber(item.consultation_fee),
    deposit_amount: safeNumber(item.deposit_amount),
    platform_fee: safeNumber(item.platform_fee),
    total_amount: safeNumber(item.total_amount),
    payment_amount_paid: safeNumber(item.payment_amount_paid),
    currency: safeString(item.currency, 'ZAR'),
    is_paid: Boolean(item.is_paid),
    payment_required:
      typeof item.payment_required === 'boolean' ? item.payment_required : true,
    payment_status: item.payment_status || 'none',
    payment_reference: item.payment_reference ?? null,
  };
};

const getEffectiveDate = (apt: Booking) => apt.assignedDate || apt.preferredDate;

const calculateStats = (appointments: Booking[]): MainPageState['stats'] => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(today.getDate() - today.getDay());

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    today: appointments.filter((apt) => getEffectiveDate(apt) === todayStr).length,
    tomorrow: appointments.filter((apt) => getEffectiveDate(apt) === tomorrowStr).length,
    week: appointments.filter((apt) => {
      const d = new Date(getEffectiveDate(apt));
      return !Number.isNaN(d.getTime()) && d >= weekStart && d <= weekEnd;
    }).length,
    month: appointments.filter((apt) => {
      const d = new Date(getEffectiveDate(apt));
      return !Number.isNaN(d.getTime()) && d >= monthStart && d <= monthEnd;
    }).length,
  };
};

// ============ API SERVICE ============

class ApiService {
  private baseURL: string =
    process.env.NEXT_PUBLIC_API_URL || 'https://dmrs.onrender.com';

  private async fetchWithAuth(
    endpoint: string,
    options: RequestInit = {},
    token?: string | null
  ) {
    const authToken =
      token || (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);

    if (!authToken) {
      throw new Error('No authentication token found');
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      ...(options.headers || {}),
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('medicalCenterId');
        }
        throw new Error('Session expired. Please login again.');
      }

      let message = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const err = await response.json();
        message = err?.message || message;
      } catch {
        // ignore json parse failure
      }

      throw new Error(message);
    }

    return response.json();
  }

  async getMedicalCenterAppointments(
    page = 1,
    limit = 100,
    filters?: Record<string, string>,
    token?: string | null,
    medicalCenterId?: string | null
  ) {
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(filters || {}),
    });

    if (medicalCenterId) {
      queryParams.set('medical_center_id', medicalCenterId);
    }

    return this.fetchWithAuth(`/api/bookings/all?${queryParams.toString()}`, {}, token);
  }

  async getPatientAppointments(
    filters?: Record<string, string>,
    token?: string | null
  ) {
    const queryParams = new URLSearchParams({
      limit: '100',
      ...(filters || {}),
    });

    return this.fetchWithAuth(`/api/bookings/patient?${queryParams.toString()}`, {}, token);
  }

  async cancelAppointment(
    bookingId: string,
    reason?: string,
    token?: string | null
  ) {
    return this.fetchWithAuth(
      `/api/bookings/${bookingId}/cancel`,
      {
        method: 'PUT',
        body: JSON.stringify({ reason }),
      },
      token
    );
  }

  async updateAppointment(
    bookingId: string,
    updates: Record<string, unknown>,
    token?: string | null
  ) {
    return this.fetchWithAuth(
      `/api/bookings/appointment/${bookingId}/update`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      },
      token
    );
  }

  async getMedicalCenterSettings(token?: string | null) {
    return this.fetchWithAuth('/api/medical-centers/me', {}, token);
  }
}

const apiService = new ApiService();

// ============ THUNKS ============

export const fetchAppointments = createAsyncThunk<
  { bookings: Booking[]; pagination: PaginationInfo },
  { page?: number; status?: string; date?: string; practitioner?: string } | void,
  { state: { mainPage: MainPageState }; rejectValue: string }
>(
  'mainPage/fetchAppointments',
  async (filters = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().mainPage;
      const { page = 1, status, date, practitioner } = (filters || {}) as {
        page?: number;
        status?: string;
        date?: string;
        practitioner?: string;
      };

      const queryFilters: Record<string, string> = {};
      if (status && status !== 'all') queryFilters.status = status;
      if (date) queryFilters.date = date;
      if (practitioner) queryFilters.practitioner = practitioner;

      let response: ApiResponse<BackendAppointment[] | { data: BackendAppointment[] }>;

      try {
        response = await apiService.getMedicalCenterAppointments(
          page,
          100,
          queryFilters,
          state.authToken,
          state.medicalCenterId
        );
      } catch {
        response = await apiService.getPatientAppointments(queryFilters, state.authToken);
      }

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to fetch appointments');
      }

      const rawData = Array.isArray(response.data)
        ? response.data
        : Array.isArray((response.data as any)?.data)
        ? (response.data as any).data
        : [];

      const bookings = rawData.map(mapBackendToBooking);

      return {
        bookings,
        pagination: response.pagination || {
          total: bookings.length,
          page: 1,
          limit: 100,
          pages: 1,
        },
      };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch appointments');
    }
  }
);

export const loadMedicalCenterSettings = createAsyncThunk<
  MedicalCenterSettings | null,
  void,
  { state: { mainPage: MainPageState }; rejectValue: string }
>(
  'mainPage/loadMedicalCenterSettings',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState().mainPage;
      const response = await apiService.getMedicalCenterSettings(state.authToken);

      if (!response?.success) {
        return null;
      }

      const data = response.data || response;

      const practitioners = Array.isArray(data?.practitioners) ? data.practitioners : [];

      const mappedDoctors: Doctor[] = practitioners.map((doc: any) => ({
        _id: doc._id || doc.practitioner_id || '',
        name: doc.full_name || 'Unknown Doctor',
        specialization: Array.isArray(doc.specialties) ? doc.specialties : ['general'],
        email: doc.contact_email || '',
        phone: doc.contact_phone || '',
        isActive: doc.is_active ?? true,
        colorCode: doc.colorCode,
      }));

      return {
        _id: data._id,
        facility_name: data.facility_name || '',
        address:
          typeof data.address === 'string'
            ? data.address
            : [
                data.address?.line1,
                data.address?.line2,
                data.address?.city,
                data.address?.province,
                data.address?.postal,
              ]
                .filter(Boolean)
                .join(', '),
        phone: data.phone || '',
        email: data.official_domain_email || '',
        doctors: mappedDoctors,
        settings: {
          appointment_duration: data.settings?.slotDuration || 30,
          buffer_time: data.settings?.bufferTime || 0,
          max_daily_appointments: data.settings?.maxDailyAppointments || 100,
        },
      };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to load medical center settings');
    }
  }
);

export const cancelAppointment = createAsyncThunk<
  { bookingId: string; appointment: Booking },
  { bookingId: string; reason?: string },
  { state: { mainPage: MainPageState }; rejectValue: string }
>(
  'mainPage/cancelAppointment',
  async ({ bookingId, reason }, { getState, rejectWithValue }) => {
    try {
      const state = getState().mainPage;
      const response = await apiService.cancelAppointment(bookingId, reason, state.authToken);

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to cancel appointment');
      }

      return {
        bookingId,
        appointment: mapBackendToBooking(response.data),
      };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to cancel appointment');
    }
  }
);

export const updateAppointmentStatus = createAsyncThunk<
  { bookingId: string; updates: Booking },
  { bookingId: string; updates: Partial<Booking> },
  { state: { mainPage: MainPageState }; rejectValue: string }
>(
  'mainPage/updateAppointmentStatus',
  async ({ bookingId, updates }, { getState, rejectWithValue }) => {
    try {
      const state = getState().mainPage;
      const response = await apiService.updateAppointment(
        bookingId,
        updates,
        state.authToken
      );

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to update appointment');
      }

      return {
        bookingId,
        updates: mapBackendToBooking(response.data),
      };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to update appointment');
    }
  }
);

export const handleReschedule = createAsyncThunk<
  { bookingId: string; appointment: Booking; newDate: string; newTime: string },
  void,
  { state: { mainPage: MainPageState }; rejectValue: string }
>(
  'mainPage/handleReschedule',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState().mainPage;
      const { selectedAppointment, newDate, newTime } = state;

      if (!selectedAppointment || !newDate || !newTime) {
        throw new Error('Please select a date and time for rescheduling');
      }

      const response = await apiService.updateAppointment(
        selectedAppointment._id,
        {
          date: newDate,
          slot_start: newTime,
          status: 'rescheduled',
          notes: `Rescheduled to ${newDate} at ${newTime}`,
        },
        state.authToken
      );

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to reschedule appointment');
      }

      return {
        bookingId: selectedAppointment._id,
        appointment: mapBackendToBooking(response.data),
        newDate,
        newTime,
      };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to reschedule appointment');
    }
  }
);

// ============ SLICE ============

const mainPageSlice = createSlice({
  name: 'mainPage',
  initialState,
  reducers: {
    setAppointments: (state, action: PayloadAction<Booking[]>) => {
      state.appointments = action.payload;
      state.stats = calculateStats(action.payload);
    },

    setSelectedAppointment: (state, action: PayloadAction<Booking | null>) => {
      state.selectedAppointment = action.payload;
    },

    setAvailableSlots: (state, action: PayloadAction<AvailableSlot[]>) => {
      state.availableSlots = action.payload;
    },

    setMedicalCenterSettings: (state, action: PayloadAction<MedicalCenterSettings | null>) => {
      state.medicalCenterSettings = action.payload;
    },

    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setStats: (
      state,
      action: PayloadAction<{ today: number; tomorrow: number; week: number; month: number }>
    ) => {
      state.stats = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    setSuccess: (state, action: PayloadAction<string | null>) => {
      state.success = action.payload;
    },

    setNewDate: (state, action: PayloadAction<string>) => {
      state.newDate = action.payload;
    },

    setNewTime: (state, action: PayloadAction<string>) => {
      state.newTime = action.payload;
    },

    setShowRescheduleModal: (state, action: PayloadAction<boolean>) => {
      state.showRescheduleModal = action.payload;
    },

    clearNotifications: (state) => {
      state.error = null;
      state.success = null;
    },

    updateAppointmentInList: (
      state,
      action: PayloadAction<{ bookingId: string; updates: Partial<Booking> }>
    ) => {
      const { bookingId, updates } = action.payload;
      const index = state.appointments.findIndex((apt) => apt._id === bookingId);

      if (index !== -1) {
        state.appointments[index] = {
          ...state.appointments[index],
          ...updates,
        };
        state.stats = calculateStats(state.appointments);
      }
    },

    setFilter: (
      state,
      action: PayloadAction<{ key: keyof MainPageState['filters']; value: string }>
    ) => {
      const { key, value } = action.payload;
      state.filters[key] = value;
    },

    clearFilters: (state) => {
      state.filters = {
        status: '',
        date: '',
        practitioner: '',
      };
    },

    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },

    setAuth: (
      state,
      action: PayloadAction<{ token: string; medicalCenterId: string }>
    ) => {
      state.authToken = action.payload.token;
      state.medicalCenterId = action.payload.medicalCenterId;

      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', action.payload.token);
        localStorage.setItem('medicalCenterId', action.payload.medicalCenterId);
      }
    },

    clearAuth: (state) => {
      state.authToken = null;
      state.medicalCenterId = null;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('medicalCenterId');
      }
    },

    syncAuthFromStorage: (state) => {
      if (typeof window !== 'undefined') {
        state.authToken = localStorage.getItem('authToken');
        state.medicalCenterId = localStorage.getItem('medicalCenterId');
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.appointments = action.payload.bookings;
        state.pagination = action.payload.pagination;
        state.stats = calculateStats(action.payload.bookings);
        state.error = null;
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch appointments';
      })

      .addCase(loadMedicalCenterSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadMedicalCenterSettings.fulfilled, (state, action) => {
        state.medicalCenterSettings = action.payload;
        state.loading = false;
      })
      .addCase(loadMedicalCenterSettings.rejected, (state) => {
        state.loading = false;
      })

      .addCase(cancelAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(cancelAppointment.fulfilled, (state, action) => {
        const { bookingId, appointment } = action.payload;
        const index = state.appointments.findIndex((apt) => apt._id === bookingId);

        if (index !== -1) {
          state.appointments[index] = appointment;
        }

        state.loading = false;
        state.success = 'Appointment cancelled successfully';
        state.stats = calculateStats(state.appointments);
      })
      .addCase(cancelAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to cancel appointment';
      })

      .addCase(updateAppointmentStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAppointmentStatus.fulfilled, (state, action) => {
        const { bookingId, updates } = action.payload;
        const index = state.appointments.findIndex((apt) => apt._id === bookingId);

        if (index !== -1) {
          state.appointments[index] = updates;
        }

        state.loading = false;
        state.success = 'Appointment updated successfully';
        state.stats = calculateStats(state.appointments);
      })
      .addCase(updateAppointmentStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to update appointment';
      })

      .addCase(handleReschedule.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(handleReschedule.fulfilled, (state, action) => {
        const { bookingId, appointment } = action.payload;
        const index = state.appointments.findIndex((apt) => apt._id === bookingId);

        if (index !== -1) {
          state.appointments[index] = appointment;
        }

        state.loading = false;
        state.showRescheduleModal = false;
        state.selectedAppointment = null;
        state.newDate = '';
        state.newTime = '';
        state.success = 'Appointment rescheduled successfully';
        state.stats = calculateStats(state.appointments);
      })
      .addCase(handleReschedule.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to reschedule appointment';
      });
  },
});

export const {
  setAppointments,
  setSelectedAppointment,
  setAvailableSlots,
  setMedicalCenterSettings,
  setSearchTerm,
  setLoading,
  setStats,
  setError,
  setSuccess,
  setNewDate,
  setNewTime,
  setShowRescheduleModal,
  clearNotifications,
  updateAppointmentInList,
  setFilter,
  clearFilters,
  setPage,
  setAuth,
  clearAuth,
  syncAuthFromStorage,
} = mainPageSlice.actions;

export default mainPageSlice.reducer;