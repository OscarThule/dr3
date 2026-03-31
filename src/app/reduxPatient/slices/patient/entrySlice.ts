import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// ==================== TYPES ====================

export type Address = {
  formatted_address: string;
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postal: string;
  lat?: number;
  lng?: number;
};

export type Practitioner = {
  _id: string;
  practitioner_id: string;
  full_name?: string;
  role?: string;
  professional_license_number?: string;
  license_type?: string;
  specialties?: string[];
  contact_email?: string;
  verification_status: string;
  is_active: boolean;
  added_at: string;
  last_updated: string;
};

export type Statistics = {
  total_patients: number;
  total_appointments: number;
  monthly_appointments: number;
  average_rating: number;
  response_time: number;
};

export type ConsultationCosts = {
  government?: {
    faceToFace?: number;
    online?: number;
  };
  private?: {
    faceToFace?: number;
    online?: number;
  };
  effectiveFrom?: string;
};

export type PaymentSettings = {
  remainingAmount: number;
  allowPartialPayments?: boolean;
  consultationFee?: number;
  onlineConsultationFee?: number;
  bookingDeposit?: number;
  depositPercentage?: number;
  lastUpdated?: string;
};

export type Branch = {
  _id: string;
  branch_id: string;
  facility_name: string;
  address: Address;
  phone?: string;
  is_active: boolean;
};

export type MedicalCenter = {
 
  
  distance: null;
  paymentSettings: PaymentSettings | undefined;
  
  _id: string;
  medical_center_id: string;
  facility_name: string;
  facility_type: string;
  company_reg_number: string;
  healthcare_reg_number: string;
  official_domain_email: string;
  phone: string;
  address: Address;
  practitioners: Practitioner[];
  settings: {
    consultationCosts?: ConsultationCosts;
    paymentSettings?: PaymentSettings;
  } | null;
  billing: {
    plan: string;
    status: string;
  };
  statistics: Statistics;
  theme_colors?: {
    primary: string;
    secondary: string;
  };
  verification_status: string;
  is_verified: boolean;
  is_active: boolean;
  parent_center_id: string | null;
  branches: Branch[];
  created_at: string;
  updated_at: string;
  __v: number;
};

export type FilterType = 'all' | 'hospital' | 'clinic' | 'verified' | 'active';

export type PatientInfo = {
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
};

export type EntryState = {
  medicalCenters: MedicalCenter[];
  filteredCenters: MedicalCenter[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  activeFilter: FilterType;
  sortBy: 'name' | 'rating' | 'patients' | 'practitioners';
  patientInfo: PatientInfo | null;
  stats: {
    totalCenters: number;
    totalPractitioners: number;
    verifiedCenters: number;
    activeCenters: number;
    hospitals: number;
    clinics: number;
    averageRating: number;
  };
};

// ==================== INITIAL STATE ====================

const initialState: EntryState = {
  medicalCenters: [],
  filteredCenters: [],
  loading: false,
  error: null,
  searchTerm: '',
  activeFilter: 'all',
  sortBy: 'name',
  patientInfo: null,
  stats: {
    totalCenters: 0,
    totalPractitioners: 0,
    verifiedCenters: 0,
    activeCenters: 0,
    hospitals: 0,
    clinics: 0,
    averageRating: 0,
  },
};

// ==================== HELPER FUNCTIONS ====================

// Format address for display
export const formatAddress = (center: MedicalCenter): string => {
  if (!center?.address) return 'Address not available';
  const addr = center.address;
  const parts = [addr.line1, addr.line2, addr.city, addr.province].filter(
    (part) => part && part.trim() !== ''
  );
  return parts.join(', ') || 'Address not available';
};

// Compute statistics from medical centers
const updateStats = (state: EntryState): EntryState['stats'] => {
  const centers = state.medicalCenters || [];
  const totalPractitioners = centers.reduce(
    (acc, center) => acc + (center?.practitioners?.length || 0),
    0
  );
  const verifiedCenters = centers.filter((c) => c?.is_verified).length;
  const activeCenters = centers.filter((c) => c?.is_active).length;
  const hospitals = centers.filter((c) => c?.facility_type === 'hospital').length;
  const clinics = centers.filter((c) => c?.facility_type === 'clinic').length;
  const totalRating = centers.reduce(
    (acc, center) => acc + (center?.statistics?.average_rating || 0),
    0
  );
  const averageRating = centers.length > 0 ? totalRating / centers.length : 0;

  return {
    totalCenters: centers.length,
    totalPractitioners,
    verifiedCenters,
    activeCenters,
    hospitals,
    clinics,
    averageRating,
  };
};

// Filter and sort centers based on current state
const filterAndSortCenters = (state: EntryState): MedicalCenter[] => {
  let filtered = [...(state.medicalCenters || [])];

  // Apply search filter
  if (state.searchTerm) {
    const term = state.searchTerm.toLowerCase();
    filtered = filtered.filter((center) => {
      if (!center) return false;
      const name = center.facility_name?.toLowerCase() || '';
      const address = formatAddress(center).toLowerCase();
      const type = center.facility_type?.toLowerCase() || '';
      return name.includes(term) || address.includes(term) || type.includes(term);
    });
  }

  // Apply type filter
  switch (state.activeFilter) {
    case 'hospital':
      filtered = filtered.filter((center) => center?.facility_type === 'hospital');
      break;
    case 'clinic':
      filtered = filtered.filter((center) => center?.facility_type === 'clinic');
      break;
    case 'verified':
      filtered = filtered.filter((center) => center?.is_verified);
      break;
    case 'active':
      filtered = filtered.filter((center) => center?.is_active);
      break;
  }

  // Apply sorting
  filtered.sort((a, b) => {
    if (!a || !b) return 0;
    switch (state.sortBy) {
      case 'rating':
        return (b.statistics?.average_rating || 0) - (a.statistics?.average_rating || 0);
      case 'patients':
        return (b.statistics?.total_patients || 0) - (a.statistics?.total_patients || 0);
      case 'practitioners':
        return (b.practitioners?.length || 0) - (a.practitioners?.length || 0);
      case 'name':
      default:
        return (a.facility_name || '').localeCompare(b.facility_name || '');
    }
  });

  return filtered;
};

// ==================== ASYNC THUNKS ====================

export const fetchMedicalCenters = createAsyncThunk(
  'entry/fetchMedicalCenters',
  async (_, { rejectWithValue }) => {
    console.log('🚀 fetchMedicalCenters thunk started');
    try {
      const response = await fetch('https://dmrs.onrender.com/api/medical-centers/all', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        data: MedicalCenter[];
        message?: string;
      };

      console.log('📊 API Response:', {
        success: data.success,
        dataLength: data.data?.length,
        data: data.data,
      });

      if (data.success && Array.isArray(data.data)) {
        const centers = data.data;
        console.log(`✅ Retrieved ${centers.length} medical centers`);

        if (centers.length > 0) {
          localStorage.setItem('medicalCenterId', centers[0]._id);
        }

        return centers;
      } else {
        console.error('❌ Invalid response format:', data);
        return rejectWithValue('Invalid response format');
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Fetch error:', error.message);

      // Check for CORS or network errors
      if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError')
      ) {
        console.error('🌐 Network/CORS error detected');
        return rejectWithValue(
          'Cannot connect to server. Check if backend is running and CORS is configured.'
        );
      }

      return rejectWithValue(error.message || 'Failed to fetch medical centers');
    }
  }
);

export const loadPatientInfo = createAsyncThunk(
  'entry/loadPatientInfo',
  async (): Promise<PatientInfo | null> => {
    try {
      const patientData = localStorage.getItem('patientInfo');
      if (patientData) {
        return JSON.parse(patientData) as PatientInfo;
      }
      return null;
    } catch (error) {
      console.error('Error loading patient info:', error);
      return null;
    }
  }
);

// ==================== SLICE ====================

const entrySlice = createSlice({
  name: 'entry',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
      state.filteredCenters = filterAndSortCenters(state);
    },
    setActiveFilter: (state, action: PayloadAction<FilterType>) => {
      state.activeFilter = action.payload;
      state.filteredCenters = filterAndSortCenters(state);
    },
    setSortBy: (
      state,
      action: PayloadAction<'name' | 'rating' | 'patients' | 'practitioners'>
    ) => {
      state.sortBy = action.payload;
      state.filteredCenters = filterAndSortCenters(state);
    },
    clearFilters: (state) => {
      state.searchTerm = '';
      state.activeFilter = 'all';
      state.filteredCenters = filterAndSortCenters(state);
    },
    logout: (state) => {
      state.patientInfo = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patientInfo');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('medicalCenterId');
        localStorage.removeItem('medicalCentersMap');
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch medical centers
      .addCase(fetchMedicalCenters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMedicalCenters.fulfilled, (state, action) => {
        state.loading = false;
        state.medicalCenters = action.payload || [];
        // Recompute filtered centers and stats
        state.filteredCenters = filterAndSortCenters({
          ...state,
          medicalCenters: action.payload || [],
        });
        state.stats = updateStats(state);
      })
      .addCase(fetchMedicalCenters.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch medical centers';
      })
      // Load patient info
      .addCase(loadPatientInfo.fulfilled, (state, action) => {
        state.patientInfo = action.payload;
      });
  },
});

// ==================== ACTIONS ====================

export const { setSearchTerm, setActiveFilter, setSortBy, clearFilters, logout } =
  entrySlice.actions;

// ==================== SELECTORS ====================

// Define the root state shape for this slice (can be extended in app)
export interface RootStateWithEntry {
  entry: EntryState;
  // Other slices can be added here, but we only need entry for this file
}

// Simple selectors
export const selectMedicalCenters = (state: RootStateWithEntry) =>
  state.entry.medicalCenters;
export const selectFilteredCenters = (state: RootStateWithEntry) =>
  state.entry.filteredCenters;
export const selectLoading = (state: RootStateWithEntry) => state.entry.loading;
export const selectError = (state: RootStateWithEntry) => state.entry.error;
export const selectSearchTerm = (state: RootStateWithEntry) => state.entry.searchTerm;
export const selectActiveFilter = (state: RootStateWithEntry) => state.entry.activeFilter;
export const selectSortBy = (state: RootStateWithEntry) => state.entry.sortBy;
export const selectPatientInfo = (state: RootStateWithEntry) => state.entry.patientInfo;
export const selectStats = (state: RootStateWithEntry) => state.entry.stats;

// ==================== UTILITY FUNCTIONS ====================

export const getInitials = (name: string): string => {
  if (!name) return 'MC';
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 3);
};

export const getSpecialties = (center: MedicalCenter): string[] => {
  if (!center?.practitioners || !Array.isArray(center.practitioners)) return [];
  const specialties: string[] = [];
  center.practitioners.forEach((practitioner) => {
    if (practitioner.specialties && Array.isArray(practitioner.specialties)) {
      practitioner.specialties.forEach((specialty) => {
        if (specialty && !specialties.includes(specialty)) {
          specialties.push(specialty);
        }
      });
    }
  });
  return specialties.slice(0, 5);
};

// ==================== EXPORT ====================

export default entrySlice.reducer;