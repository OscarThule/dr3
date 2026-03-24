import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';

/**
 * IMPORTANT:
 * Make sure your token is stored in localStorage as:
 * medicalCenterToken
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://dmrs.onrender.com';

export interface PaymentSettings {
  enablePayments: boolean;
  consultationFee: number;
  onlineConsultationFee: number;
  bookingDeposit: number;
  depositPercentage: number;
  remainingAmount: number;
  allowPartialPayments: boolean;
  paymentMethods: string[];
  currency: string;
}

interface PaymentSettingsState {
  settings: PaymentSettings | null;
  loading: boolean;
  error: string | null;
}

const initialState: PaymentSettingsState = {
  settings: null,
  loading: false,
  error: null,
};

const authHeader = () => {
  const token = localStorage.getItem('authToken'); // <-- Correct token key

  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    withCredentials: true,
  };
};

// Helper to extract error message from unknown error
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

/**
 * ================================
 * GET PAYMENT SETTINGS
 * ================================
 */
export const fetchPaymentSettings = createAsyncThunk(
  'paymentSettings/fetch',
  async (_, thunkAPI) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/medical-centers/payment-settings`,
        authHeader()
      );
      return res.data.data as PaymentSettings;
    } catch (error) {
      return thunkAPI.rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * ================================
 * UPDATE PAYMENT SETTINGS
 * ================================
 */
export const updatePaymentSettings = createAsyncThunk(
  'paymentSettings/update',
  async (settings: Partial<PaymentSettings>, thunkAPI) => {
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/medical-centers/payment-settings`,
        settings,
        authHeader()
      );
      return res.data.data as PaymentSettings;
    } catch (error) {
      return thunkAPI.rejectWithValue(getErrorMessage(error));
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'medical/forgotPassword',
  async (email: string, thunkAPI) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/medical-centers/forgot-password`,
        { email }
      );
      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(getErrorMessage(error));
    }
  }
);

const paymentSettingsSlice = createSlice({
  name: 'paymentSettings',
  initialState,
  reducers: {
    clearPaymentError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // FETCH
      .addCase(fetchPaymentSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
        state.loading = false;
      })
      .addCase(fetchPaymentSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // UPDATE
      .addCase(updatePaymentSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePaymentSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
        state.loading = false;
      })
      .addCase(updatePaymentSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPaymentError } = paymentSettingsSlice.actions;
export default paymentSettingsSlice.reducer;