import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dmrs.onrender.com/api';

// Define PractitionerSession interface - replace any with unknown
export interface PractitionerSession {
  _id: string;
  idNumber: string;
  name: string;
  specialization: string | string[];
  email?: string;
  phone?: string;
  medical_center_ids?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Allow additional properties but with unknown instead of any
  [key: string]: unknown;
}

interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

interface AuthState {
  session: PractitionerSession | null;
  loading: boolean;
  error: string | null;
  token: string | null;
  forgotPassword: {
    loading: boolean;
    success: boolean;
    error: string | null;
  };
  resetPassword: {
    loading: boolean;
    success: boolean;
    error: string | null;
  };
}

const initialState: AuthState = {
  session: null,
  loading: false,
  error: null,
  token: null,
  forgotPassword: {
    loading: false,
    success: false,
    error: null,
  },
  resetPassword: {
    loading: false,
    success: false,
    error: null,
  },
};

// Login thunk
export const loginPractitioner = createAsyncThunk(
  'auth/loginPractitioner',
  async (
    credentials: { idNumber: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      console.log('API login attempt to:', `${API_BASE_URL}/practitioners/login`);

      const response = await axios.post<{
        session: PractitionerSession;
        token: string;
      }>(
        `${API_BASE_URL}/practitioners/login`,
        credentials,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log('API response:', response.data);

      // Validate response structure
      if (!response.data?.session || !response.data?.token) {
        throw new Error('Invalid response format from server');
      }

      return {
        session: response.data.session,
        token: response.data.token,
      };

    } catch (error: unknown) {
      console.error('Login API error:', error);

      let errorMessage = 'Login failed. Please try again.';

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 401) {
          errorMessage = 'Invalid ID number or password.';
        } else if (status === 404) {
          errorMessage = 'Login endpoint not found.';
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (data?.error) {
          errorMessage = data.error;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

// Forgot password thunk
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await axios.post<ForgotPasswordResponse>(
        `${API_BASE_URL}/practitioners/forgot-password`,
        { email },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error: unknown) {
      console.error('Forgot password error:', error);
      
      let errorMessage = 'Failed to send reset link. Please try again.';
      
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data?.message) {
          errorMessage = data.message;
        }
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

// Reset password thunk
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }: ResetPasswordRequest, { rejectWithValue }) => {
    try {
      const response = await axios.post<ResetPasswordResponse>(
        `${API_BASE_URL}/practitioners/reset-password/${token}`,
        { password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error: unknown) {
      console.error('Reset password error:', error);
      
      let errorMessage = 'Failed to reset password. Please try again.';
      
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data?.message) {
          errorMessage = data.message;
        }
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

// Logout thunk
export const logoutPractitioner = createAsyncThunk(
  'auth/logoutPractitioner',
  async (_, { dispatch }) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('practitionerToken');
      localStorage.removeItem('practitionerSession');
    }
    
    dispatch(clearSession());
    
    return true;
  }
);

// Slice definition
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearSession: (state) => {
      state.session = null;
      state.token = null;
      state.error = null;
      state.forgotPassword = initialState.forgotPassword;
      state.resetPassword = initialState.resetPassword;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('practitionerToken');
        localStorage.removeItem('practitionerSession');
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    clearForgotPasswordState: (state) => {
      state.forgotPassword = initialState.forgotPassword;
    },
    clearResetPasswordState: (state) => {
      state.resetPassword = initialState.resetPassword;
    },
    updateSession: (state, action: PayloadAction<Partial<PractitionerSession>>) => {
      if (state.session) {
        state.session = { ...state.session, ...action.payload };
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('practitionerSession', JSON.stringify(state.session));
        }
      }
    },
    restoreSession: (state) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('practitionerToken');
        const sessionStr = localStorage.getItem('practitionerSession');

        if (token && sessionStr) {
          try {
            const parsedSession = JSON.parse(sessionStr) as PractitionerSession;
            if (parsedSession && parsedSession._id) {
              state.token = token;
              state.session = parsedSession;
            } else {
              console.warn('Stored session is invalid');
              localStorage.removeItem('practitionerToken');
              localStorage.removeItem('practitionerSession');
            }
          } catch (e) {
            console.error('Failed to parse stored session:', e);
            localStorage.removeItem('practitionerToken');
            localStorage.removeItem('practitionerSession');
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(loginPractitioner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginPractitioner.fulfilled, (state, action: PayloadAction<{ session: PractitionerSession; token: string }>) => {
        state.loading = false;
        state.session = action.payload.session;
        state.token = action.payload.token;
        state.error = null;

        if (typeof window !== 'undefined') {
          localStorage.setItem('practitionerToken', action.payload.token);
          localStorage.setItem('practitionerSession', JSON.stringify(action.payload.session));
        }
      })
      .addCase(loginPractitioner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Login failed. Please try again.';
        state.session = null;
        state.token = null;
      })
      
      // FORGOT PASSWORD
      .addCase(forgotPassword.pending, (state) => {
        state.forgotPassword.loading = true;
        state.forgotPassword.error = null;
        state.forgotPassword.success = false;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.forgotPassword.loading = false;
        state.forgotPassword.success = true;
        state.forgotPassword.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.forgotPassword.loading = false;
        state.forgotPassword.success = false;
        state.forgotPassword.error = action.payload as string || 'Failed to send reset link';
      })
      
      // RESET PASSWORD
      .addCase(resetPassword.pending, (state) => {
        state.resetPassword.loading = true;
        state.resetPassword.error = null;
        state.resetPassword.success = false;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.resetPassword.loading = false;
        state.resetPassword.success = true;
        state.resetPassword.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.resetPassword.loading = false;
        state.resetPassword.success = false;
        state.resetPassword.error = action.payload as string || 'Failed to reset password';
      })
      
      // LOGOUT
      .addCase(logoutPractitioner.fulfilled, (state) => {
        state.session = null;
        state.token = null;
        state.error = null;
        state.forgotPassword = initialState.forgotPassword;
        state.resetPassword = initialState.resetPassword;
      });
  },
});

export const { 
  clearSession, 
  clearError, 
  clearForgotPasswordState,
  clearResetPasswordState,
  updateSession, 
  restoreSession 
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectSession = (state: { auth: AuthState }) => state.auth.session;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectForgotPassword = (state: { auth: AuthState }) => state.auth.forgotPassword;
export const selectResetPassword = (state: { auth: AuthState }) => state.auth.resetPassword;