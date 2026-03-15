import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// Interface matching your backend Practitioner model
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
  defaultWorkingHours: any[];
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

const initialState: MedicalStaffState = {
  practitioners: [],
  loading: false,
  currentPractitionerView: null,
  showPractitionerSchedule: false,
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

// Thunks
export const fetchPractitioners = createAsyncThunk(
  'medicalStaff/fetchPractitioners',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/practitioners');
      return response.data;
    } catch (error: any) {
      console.error('Fetch practitioners error:', error);
      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(error.message || 'Failed to fetch practitioners');
    }
  }
);

export const updatePractitioner = createAsyncThunk(
  'medicalStaff/updatePractitioner',
  async ({ practitionerId, updates }: { practitionerId: string; updates: Partial<Practitioner> }, { rejectWithValue }) => {
    try {
      console.log('Updating practitioner:', practitionerId, updates);
      
      const response = await api.put(`/api/practitioners/${practitionerId}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('Update practitioner error:', error);
      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(error.message || 'Failed to update practitioner');
    }
  }
);

export const deletePractitioner = createAsyncThunk(
  'medicalStaff/deletePractitioner',
  async (practitionerId: string, { rejectWithValue }) => {
    try {
      console.log('Deleting practitioner:', practitionerId);
      
      const response = await api.delete(`/api/practitioners/${practitionerId}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete practitioner error:', error);
      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(error.message || 'Failed to delete practitioner');
    }
  }
);

export const addAbsence = createAsyncThunk(
  'medicalStaff/addAbsence',
  async ({ practitionerId, absence }: { practitionerId: string; absence: Omit<Absence, '_id'> }, { rejectWithValue }) => {
    try {
      console.log('Adding absence:', practitionerId, absence);
      
      // Get current practitioner first
      const currentResponse = await api.get(`/api/practitioners/${practitionerId}`);
      const currentPractitioner = currentResponse.data.data;
      
      // Update with new absence
      const updatedAbsences = [...(currentPractitioner.absences || []), absence];
      
      const updateResponse = await api.put(`/api/practitioners/${practitionerId}`, {
        absences: updatedAbsences
      });
      
      return updateResponse.data;
    } catch (error: any) {
      console.error('Add absence error:', error);
      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(error.message || 'Failed to add absence');
    }
  }
);

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
    updatePractitionerStatus: (state, action: PayloadAction<{ practitionerId: string; status: Practitioner['currentStatus'] }>) => {
      const practitioner = state.practitioners.find(p => p._id === action.payload.practitionerId);
      if (practitioner) {
        practitioner.currentStatus = action.payload.status;
      }
    }
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
        state.practitioners = action.payload.data || action.payload;
        state.success = 'Practitioners loaded successfully';
      })
      .addCase(fetchPractitioners.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Practitioner
      .addCase(updatePractitioner.fulfilled, (state, action) => {
        const updatedPractitioner = action.payload.data;
        state.practitioners = state.practitioners.map(p =>
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
        state.practitioners = state.practitioners.filter(p => p._id !== deletedPractitionerId);
        state.success = 'Practitioner deleted successfully';
      })
      .addCase(deletePractitioner.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Add Absence
      .addCase(addAbsence.fulfilled, (state, action) => {
        const updatedPractitioner = action.payload.data;
        state.practitioners = state.practitioners.map(p =>
          p._id === updatedPractitioner._id ? updatedPractitioner : p
        );
        state.success = 'Absence added successfully';
      })
      .addCase(addAbsence.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  }
});

export const {
  setCurrentPractitionerView,
  setShowPractitionerSchedule,
  setError,
  setSuccess,
  clearNotifications,
  updatePractitionerStatus
} = medicalStaffSlice.actions;

export default medicalStaffSlice.reducer;