import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

interface AddPractitionerState {
  loading: boolean;
  error: string | null;
  success: string | null;
}

const initialState: AddPractitionerState = {
  loading: false,
  error: null,
  success: null
};

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://dmrs.onrender.com',
});

// Add auth token to requests
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
  defaultWorkingHours?: any[];
  hourlyRate?: number;
  temporaryPeriod?: {
    start: string;
    end: string;
  };
}

// Add practitioner thunk
export const addPractitioner = createAsyncThunk(
  'addPractitioner/addPractitioner',
  async (practitionerData: NewPractitionerData, { rejectWithValue }) => {
    try {
      console.log('Sending practitioner data:', practitionerData);

      const response = await api.post('/api/practitioners', practitionerData);
      
      console.log('Practitioner created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating practitioner:', error);
      
      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(error.message || 'Failed to add practitioner');
    }
  }
);

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