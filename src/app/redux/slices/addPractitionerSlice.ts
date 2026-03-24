import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// ==============================================
// Types
// ==============================================

// Working hours for a single day
export interface WorkingHoursDay {
 
  enabled: boolean | undefined;
  day: string;          // e.g., "monday", "tuesday"
  start: string;        // e.g., "09:00"
  end: string;          // e.g., "17:00"
  breaks?: Array<{
    start: string;
    end: string;
    reason?: string;
  }>;
}

// Interface matching your backend Practitioner model
export interface NewPractitionerData {
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  password: string;
  specialization: string[];
  qualification: string;
  licenseNumber: string;
  experience: number;
  role: 'doctor' | 'nurse' | 'specialist' | 'surgeon' | 'therapist' | 'admin';
  availableFor: ('face-to-face' | 'online')[];
  isActive: boolean;
  isTemporary: boolean;
  maxPatientsPerSlot: number;
  notes?: string;
  defaultWorkingHours?: WorkingHoursDay[];   // ✅ Replaced any[] with proper type
  hourlyRate?: number;
  temporaryPeriod?: {
    start: string;
    end: string;
  };
}

// State interface
interface AddPractitionerState {
  loading: boolean;
  error: string | null;
  success: string | null;
}

// ==============================================
// Initial State
// ==============================================
const initialState: AddPractitionerState = {
  loading: false,
  error: null,
  success: null
};

// ==============================================
// Axios instance with auth interceptor
// ==============================================
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

// ==============================================
// Thunk
// ==============================================
export const addPractitioner = createAsyncThunk(
  'addPractitioner/addPractitioner',
  async (practitionerData: NewPractitionerData, { rejectWithValue }) => {
    try {
      console.log('Sending practitioner data:', practitionerData);
      const response = await api.post('/api/practitioners', practitionerData);
      console.log('Practitioner created successfully:', response.data);
      return response.data;
    } catch (error: unknown) {   // ✅ Replaced any with unknown
      console.error('Error creating practitioner:', error);
      
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      }
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to add practitioner');
    }
  }
);

// ==============================================
// Slice
// ==============================================
const addPractitionerSlice = createSlice({
  name: 'addPractitioner',
  initialState,
  reducers: {
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
    resetState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(addPractitioner.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(addPractitioner.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload.message || 'Practitioner added successfully';
      })
      .addCase(addPractitioner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to add practitioner';
      });
  }
});

export const {
  setError,
  setSuccess,
  clearNotifications,
  resetState
} = addPractitionerSlice.actions;

export default addPractitionerSlice.reducer;