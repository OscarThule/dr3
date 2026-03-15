import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// Types
export type FacilityType = 'surgery' | 'clinic' | 'hospital' | 'community_health' | 'mobile_unit' | 'other';
export type PractitionerRole = 'doctor' | 'nurse' | 'clinical_manager' | 'admin';
export type VerificationStatus = 'unverified' | 'verified' | 'rejected';

export interface Address {
  line1: string;
  city: string;
  province: string;
  postal: string;
  lat: number | null;
  lng: number | null;
}

export interface BankDetails {
  bank_name: string;
  account_number: string;
  bank_code: string;
  account_type: string;
}

export interface Practitioner {
  practitioner_id: string;
  full_name: string;
  role: PractitionerRole;
  professional_license_number: string;
  license_type: string;
  license_doc_url: string;
  contact_email: string;
  contact_phone: string;
  verification_status: VerificationStatus;
}

export interface FacilityFormData {
  facility_name: string;
  company_reg_number: string;
  healthcare_reg_number: string;
  facility_type: FacilityType;
  official_domain_email: string;
  phone: string;
  address: Address;
  practitioners: Practitioner[];
  bankDetails: BankDetails; // Added bank details
  password: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}
export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  password: string;
}


export interface MedicalCenterState {
  isRegistered: boolean;
  isLoading: boolean;
  error: string;
  success: string;
  activeForm: string;
  token: string | null;
  formData: FacilityFormData;
  newPractitioner: Omit<Practitioner, 'practitioner_id'>;
  loginData: LoginFormData;
  isGettingLocation: boolean;
  locationError: string;
    forgotPasswordData: ForgotPasswordData;
  resetPasswordData: ResetPasswordData;

}

// Base URL for API
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dmrs.onrender.com';

// Initial state
const initialState: MedicalCenterState = {
  isRegistered: false,
  isLoading: false,
  error: '',
  success: '',
  activeForm: 'login',
  token: null,
  formData: {
    facility_name: '',
    company_reg_number: '',
    healthcare_reg_number: '',
    facility_type: 'clinic',
    official_domain_email: '',
    phone: '',
    address: {
      line1: '',
      city: '',
      province: '',
      postal: '',
      lat: null,
      lng: null,
    },
    practitioners: [],
    bankDetails: {
      bank_name: '',
      account_number: '',
      bank_code: '',
      account_type: 'current',
    },
    password: '',
  },
  newPractitioner: {
    full_name: '',
    role: 'doctor',
    professional_license_number: '',
    license_type: 'HPCSA',
    license_doc_url: '',
    contact_email: '',
    contact_phone: '',
    verification_status: 'unverified',
  },
  
  loginData: {
    email: '',
    password: ''
  },
    forgotPasswordData: {
    email: ''
  },
  resetPasswordData: {
    password: ''
  },

  isGettingLocation: false,
  locationError: '',
};

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Async thunks
export const getCurrentLocation = createAsyncThunk(
  'medicalCenter/getCurrentLocation',
  async (_, { rejectWithValue }) => {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ lat: latitude, lng: longitude });
        },
        (error) => {
          let errorMessage = 'An unknown error occurred.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
            default:
              errorMessage = 'An unknown error occurred.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }
);

export const registerMedicalCenter = createAsyncThunk(
  'medicalCenter/registerMedicalCenter',
  async (formData: FacilityFormData, { rejectWithValue }) => {
    try {
      // Prepare data according to backend expectations including bank details
      const registrationData = {
        facility_name: formData.facility_name,
        company_reg_number: formData.company_reg_number,
        healthcare_reg_number: formData.healthcare_reg_number,
        facility_type: formData.facility_type,
        official_domain_email: formData.official_domain_email,
        phone: formData.phone,
        password: formData.password,
        address: formData.address,
        bankDetails: formData.bankDetails, // Include bank details
        practitioners: formData.practitioners.map(practitioner => ({
          full_name: practitioner.full_name,
          role: practitioner.role,
          professional_license_number: practitioner.professional_license_number,
          license_type: practitioner.license_type,
          contact_email: practitioner.contact_email,
          contact_phone: practitioner.contact_phone,
        }))
      };

      const response = await api.post('/api/medical-centers/register', registrationData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(error.message || 'Registration failed. Please try again.');
    }
  }
);

export const loginUser = createAsyncThunk(
  'medicalCenter/loginUser',
  async (loginData: LoginFormData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/medical-centers/login', {
        email: loginData.email,
        password: loginData.password
      });
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        
        // Set default authorization header for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

        // Store medical_center_id
        localStorage.setItem('medicalCenterId', response.data.data.medical_center_id);
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(error.message || 'Login failed. Please check your credentials.');
    }
  }
);
export const forgotPassword = createAsyncThunk(
  'medicalCenter/forgotPassword',
  async (data: ForgotPasswordData, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/medical-centers/forgot-password', data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to send reset email');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'medicalCenter/resetPassword',
  async ({ token, password }: { token: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/api/medical-centers/reset-password/${token}`, { password });
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Password reset failed');
    }
  }
);


// Slice
const medicalCenterSlice = createSlice({
  name: 'medicalCenter',
  initialState,
  reducers: {
    setFormData: (state, action: PayloadAction<FacilityFormData>) => {
      state.formData = action.payload;
    },
    setNewPractitioner: (state, action: PayloadAction<Omit<Practitioner, 'practitioner_id'>>) => {
      state.newPractitioner = action.payload;
    },
    setLoginData: (state, action: PayloadAction<LoginFormData>) => {
      state.loginData = action.payload;
    },
    setActiveForm: (state, action: PayloadAction<string>) => {
      state.activeForm = action.payload;
    },
    setIsRegistered: (state, action: PayloadAction<boolean>) => {
      state.isRegistered = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    setSuccess: (state, action: PayloadAction<string>) => {
      state.success = action.payload;
    },
    setLocationError: (state, action: PayloadAction<string>) => {
      state.locationError = action.payload;
    },
    setIsGettingLocation: (state, action: PayloadAction<boolean>) => {
      state.isGettingLocation = action.payload;
    },
    updateFormField: (state, action: PayloadAction<{ field: string; value: any }>) => {
      const { field, value } = action.payload;
      (state.formData as any)[field] = value;
    },
    updateAddressField: (state, action: PayloadAction<{ field: string; value: string }>) => {
      const { field, value } = action.payload;
      (state.formData.address as any)[field] = value;
    },
    updateBankField: (state, action: PayloadAction<{ field: string; value: string }>) => {
      const { field, value } = action.payload;
      if (state.formData?.bankDetails) {
        (state.formData.bankDetails as any)[field] = value;
      }
    },
    updatePractitionerField: (state, action: PayloadAction<{ field: string; value: any }>) => {
      const { field, value } = action.payload;
      (state.newPractitioner as any)[field] = value;
    },
    updateLoginField: (state, action: PayloadAction<{ field: string; value: string }>) => {
      const { field, value } = action.payload;
      (state.loginData as any)[field] = value;
    },
        setForgotPasswordData: (state, action: PayloadAction<ForgotPasswordData>) => {
      state.forgotPasswordData = action.payload;
    },
    setResetPasswordData: (state, action: PayloadAction<ResetPasswordData>) => {
      state.resetPasswordData = action.payload;
    },
    updateForgotPasswordField: (state, action: PayloadAction<{ field: string; value: string }>) => {
      (state.forgotPasswordData as any)[action.payload.field] = action.payload.value;
    },
    updateResetPasswordField: (state, action: PayloadAction<{ field: string; value: string }>) => {
      (state.resetPasswordData as any)[action.payload.field] = action.payload.value;
    },

    addPractitioner: (state) => {
      if (state.newPractitioner.full_name && state.newPractitioner.contact_email) {
        const practitioner: Practitioner = {
          ...state.newPractitioner,
          practitioner_id: `prac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        state.formData.practitioners.push(practitioner);

        // Reset new practitioner form
        state.newPractitioner = {
          full_name: '',
          role: 'doctor',
          professional_license_number: '',
          license_type: 'HPCSA',
          license_doc_url: '',
          contact_email: '',
          contact_phone: '',
          verification_status: 'unverified',
        };
      }
    },
    removePractitioner: (state, action: PayloadAction<string>) => {
      state.formData.practitioners = state.formData.practitioners.filter(
        p => p.practitioner_id !== action.payload
      );
    },
    clearError: (state) => {
      state.error = '';
    },
    clearSuccess: (state) => {
      state.success = '';
    },
    clearNotifications: (state) => {
      state.error = '';
      state.success = '';
    },
    resetForm: (state) => {
      state.formData = initialState.formData;
      state.newPractitioner = initialState.newPractitioner;
    }
  },
  extraReducers: (builder) => {
    builder
      // getCurrentLocation
      .addCase(getCurrentLocation.pending, (state) => {
        state.isGettingLocation = true;
        state.locationError = '';
      })
      .addCase(getCurrentLocation.fulfilled, (state, action) => {
        state.isGettingLocation = false;
        state.formData.address.lat = action.payload.lat;
        state.formData.address.lng = action.payload.lng;
        state.locationError = 'Location captured successfully!';
      })
      .addCase(getCurrentLocation.rejected, (state, action) => {
        state.isGettingLocation = false;
        state.locationError = action.error.message || 'Failed to get location';
      })
      // registerMedicalCenter
      .addCase(registerMedicalCenter.pending, (state) => {
        state.isLoading = true;
        state.error = '';
        state.success = '';
      })
      .addCase(registerMedicalCenter.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload.message || 'Medical center registered successfully! Our team will review your application.';
        state.isRegistered = true;
        if (action.payload.token) {
          state.token = action.payload.token;
        }
      })
      .addCase(registerMedicalCenter.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // loginUser
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = '';
        state.success = '';
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.success = action.payload.message || 'Login successful! Redirecting...';
        state.isRegistered = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = '';
        state.success = '';
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload.message || 'Reset email sent';
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // resetPassword
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = '';
        state.success = '';
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload.message || 'Password reset successful';
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      
  },
});

export const {
  setFormData,
  setNewPractitioner,
  setLoginData,
  setActiveForm,
  setIsRegistered,
  setError,
  setSuccess,
  setLocationError,
  setIsGettingLocation,
  updateFormField,
  updateAddressField,
  updateBankField,
  updatePractitionerField,
  updateLoginField,
  addPractitioner,
  removePractitioner,
  clearError,
  clearSuccess,
  clearNotifications,
  resetForm,
    setForgotPasswordData,
  setResetPasswordData,
  updateForgotPasswordField,
  updateResetPasswordField,

} = medicalCenterSlice.actions;

export default medicalCenterSlice.reducer;