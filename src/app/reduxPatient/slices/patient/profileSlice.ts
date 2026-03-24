import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dmrs.onrender.com';

// ----------------------- TYPES -----------------------
export interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  emergencyContact: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  patient: Patient;
  message?: string;
}

export interface PatientState {
  patientInfo: Patient | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  idNumber: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber: string;
  password: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  emergencyContact: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// ----------------------- AUTH UTILS -----------------------
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem('patientToken') ||
    sessionStorage.getItem('patientToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token')
  );
};

export const getPatientFromStorage = (): Patient | null => {
  if (typeof window === 'undefined') return null;

  const storedPatient =
    localStorage.getItem('patientInfo') || sessionStorage.getItem('patientInfo');
  return storedPatient ? (JSON.parse(storedPatient) as Patient) : null;
};

export const setAuthData = (
  token: string,
  patient: Patient,
  rememberMe: boolean = true
): void => {
  if (typeof window === 'undefined') return;

  if (rememberMe) {
    localStorage.setItem('patientToken', token);
    localStorage.setItem('patientInfo', JSON.stringify(patient));
    localStorage.setItem('patientId', patient._id);
  } else {
    sessionStorage.setItem('patientToken', token);
    sessionStorage.setItem('patientInfo', JSON.stringify(patient));
    sessionStorage.setItem('patientId', patient._id);
  }
};

export const clearAuthData = (): void => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('patientToken');
  localStorage.removeItem('patientInfo');
  localStorage.removeItem('patientId');
  sessionStorage.removeItem('patientToken');
  sessionStorage.removeItem('patientInfo');
  sessionStorage.removeItem('patientId');
};

// ----------------------- AXIOS CONFIG -----------------------
const authAxios = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
authAxios.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh (optional)
authAxios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearAuthData();
      if (typeof window !== 'undefined') {
        window.location.href = '/createprofile';
      }
    }
    return Promise.reject(error);
  }
);

// ----------------------- THUNKS -----------------------
export const registerPatient = createAsyncThunk(
  'profile/register',
  async (patientData: RegisterData & { rememberMe?: boolean }, { rejectWithValue }) => {
    try {
      const response = await authAxios.post<AuthResponse>(
        '/api/patients/register',
        patientData
      );

      if (response.data.success && response.data.token) {
        setAuthData(
          response.data.token,
          response.data.patient,
          patientData.rememberMe ?? true
        );
      }

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string; error?: string }>;
        return rejectWithValue(
          axiosError.response?.data?.message ||
            axiosError.response?.data?.error ||
            'Registration failed'
        );
      }
      const err = error as Error;
      return rejectWithValue(err.message || 'Registration failed');
    }
  }
);

export const loginPatient = createAsyncThunk(
  'profile/login',
  async (credentials: LoginCredentials & { rememberMe?: boolean }, { rejectWithValue }) => {
    try {
      const response = await authAxios.post<AuthResponse>(
        '/api/patients/login',
        credentials
      );

      if (response.data.success && response.data.token) {
        setAuthData(
          response.data.token,
          response.data.patient,
          credentials.rememberMe ?? true
        );
      }

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string; error?: string }>;
        return rejectWithValue(
          axiosError.response?.data?.message ||
            axiosError.response?.data?.error ||
            'Login failed'
        );
      }
      const err = error as Error;
      return rejectWithValue(err.message || 'Login failed');
    }
  }
);

export const getPatientProfile = createAsyncThunk(
  'profile/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue('No authentication token found');
      }

      const response = await authAxios.get<{ success: boolean; patient: Patient }>(
        '/api/patients/profile'
      );

      if (response.data.success) {
        // Update stored patient info
        const patient = response.data.patient;
        if (typeof window !== 'undefined') {
          const storedPatient =
            localStorage.getItem('patientInfo') || sessionStorage.getItem('patientInfo');
          if (storedPatient) {
            localStorage.setItem('patientInfo', JSON.stringify(patient));
            sessionStorage.setItem('patientInfo', JSON.stringify(patient));
          }
        }
        return patient;
      }

      throw new Error('Failed to fetch profile');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string; error?: string }>;
        // Clear auth data on 401
        if (axiosError.response?.status === 401) {
          clearAuthData();
        }
        return rejectWithValue(
          axiosError.response?.data?.message ||
            axiosError.response?.data?.error ||
            'Failed to fetch profile'
        );
      }
      const err = error as Error;
      return rejectWithValue(err.message || 'Failed to fetch profile');
    }
  }
);

export const forgotPasswordPatient = createAsyncThunk(
  'profile/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await authAxios.post<ForgotPasswordResponse>(
        '/api/patients/forgot-password',
        { email }
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string }>;
        return rejectWithValue(
          axiosError.response?.data?.message || 'Failed to send reset email'
        );
      }
      const err = error as Error;
      return rejectWithValue(err.message || 'Failed to send reset email');
    }
  }
);

export const resetPasswordPatient = createAsyncThunk(
  'profile/resetPassword',
  async ({ token, password }: { token: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authAxios.put<ResetPasswordResponse>(
        `/api/patients/reset-password/${token}`,
        { password }
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string }>;
        return rejectWithValue(axiosError.response?.data?.message || 'Reset failed');
      }
      const err = error as Error;
      return rejectWithValue(err.message || 'Reset failed');
    }
  }
);

// ----------------------- INITIAL STATE -----------------------
const getInitialState = (): PatientState => {
  if (typeof window === 'undefined') {
    return {
      patientInfo: null,
      token: null,
      loading: false,
      error: null,
      isAuthenticated: false,
    };
  }

  const token = getAuthToken();
  const patientInfo = getPatientFromStorage();

  return {
    patientInfo,
    token,
    loading: false,
    error: null,
    isAuthenticated: !!token && !!patientInfo?._id,
  };
};

const initialState: PatientState = getInitialState();

// ----------------------- SLICE -----------------------
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    logout: (state) => {
      state.patientInfo = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      clearAuthData();
    },

    clearError: (state) => {
      state.error = null;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setPatientInfo: (state, action: PayloadAction<Patient | null>) => {
      state.patientInfo = action.payload;
    },

    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
      state.isAuthenticated = !!action.payload;
    },

    refreshAuthState: (state) => {
      const token = getAuthToken();
      const patientInfo = getPatientFromStorage();
      state.token = token;
      state.patientInfo = patientInfo;
      state.isAuthenticated = !!token && !!patientInfo?._id;
    },
  },

  extraReducers: (builder) => {
    builder
      // ---------------- REGISTER ----------------
      .addCase(registerPatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerPatient.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.patientInfo = action.payload.patient;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(registerPatient.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Registration failed';
        state.isAuthenticated = false;
      })

      // ---------------- LOGIN ----------------
      .addCase(loginPatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginPatient.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.patientInfo = action.payload.patient;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginPatient.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Login failed';
        state.isAuthenticated = false;
      })

      // ---------------- FORGOT PASSWORD ----------------
      .addCase(forgotPasswordPatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPasswordPatient.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPasswordPatient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ---------------- RESET PASSWORD ----------------
      .addCase(resetPasswordPatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPasswordPatient.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPasswordPatient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ---------------- PROFILE ----------------
      .addCase(getPatientProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPatientProfile.fulfilled, (state, action: PayloadAction<Patient>) => {
        state.loading = false;
        state.patientInfo = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getPatientProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load profile';
        state.isAuthenticated = false;
        state.patientInfo = null;
        state.token = null;
      });
  },
});

export const {
  logout,
  clearError,
  setLoading,
  setPatientInfo,
  setToken,
  refreshAuthState,
} = profileSlice.actions;

export default profileSlice.reducer;