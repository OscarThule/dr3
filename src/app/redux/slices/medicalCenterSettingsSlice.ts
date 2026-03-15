import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

/**
 * IMPORTANT:
 * Make sure your token is stored in localStorage as:
 * medicalCenterToken
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://dmrs.onrender.com'

export interface PaymentSettings {
  enablePayments: boolean
  consultationFee: number
  onlineConsultationFee: number
  bookingDeposit: number
  depositPercentage: number
  remainingAmount: number
  allowPartialPayments: boolean
  paymentMethods: string[]
  currency: string
}

interface PaymentSettingsState {
  settings: PaymentSettings | null
  loading: boolean
  error: string | null
}

const initialState: PaymentSettingsState = {
  settings: null,
  loading: false,
  error: null
}

const authHeader = () => {
  const token = localStorage.getItem('authToken'); // <-- Correct token key

  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    },
    withCredentials: true
  }
}


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
      )

      return res.data.data
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to load payment settings'
      )
    }
  }
)

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
      )

      return res.data.data
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to update payment settings'
      )
    }
  }
)

export const forgotPassword = createAsyncThunk(
  'medical/forgotPassword',
  async (email: string, thunkAPI) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/medical-centers/forgot-password`,
        { email }
      );
      return res.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || 'Failed to send reset email'
      );
    }
  }
);


const paymentSettingsSlice = createSlice({
  name: 'paymentSettings',
  initialState,
  reducers: {
    clearPaymentError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder

      // FETCH
      .addCase(fetchPaymentSettings.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPaymentSettings.fulfilled, (state, action) => {
        state.settings = action.payload
        state.loading = false
      })
      .addCase(fetchPaymentSettings.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // UPDATE
      .addCase(updatePaymentSettings.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updatePaymentSettings.fulfilled, (state, action) => {
        state.settings = action.payload
        state.loading = false
      })
      .addCase(updatePaymentSettings.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

export const { clearPaymentError } = paymentSettingsSlice.actions
export default paymentSettingsSlice.reducer
