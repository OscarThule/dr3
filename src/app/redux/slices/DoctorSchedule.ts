// doctorSchedule.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";

/* ======================================================================== */
/* TYPES                                                                    */
/* ======================================================================== */

// Auth state types
interface AuthUser {
  _id: string;
  name?: string;
  email?: string;
  medical_center_ids?: string[];
  [key: string]: any;
}

interface AuthState {
  token: string | null;
  session: AuthUser | null;
  loading: boolean;
  user?: AuthUser; // Add user property if it exists
}

// Root state type
interface RootState {
  auth: AuthState;
  doctorSchedule: DoctorScheduleState;
  // ... other slices
}

export interface DoctorSlotAssignment {
  doctorId: string;
  doctorName: string;
  maxPatients: number;
  currentPatients: number;
  consultationType: string;
  specialization: string[];
  isAvailable: boolean;
  isShifted?: boolean;
  shiftReason?: string;
  colorCode?: string;
}

export interface DoctorSlot {
  id: string;
  start: string;
  end: string;
  type: string;
  slotType: string;
  capacity: number;
  availableCapacity: number;
  assignedDoctors: DoctorSlotAssignment[];
  consultationType: string;
  specialization: string;
  isPeakHour: boolean;
  duration: number;
  maxPatients?: number;
  currentPatients?: number;
  doctorId?: string;
  doctorName?: string;
  isShifted?: boolean;
  shiftedFrom?: string;
  originalTiming?: {
    start: string;
    end: string;
  };
  appointments?: DoctorAppointment[];
}

export interface PatientInfo {
  _id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}

export interface MedicalCenterInfo {
  _id: string;
  facility_name: string;
  [key: string]: any;
}

export interface PractitionerInfo {
  _id: string;
  full_name?: string;
  name?: string;
  specialization?: string[];
  [key: string]: any;
}

export interface DoctorAppointment {
  _id: string;
  appointment_id?: string;
  schedule_id: string;
  practitioner_id: string | PractitionerInfo;
  date: string;
  slot_id: string;
  original_slot_id?: string;
  slot_start: string;
  slot_end: string;
  status: string;
  is_shifted_slot?: boolean;
  shift_notes?: string;
  original_appointment_time?: {
    slot_start: string;
    slot_end: string;
  };
  patient_id: string | PatientInfo;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  medical_center_id?: string | MedicalCenterInfo;
  doctor_name?: string;
  doctor_specialization?: string[];
  consultation_type?: string;
  appointment_duration?: number;
  reason_for_visit?: string;
  symptoms?: string;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DoctorDaySchedule {
  date: string;
  dayName: string;
  dayOfWeek: number;
  isWorking: boolean;
  timeSlots: DoctorSlot[];
  totalAssignedSlots: number;
  totalCapacity: number;
  bookedSlots: number;
}

export interface DoctorPersonalSchedule {
  dailySchedules: DoctorDaySchedule[];
  doctorInfo: {
    id: string;
    name: string;
    specialization: string;
  };
  windowInfo: {
    start: string;
    end: string;
    today: string;
    totalDays?: number;
  };
}

export interface DoctorScheduleState {
  data: DoctorPersonalSchedule | null;
  appointments: DoctorAppointment[];
  loadingSchedule: boolean;
  loadingAppointments: boolean;
  shiftingSlots: boolean;
  error: string | null;
  lateArrivals: any[];
}

export interface ShiftSlotsPayload {
  medical_center_id: string;
  schedule_id: string;
  date: string;
  delay_minutes: number;
  reason?: string;
  start_from_slot_id?: string;
  practitioner_id?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  [key: string]: any;
}

/* ======================================================================== */
/* INITIAL STATE                                                            */
/* ======================================================================== */

const initialState: DoctorScheduleState = {
  data: null,
  appointments: [],
  loadingSchedule: false,
  loadingAppointments: false,
  shiftingSlots: false,
  error: null,
  lateArrivals: []
};

/* ======================================================================== */
/* HELPER FUNCTIONS                                                         */
/* ======================================================================== */

const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response) {
      return axiosError.response.data?.message || 
             `Server error: ${axiosError.response.status}`;
    } else if (axiosError.request) {
      return "Network error: No response from server";
    }
  }
  return error instanceof Error ? error.message : "An unknown error occurred";
};

const transformAppointment = (appt: any): DoctorAppointment => {
  const patientId = appt.patient_id;
  const isPatientObject = patientId && typeof patientId === 'object';
  
  return {
    ...appt,
    patient_name: appt.patient_name || 
                 (isPatientObject ? 
                   `${patientId.firstName || ''} ${patientId.lastName || ''}`.trim() : 
                   'Unknown Patient'),
    patient_email: appt.patient_email || (isPatientObject ? patientId.email : ''),
    patient_phone: appt.patient_phone || (isPatientObject ? patientId.phone : ''),
    appointment_id: appt.appointment_id || appt._id,
    reason: appt.reason_for_visit || appt.reason,
  };
};

/* ======================================================================== */
/* THUNKS                                                                   */
/* ======================================================================== */

// Fetch doctor's personal schedule
export const fetchDoctorSchedule = createAsyncThunk<
  ApiResponse<DoctorPersonalSchedule>,
  void,
  { state: RootState }
>(
  'doctorSchedule/fetchDoctorSchedule',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { token } = state.auth;
      
      if (!token) {
        return rejectWithValue("No authentication token found");
      }

      const response = await axios.get<ApiResponse<DoctorPersonalSchedule>>(
        'https://dmrs.onrender.com/api/editing-schedules/doctor-personal-schedule', 
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );
      
      if (!response.data.success) {
        return rejectWithValue(response.data.message || "Failed to fetch schedule");
      }
      
      return response.data;
    } catch (err: unknown) {
      const errorMessage = handleApiError(err);
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchDoctorAppointments = createAsyncThunk<
  DoctorAppointment[],
  void,
  { state: RootState }
>(
  'doctorSchedule/fetchDoctorAppointments',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { token } = state.auth;

      if (!token) {
        return rejectWithValue("No authentication token found");
      }

      const response = await axios.get<ApiResponse<DoctorAppointment[]>>(
        'https://dmrs.onrender.com/api/bookings/patient',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );

      if (!response.data.success) {
        return rejectWithValue(response.data.message || "Failed to fetch appointments");
      }

      // Transform the data
      const appointments = Array.isArray(response.data.data) 
        ? response.data.data.map(transformAppointment)
        : [];

      return appointments;
    } catch (err: unknown) {
      const errorMessage = handleApiError(err);
      return rejectWithValue(errorMessage);
    }
  }
);

// Shift doctor's slots due to delay
export const shiftDoctorSlots = createAsyncThunk<
  any, // Response type not clearly defined in original
  ShiftSlotsPayload,
  { state: RootState }
>(
  'doctorSchedule/shiftDoctorSlots',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { token, session } = state.auth;

      if (!token) {
        return rejectWithValue("No authentication token found");
      }

      // Add practitioner_id from session if not provided
      const fullPayload = {
        ...payload,
        practitioner_id: payload.practitioner_id || session?._id
      };

      if (!fullPayload.practitioner_id) {
        return rejectWithValue("Practitioner ID is required");
      }

      const response = await axios.post<ApiResponse<any>>(
        'https://dmrs.onrender.com/api/bookings/shift-slots',
        fullPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );

      if (!response.data.success) {
        return rejectWithValue(response.data.message || "Failed to shift slots");
      }

      return response.data.data;
    } catch (err: unknown) {
      const errorMessage = handleApiError(err);
      return rejectWithValue(errorMessage);
    }
  }
);

// Get late arrivals history
export const fetchLateArrivals = createAsyncThunk<
  any[],
  { medical_center_id: string; schedule_id: string; date?: string },
  { state: RootState }
>(
  'doctorSchedule/fetchLateArrivals',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { token } = state.auth;

      if (!token) {
        return rejectWithValue("No authentication token found");
      }

      const queryParams = new URLSearchParams({
        medical_center_id: payload.medical_center_id,
        schedule_id: payload.schedule_id,
        ...(payload.date && { date: payload.date })
      });

      const response = await axios.get<ApiResponse<any[]>>(
        `https://dmrs.onrender.com/api/bookings/late-arrivals?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );

      if (!response.data.success) {
        return rejectWithValue(response.data.message || "Failed to fetch late arrivals");
      }

      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (err: unknown) {
      const errorMessage = handleApiError(err);
      return rejectWithValue(errorMessage);
    }
  }
);

/* ======================================================================== */
/* HELPER FUNCTIONS FOR STATE UPDATES                                       */
/* ======================================================================== */

const mergeAppointmentsIntoSchedule = (
  schedule: DoctorPersonalSchedule | null,
  appointments: DoctorAppointment[]
): DoctorPersonalSchedule | null => {
  if (!schedule) return null;
  
  const appointmentsByDate: Record<string, DoctorAppointment[]> = {};

  appointments.forEach(appt => {
    const dateKey = appt.date.split('T')[0];
    if (!appointmentsByDate[dateKey]) {
      appointmentsByDate[dateKey] = [];
    }
    appointmentsByDate[dateKey].push(appt);
  });

  return {
    ...schedule,
    dailySchedules: schedule.dailySchedules.map(day => {
      const dayKey = new Date(day.date).toISOString().split('T')[0];
      const dayAppointments = appointmentsByDate[dayKey] || [];

      return {
        ...day,
        timeSlots: day.timeSlots.map(slot => {
          const slotAppointments = dayAppointments.filter(
            appt => String(appt.slot_id) === String(slot.id) || 
                   (appt.original_slot_id && String(appt.original_slot_id) === String(slot.id))
          ).map(appt => transformAppointment(appt));

          return {
            ...slot,
            appointments: slotAppointments,
          };
        }),
      };
    }),
  };
};

/* ======================================================================== */
/* SLICE                                                                    */
/* ======================================================================== */

const doctorScheduleSlice = createSlice({
  name: 'doctorSchedule',
  initialState,
  reducers: {
    clearDoctorSchedule: (state) => {
      state.data = null;
      state.error = null;
      state.loadingSchedule = false;
      state.appointments = [];
    },
    resetError: (state) => {
      state.error = null;
    },
    markSlotAsDelayed: (state, action: PayloadAction<{ date: string; slotId: string; delayMinutes: number }>) => {
      const { date, slotId } = action.payload;
      
      if (!state.data) return;
      
      const dayIndex = state.data.dailySchedules.findIndex(
        day => new Date(day.date).toISOString().split('T')[0] === date
      );
      
      if (dayIndex !== -1) {
        const slotIndex = state.data.dailySchedules[dayIndex].timeSlots.findIndex(
          slot => slot.id === slotId
        );
        
        if (slotIndex !== -1) {
          state.data.dailySchedules[dayIndex].timeSlots[slotIndex].isShifted = true;
        }
      }
    },
    updateAppointmentStatus: (state, action: PayloadAction<{ appointmentId: string; status: string }>) => {
      const { appointmentId, status } = action.payload;
      const appointment = state.appointments.find(appt => appt._id === appointmentId);
      if (appointment) {
        appointment.status = status;
      }
    },
    setDoctorScheduleData: (state, action: PayloadAction<DoctorPersonalSchedule | null>) => {
      state.data = action.payload;
    },
    setAppointments: (state, action: PayloadAction<DoctorAppointment[]>) => {
      state.appointments = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctorSchedule.pending, (state) => {
        state.loadingSchedule = true;
        state.error = null;
      })
      .addCase(fetchDoctorSchedule.fulfilled, (state, action) => {
        state.loadingSchedule = false;
        state.data = action.payload.data || null;

        if (state.data && state.appointments.length > 0) {
          state.data = mergeAppointmentsIntoSchedule(state.data, state.appointments);
        }
      })
      .addCase(fetchDoctorSchedule.rejected, (state, action) => {
        state.loadingSchedule = false;
        state.error = action.payload as string || "Failed to fetch schedule";
      })
      .addCase(fetchDoctorAppointments.pending, (state) => {
        state.loadingAppointments = true;
        state.error = null;
      })
      .addCase(fetchDoctorAppointments.fulfilled, (state, action) => {
        state.loadingAppointments = false;
        state.appointments = action.payload;

        if (state.data) {
          state.data = mergeAppointmentsIntoSchedule(state.data, state.appointments);
        }
      })
      .addCase(fetchDoctorAppointments.rejected, (state, action) => {
        state.loadingAppointments = false;
        state.error = action.payload as string || "Failed to fetch appointments";
      })
      .addCase(shiftDoctorSlots.pending, (state) => {
        state.shiftingSlots = true;
        state.error = null;
      })
      .addCase(shiftDoctorSlots.fulfilled, (state) => {
        state.shiftingSlots = false;
      })
      .addCase(shiftDoctorSlots.rejected, (state, action) => {
        state.shiftingSlots = false;
        state.error = action.payload as string || "Failed to shift slots";
      })
      .addCase(fetchLateArrivals.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchLateArrivals.fulfilled, (state, action) => {
        state.lateArrivals = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchLateArrivals.rejected, (state, action) => {
        state.error = action.payload as string || "Failed to fetch late arrivals";
      });
  }
});

export const { 
  clearDoctorSchedule, 
  resetError, 
  markSlotAsDelayed, 
  updateAppointmentStatus,
  setDoctorScheduleData,
  setAppointments
} = doctorScheduleSlice.actions;

export default doctorScheduleSlice.reducer;