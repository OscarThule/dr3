import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';

// ---------- Types ----------
export interface WorkingHour {
  day: string;           // e.g., 'monday', 'tuesday'
  start: string;         // e.g., '09:00'
  end: string;           // e.g., '17:00'
  isWorkingDay: boolean;
  lunchStart?: string;
  lunchEnd?: string;
  // ... other fields as per your backend structure
}

export interface Practitioner {
  _id: string;
  practitioner_id: string;
  medical_center_ids: string[];
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  role: 'doctor' | 'nurse' | 'specialist' | 'surgeon' | 'therapist' | 'admin';
  specialization: string[];
  qualification: string;
  licenseNumber: string;
  experience: number;
  availableFor: ('face-to-face' | 'online')[];
  isActive: boolean;
  isTemporary: boolean;
  maxPatientsPerSlot: number;
  hourlyRate: number;
  defaultWorkingHours: WorkingHour[];  // ✅ replaced any[]
  currentStatus: 'available' | 'busy' | 'on_break' | 'off_duty' | 'absent';
  currentPatientLoad: number;
  absences: Absence[];
  lateArrivals: LateArrival[];
  notes?: string;
  temporaryPeriod?: {
    start: string;
    end: string;
  };
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface Absence {
  _id?: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: 'vacation' | 'sick_leave' | 'training' | 'personal' | 'other';
  status: 'pending' | 'approved' | 'rejected';
}

export interface LateArrival {
  date: string;
  duration: number;
  reason: string;
}

interface MedicalStaffState {
  practitioners: Practitioner[];
  loading: boolean;
  currentPractitionerView: Practitioner | null;
  showPractitionerSchedule: boolean;
  error: string | null;
  success: string | null;
}

// ---------- Helper ----------
const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

// ---------- Initial State ----------
const initialState: MedicalStaffState = {
  practitioners: [],
  loading: false,
  currentPractitionerView: null,
  showPractitionerSchedule: false,
  error: null,
  success: null,
};

// ---------- Axios Instance with Auth ----------
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://dmrs.onrender.com',
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------- Thunks ----------

// Define response shape for fetchPractitioners
interface PractitionersResponse {
  success: boolean;
  data: Practitioner[];
}

export const fetchPractitioners = createAsyncThunk<
  PractitionersResponse,
  void,
  { rejectValue: string }
>(
  'medicalStaff/fetchPractitioners',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/practitioners');
      return response.data as PractitionersResponse;
    } catch (error: unknown) {
      console.error('Fetch practitioners error:', error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updatePractitioner = createAsyncThunk<
  { data: Practitioner },
  { practitionerId: string; updates: Partial<Practitioner> },
  { rejectValue: string }
>(
  'medicalStaff/updatePractitioner',
  async ({ practitionerId, updates }, { rejectWithValue }) => {
    try {
      console.log('Updating practitioner:', practitionerId, updates);
      const response = await api.put(`/api/practitioners/${practitionerId}`, updates);
      return response.data as { data: Practitioner };
    } catch (error: unknown) {
      console.error('Update practitioner error:', error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deletePractitioner = createAsyncThunk<
  { data: { _id: string } },
  string,
  { rejectValue: string }
>(
  'medicalStaff/deletePractitioner',
  async (practitionerId, { rejectWithValue }) => {
    try {
      console.log('Deleting practitioner:', practitionerId);
      const response = await api.delete(`/api/practitioners/${practitionerId}`);
      return response.data as { data: { _id: string } };
    } catch (error: unknown) {
      console.error('Delete practitioner error:', error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const addAbsence = createAsyncThunk<
  { data: Practitioner },
  { practitionerId: string; absence: Omit<Absence, '_id'> },
  { rejectValue: string }
>(
  'medicalStaff/addAbsence',
  async ({ practitionerId, absence }, { rejectWithValue }) => {
    try {
      console.log('Adding absence:', practitionerId, absence);

      // Get current practitioner first
      const currentResponse = await api.get(`/api/practitioners/${practitionerId}`);
      const currentPractitioner = (currentResponse.data as { data: Practitioner }).data;

      // Update with new absence
      const updatedAbsences = [...(currentPractitioner.absences || []), absence];

      const updateResponse = await api.put(`/api/practitioners/${practitionerId}`, {
        absences: updatedAbsences,
      });

      return updateResponse.data as { data: Practitioner };
    } catch (error: unknown) {
      console.error('Add absence error:', error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ---------- Slice ----------
const medicalStaffSlice = createSlice({
  name: 'medicalStaff',
  initialState,
  reducers: {
    setCurrentPractitionerView: (state, action: PayloadAction<Practitioner | null>) => {
      state.currentPractitionerView = action.payload;
    },
    setShowPractitionerSchedule: (state, action: PayloadAction<boolean>) => {
      state.showPractitionerSchedule = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setSuccess: (state, action: PayloadAction<string | null>) => {
      state.success = action.payload;
    },
    clearNotifications: (state) => {
      state.error = null;
      state.success = null;
    },
    updatePractitionerStatus: (
      state,
      action: PayloadAction<{ practitionerId: string; status: Practitioner['currentStatus'] }>
    ) => {
      const practitioner = state.practitioners.find((p) => p._id === action.payload.practitionerId);
      if (practitioner) {
        practitioner.currentStatus = action.payload.status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Practitioners
      .addCase(fetchPractitioners.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPractitioners.fulfilled, (state, action) => {
        state.loading = false;
        state.practitioners = action.payload.data;
        state.success = 'Practitioners loaded successfully';
      })
      .addCase(fetchPractitioners.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update Practitioner
      .addCase(updatePractitioner.fulfilled, (state, action) => {
        const updatedPractitioner = action.payload.data;
        state.practitioners = state.practitioners.map((p) =>
          p._id === updatedPractitioner._id ? updatedPractitioner : p
        );
        state.success = 'Practitioner updated successfully';
      })
      .addCase(updatePractitioner.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Delete Practitioner
      .addCase(deletePractitioner.fulfilled, (state, action) => {
        const deletedPractitionerId = action.payload.data?._id || action.meta.arg;
        state.practitioners = state.practitioners.filter((p) => p._id !== deletedPractitionerId);
        state.success = 'Practitioner deleted successfully';
      })
      .addCase(deletePractitioner.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Add Absence
      .addCase(addAbsence.fulfilled, (state, action) => {
        const updatedPractitioner = action.payload.data;
        state.practitioners = state.practitioners.map((p) =>
          p._id === updatedPractitioner._id ? updatedPractitioner : p
        );
        state.success = 'Absence added successfully';
      })
      .addCase(addAbsence.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentPractitionerView,
  setShowPractitionerSchedule,
  setError,
  setSuccess,
  clearNotifications,
  updatePractitionerStatus,
} = medicalStaffSlice.actions;

export default medicalStaffSlice.reducer;