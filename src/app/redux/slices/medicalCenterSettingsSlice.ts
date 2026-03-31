import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://dmrs.onrender.com';

// =========================
// TYPES
// =========================
export type FacilityType =
  | 'surgery'
  | 'clinic'
  | 'hospital'
  | 'community_health'
  | 'mobile_unit'
  | 'other';

export type LocationSource =
  | 'address'
  | 'geolocation'
  | 'address_and_geolocation';

export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'cash'
  | 'insurance'
  | 'eft';

export interface Address {
  line1: string;
  line2: string;
  city: string;
  province: string;
  postal: string;
  full_address: string;
  formatted_address: string;
  place_id: string;
  lat: number | null;
  lng: number | null;
  location_source: LocationSource;
  is_location_verified: boolean;
}

export interface BankDetails {
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
}

export interface PaystackInfo {
  subaccount_code: string | null;
  is_subaccount_active: boolean;
  bank_details: BankDetails;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentSettings {
  enablePayments: boolean;
  consultationFee: number;
  bookingDeposit: number;
  depositPercentage: number;
  remainingAmount: number;
  onlineConsultationFee: number;
  allowPartialPayments: boolean;
  paymentMethods: PaymentMethod[];
  currency: string;
  lastUpdated?: string;
}

export interface AdminContact {
  name: string;
  email: string;
  phone: string;
  position: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
}

export interface ConsultationCosts {
  government: {
    faceToFace: number;
    online: number;
  };
  private: {
    faceToFace: number;
    online: number;
  };
  effectiveFrom?: string;
  history?: Array<{
    government: {
      faceToFace: number;
      online: number;
    };
    private: {
      faceToFace: number;
      online: number;
    };
    effectiveFrom?: string;
    effectiveUntil?: string;
  }>;
}

export interface PeakHoursBlock {
  start: string;
  end: string;
  multiplier: number;
}

export interface CenterSettings {
  slotDuration: number;
  bufferTime: number;
  maxDoctorsPerSlot: number;
  availableDoctorsDay: number;
  availableDoctorsNight: number;
  maxFaceToFace: number;
  maxOnline: number;
  maxDailyAppointments: number;
  bookingLeadTime: number;
  maxRescheduleAttempts: number;
  autoCancelUnconfirmed: number;
  allowAutomaticRescheduling: boolean;
  consultationCosts: ConsultationCosts;
  peakHours: {
    morning: PeakHoursBlock;
    afternoon: PeakHoursBlock;
  };
  nonWorkingDates: Array<{
    date: string;
    reason: string;
    recurring: boolean;
  }>;
}

export interface Billing {
  plan: 'basic' | 'professional' | 'enterprise';
  subscription_id?: string;
  status: 'active' | 'inactive' | 'suspended' | 'cancelled';
  next_billing_date?: string;
  payment_method?: 'card' | 'bank_transfer' | 'other';
  is_shared_with_parent: boolean;
}

export interface Statistics {
  total_patients: number;
  total_appointments: number;
  monthly_appointments: number;
  average_rating: number;
  response_time: number;
}

export interface MedicalCenterProfile {
  _id: string;
  medical_center_id: string;
  parent_center_id: string | null;

  facility_name: string;
  company_reg_number: string;
  healthcare_reg_number: string;
  facility_type: FacilityType;
  description?: string;
  website?: string;

  official_domain_email: string;
  phone: string;

  address: Address;
  paymentSettings: PaymentSettings;
  paystack: PaystackInfo;

  settings: CenterSettings;
  admin_contact: AdminContact;
  billing: Billing;
  statistics: Statistics;

  is_verified: boolean;
  is_active: boolean;
  verification_status: 'pending' | 'approved' | 'rejected' | 'needs_review';

  logo_url?: string;
  theme_colors: ThemeColors;

  created_at?: string;
  updated_at?: string;
  verified_at?: string;
  last_login?: string;
}

export interface UpdateMedicalCenterProfilePayload {
  facility_name?: string;
  company_reg_number?: string;
  healthcare_reg_number?: string;
  facility_type?: FacilityType;
  description?: string;
  website?: string;
  official_domain_email?: string;
  phone?: string;
  address?: Partial<Address>;
  bankDetails?: Partial<BankDetails>;
  admin_contact?: Partial<AdminContact>;
  theme_colors?: Partial<ThemeColors>;
  settings?: Partial<CenterSettings>;
  logo_url?: string;
}

export interface UpdateBankDetailsPayload {
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
}

interface MedicalCenterState {
  profile: MedicalCenterProfile | null;
  paymentSettings: PaymentSettings | null;
  loading: boolean;
  profileLoading: boolean;
  paymentLoading: boolean;
  bankLoading: boolean;
  forgotPasswordLoading: boolean;
  resetPasswordLoading: boolean;
  success: string | null;
  error: string | null;
}

const initialState: MedicalCenterState = {
  profile: null,
  paymentSettings: null,
  loading: false,
  profileLoading: false,
  paymentLoading: false,
  bankLoading: false,
  forgotPasswordLoading: false,
  resetPasswordLoading: false,
  success: null,
  error: null,
};

// =========================
// HELPERS
// =========================
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem('medicalCenterToken') ||
    sessionStorage.getItem('medicalCenterToken') ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token')
  );
};

const authHeader = () => {
  const token = getToken();

  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    withCredentials: true,
  };
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    return (
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      'Request failed'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
};

// =========================
// PROFILE THUNKS
// =========================
export const fetchMedicalCenterProfile = createAsyncThunk<
  MedicalCenterProfile,
  void,
  { rejectValue: string }
>('medicalCenter/fetchProfile', async (_, thunkAPI) => {
  try {
    const res = await axios.get(
      `${API_BASE_URL}/api/medical-centers/me`,
      authHeader()
    );

    return res.data.data as MedicalCenterProfile;
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error));
  }
});

export const updateMedicalCenterProfile = createAsyncThunk<
  MedicalCenterProfile,
  UpdateMedicalCenterProfilePayload,
  { rejectValue: string }
>('medicalCenter/updateProfile', async (payload, thunkAPI) => {
  try {
    const res = await axios.put(
      `${API_BASE_URL}/api/medical-centers/profile`,
      payload,
      authHeader()
    );

    return res.data.data as MedicalCenterProfile;
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error));
  }
});

// =========================
// PAYMENT SETTINGS THUNKS
// =========================
export const fetchPaymentSettings = createAsyncThunk<
  PaymentSettings,
  void,
  { rejectValue: string }
>('medicalCenter/fetchPaymentSettings', async (_, thunkAPI) => {
  try {
    const res = await axios.get(
      `${API_BASE_URL}/api/medical-centers/payment-settings`,
      authHeader()
    );

    return res.data.data as PaymentSettings;
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error));
  }
});

export const updatePaymentSettings = createAsyncThunk<
  PaymentSettings,
  Partial<PaymentSettings>,
  { rejectValue: string }
>('medicalCenter/updatePaymentSettings', async (settings, thunkAPI) => {
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
});

// =========================
// BANK DETAILS THUNK
// =========================
export const updateBankDetails = createAsyncThunk<
  PaystackInfo,
  UpdateBankDetailsPayload,
  { rejectValue: string }
>('medicalCenter/updateBankDetails', async (payload, thunkAPI) => {
  try {
    const res = await axios.put(
      `${API_BASE_URL}/api/medical-centers/bank-details`,
      payload,
      authHeader()
    );

    return res.data.data as PaystackInfo;
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error));
  }
});

// =========================
// PASSWORD THUNKS
// =========================
export const forgotPasswordMedicalCenter = createAsyncThunk<
  { success: boolean; message: string },
  string,
  { rejectValue: string }
>('medicalCenter/forgotPassword', async (email, thunkAPI) => {
  try {
    const res = await axios.post(
      `${API_BASE_URL}/api/medical-centers/forgot-password`,
      { email }
    );

    return res.data as { success: boolean; message: string };
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error));
  }
});

export const resetPasswordMedicalCenter = createAsyncThunk<
  { success: boolean; message: string },
  { token: string; password: string },
  { rejectValue: string }
>('medicalCenter/resetPassword', async ({ token, password }, thunkAPI) => {
  try {
    const res = await axios.post(
      `${API_BASE_URL}/api/medical-centers/reset-password/${token}`,
      { password }
    );

    return res.data as { success: boolean; message: string };
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error));
  }
});

// =========================
// SLICE
// =========================
const medicalCenterSlice = createSlice({
  name: 'medicalCenter',
  initialState,
  reducers: {
    clearMedicalCenterError: (state) => {
      state.error = null;
    },
    clearMedicalCenterSuccess: (state) => {
      state.success = null;
    },
    clearMedicalCenterState: (state) => {
      state.profile = null;
      state.paymentSettings = null;
      state.loading = false;
      state.profileLoading = false;
      state.paymentLoading = false;
      state.bankLoading = false;
      state.forgotPasswordLoading = false;
      state.resetPasswordLoading = false;
      state.success = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // =========================
      // FETCH PROFILE
      // =========================
      .addCase(fetchMedicalCenterProfile.pending, (state) => {
        state.profileLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(fetchMedicalCenterProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profile = action.payload;
        state.paymentSettings = action.payload.paymentSettings || null;
      })
      .addCase(fetchMedicalCenterProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.error = action.payload || 'Failed to fetch medical center profile';
      })

      // =========================
      // UPDATE PROFILE
      // =========================
      .addCase(updateMedicalCenterProfile.pending, (state) => {
        state.profileLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateMedicalCenterProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profile = action.payload;
        state.paymentSettings = action.payload.paymentSettings || state.paymentSettings;
        state.success = 'Profile updated successfully';
      })
      .addCase(updateMedicalCenterProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.error = action.payload || 'Failed to update profile';
      })

      // =========================
      // FETCH PAYMENT SETTINGS
      // =========================
      .addCase(fetchPaymentSettings.pending, (state) => {
        state.paymentLoading = true;
        state.error = null;
      })
      .addCase(fetchPaymentSettings.fulfilled, (state, action) => {
        state.paymentLoading = false;
        state.paymentSettings = action.payload;

        if (state.profile) {
          state.profile.paymentSettings = action.payload;
        }
      })
    

      // =========================
      // UPDATE PAYMENT SETTINGS
      // =========================
      .addCase(updatePaymentSettings.pending, (state) => {
        state.paymentLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updatePaymentSettings.fulfilled, (state, action) => {
        state.paymentLoading = false;
        state.paymentSettings = action.payload;

        if (state.profile) {
          state.profile.paymentSettings = action.payload;
        }

        state.success = 'Payment settings updated successfully';
      })
      .addCase(updatePaymentSettings.rejected, (state, action) => {
        state.paymentLoading = false;
        state.error = action.payload || 'Failed to update payment settings';
      })

      // =========================
      // UPDATE BANK DETAILS
      // =========================
      .addCase(updateBankDetails.pending, (state) => {
        state.bankLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateBankDetails.fulfilled, (state, action) => {
        state.bankLoading = false;

        if (state.profile) {
          state.profile.paystack = action.payload;
        }

        state.success = 'Medical center infomation updated successfully';
      })
      .addCase(updateBankDetails.rejected, (state, action) => {
        state.bankLoading = false;
        state.error = action.payload || 'Failed to update Medical center infomation';
      })

      // =========================
      // FORGOT PASSWORD
      // =========================
      .addCase(forgotPasswordMedicalCenter.pending, (state) => {
        state.forgotPasswordLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(forgotPasswordMedicalCenter.fulfilled, (state, action) => {
        state.forgotPasswordLoading = false;
        state.success = action.payload.message || 'Reset email sent';
      })
      .addCase(forgotPasswordMedicalCenter.rejected, (state, action) => {
        state.forgotPasswordLoading = false;
        state.error = action.payload || 'Failed to send reset email';
      })

      // =========================
      // RESET PASSWORD
      // =========================
      .addCase(resetPasswordMedicalCenter.pending, (state) => {
        state.resetPasswordLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(resetPasswordMedicalCenter.fulfilled, (state, action) => {
        state.resetPasswordLoading = false;
        state.success = action.payload.message || 'Password reset successful';
      })
      .addCase(resetPasswordMedicalCenter.rejected, (state, action) => {
        state.resetPasswordLoading = false;
        state.error = action.payload || 'Failed to reset password';
      });
  },
});

export const {
  clearMedicalCenterError,
  clearMedicalCenterSuccess,
  clearMedicalCenterState,
} = medicalCenterSlice.actions;

export default medicalCenterSlice.reducer;