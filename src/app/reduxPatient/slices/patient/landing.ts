import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dmrs.onrender.com';

// Types - Keep your existing types
export type Address = {
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

export type MedicalCenter = {
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
  settings: any;
  statistics: Statistics;
  billing: any;
  theme_colors?: {
    primary: string;
    secondary: string;
  };
  verification_status: string;
  is_verified: boolean;
  is_active: boolean;
  parent_center_id: string | null;
  branches: any[];
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

// Initial state
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

// Thunks - SIMPLIFIED like your profile slice
export const fetchMedicalCenters = createAsyncThunk(
  'entry/fetchMedicalCenters',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🌐 Fetching medical centers from:', `${BASE_URL}/api/medical-centers/all`);
      
      const response = await axios.get(`${BASE_URL}/api/medical-centers/all`);
      
      console.log('✅ API Response:', {
        success: response.data.success,
        dataLength: response.data.data?.length,
        data: response.data.data
      });
      
      if (response.data.success && Array.isArray(response.data.data)) {
        const centers = response.data.data;
        console.log(`📊 Retrieved ${centers.length} medical centers`);
        return centers;
      } else {
        console.error('❌ Invalid response format:', response.data);
        return rejectWithValue('Invalid response format');
      }
    } catch (error: any) {
      console.error('❌ API Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch medical centers'
      );
    }
  }
);

export const loadPatientInfo = createAsyncThunk(
  'entry/loadPatientInfo',
  async () => {
    try {
      const patientData = localStorage.getItem('patientInfo');
      if (patientData) {
        const parsed = JSON.parse(patientData);
        console.log('👤 Loaded patient info from localStorage:', parsed);
        return parsed;
      }
      console.log('👤 No patient info found in localStorage');
      return null;
    } catch (error) {
      console.error('❌ Error loading patient info:', error);
      return null;
    }
  }
);

// Helper functions (keep them pure)
export const formatAddress = (center: MedicalCenter) => {
  if (!center?.address) return 'Address not available';
  const addr = center.address;
  const parts = [
    addr.line1,
    addr.line2,
    addr.city,
    addr.province
  ].filter(part => part && part.trim() !== '');
  return parts.join(', ') || 'Address not available';
};

export const getInitials = (name: string) => {
  if (!name) return 'MC';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 3);
};

export const getSpecialties = (center: MedicalCenter) => {
  if (!center?.practitioners || !Array.isArray(center.practitioners)) return [];
  const specialties: string[] = [];
  center.practitioners.forEach((practitioner) => {
    if (practitioner.specialties && Array.isArray(practitioner.specialties)) {
      practitioner.specialties.forEach((specialty: string) => {
        if (specialty && !specialties.includes(specialty)) {
          specialties.push(specialty);
        }
      });
    }
  });
  return specialties.slice(0, 5);
};

// Helper to filter and sort centers
const filterAndSortCenters = (
  centers: MedicalCenter[],
  searchTerm: string,
  activeFilter: FilterType,
  sortBy: 'name' | 'rating' | 'patients' | 'practitioners'
): MedicalCenter[] => {
  let filtered = [...centers];

  // Apply search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(center => {
      if (!center) return false;
      
      const name = center.facility_name?.toLowerCase() || '';
      const address = formatAddress(center).toLowerCase();
      const type = center.facility_type?.toLowerCase() || '';
      
      return name.includes(term) || address.includes(term) || type.includes(term);
    });
  }

  // Apply type filter
  switch (activeFilter) {
    case 'hospital':
      filtered = filtered.filter(center => center?.facility_type === 'hospital');
      break;
    case 'clinic':
      filtered = filtered.filter(center => center?.facility_type === 'clinic');
      break;
    case 'verified':
      filtered = filtered.filter(center => center?.is_verified);
      break;
    case 'active':
      filtered = filtered.filter(center => center?.is_active);
      break;
  }

  // Apply sorting
  filtered.sort((a, b) => {
    if (!a || !b) return 0;
    
    switch (sortBy) {
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

// Helper to calculate stats
const calculateStats = (centers: MedicalCenter[]) => {
  const totalPractitioners = centers.reduce((acc, center) => 
    acc + (center?.practitioners?.length || 0), 0);
  const verifiedCenters = centers.filter(c => c?.is_verified).length;
  const activeCenters = centers.filter(c => c?.is_active).length;
  const hospitals = centers.filter(c => c?.facility_type === 'hospital').length;
  const clinics = centers.filter(c => c?.facility_type === 'clinic').length;
  const totalRating = centers.reduce((acc, center) => 
    acc + (center?.statistics?.average_rating || 0), 0);
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

// Slice
const entrySlice = createSlice({
  name: 'entry',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
      state.filteredCenters = filterAndSortCenters(
        state.medicalCenters,
        action.payload,
        state.activeFilter,
        state.sortBy
      );
    },
    setActiveFilter: (state, action: PayloadAction<FilterType>) => {
      state.activeFilter = action.payload;
      state.filteredCenters = filterAndSortCenters(
        state.medicalCenters,
        state.searchTerm,
        action.payload,
        state.sortBy
      );
    },
    setSortBy: (state, action: PayloadAction<'name' | 'rating' | 'patients' | 'practitioners'>) => {
      state.sortBy = action.payload;
      state.filteredCenters = filterAndSortCenters(
        state.medicalCenters,
        state.searchTerm,
        state.activeFilter,
        action.payload
      );
    },
    clearFilters: (state) => {
      state.searchTerm = '';
      state.activeFilter = 'all';
      state.filteredCenters = filterAndSortCenters(
        state.medicalCenters,
        '',
        'all',
        state.sortBy
      );
    },
    logout: (state) => {
      state.patientInfo = null;
      state.medicalCenters = [];
      state.filteredCenters = [];
      localStorage.removeItem('patientToken');
      localStorage.removeItem('patientInfo');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('medicalCenterId');
      localStorage.removeItem('medicalCentersMap');
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
        console.log('✅ fetchMedicalCenters.fulfilled:', {
          payloadLength: action.payload?.length,
          payloadType: typeof action.payload
        });
        
        state.loading = false;
        state.medicalCenters = action.payload || [];
        
        // Recalculate filtered centers
        state.filteredCenters = filterAndSortCenters(
          state.medicalCenters,
          state.searchTerm,
          state.activeFilter,
          state.sortBy
        );
        
        // Calculate stats
        state.stats = calculateStats(state.medicalCenters);
        
        console.log('📊 Updated state:', {
          medicalCentersCount: state.medicalCenters.length,
          filteredCentersCount: state.filteredCenters.length,
          stats: state.stats
        });
      })
      .addCase(fetchMedicalCenters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch medical centers';
        console.error('❌ fetchMedicalCenters.rejected:', action.payload);
      })
      
      // Load patient info
      .addCase(loadPatientInfo.fulfilled, (state, action) => {
        state.patientInfo = action.payload;
        console.log('👤 Patient info loaded in Redux:', action.payload);
      })
      .addCase(loadPatientInfo.rejected, (state) => {
        state.patientInfo = null;
      });
  },
});

// Export actions
export const { setSearchTerm, setActiveFilter, setSortBy, clearFilters, logout } = entrySlice.actions;

// Export selectors - SIMPLIFIED with fallbacks
export const selectMedicalCenters = (state: any) => state.entry?.medicalCenters || [];
export const selectFilteredCenters = (state: any) => state.entry?.filteredCenters || [];
export const selectLoading = (state: any) => state.entry?.loading || false;
export const selectError = (state: any) => state.entry?.error || null;
export const selectSearchTerm = (state: any) => state.entry?.searchTerm || '';
export const selectActiveFilter = (state: any) => state.entry?.activeFilter || 'all';
export const selectSortBy = (state: any) => state.entry?.sortBy || 'name';
export const selectPatientInfo = (state: any) => state.profile?.patientInfo || null;
export const selectStats = (state: any) => state.entry?.stats || initialState.stats;

export default entrySlice.reducer;