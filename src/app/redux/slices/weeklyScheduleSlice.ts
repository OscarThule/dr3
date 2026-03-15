// weeklyScheduleSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import {
  Session,
  LunchBreak,
  DayHours,
  DefaultHours,
  DefaultOperationalHours,
  DayOfWeek,
  SessionType,
  UpdateDefaultHoursPayload,
  UpdateLunchBreakPayload
} from '@/app/(medical-center)/weekly-schedules/types';

// =========================
//    INTERFACE EXTENSIONS
// =========================

interface WeeklyScheduleState {
  schedules: any[];
  currentSchedule: any | null;
  defaultHours: DefaultHours;
  defaultOperationalHours: DefaultOperationalHours | null;
  loading: boolean;
  error: string | null;
  success: string | null;
  selectedWeek: { type: 'next' | 'weekAfterNext' | 'thirdWeek' } | null;
}

// =========================
//    INITIAL STATE
// =========================

const initialState: WeeklyScheduleState = {
  schedules: [],
  currentSchedule: null,
  defaultHours: {} as DefaultHours,
  defaultOperationalHours: null,
  loading: false,
  error: null,
  success: null,
  selectedWeek: null,
};

// =========================
//    AXIOS INSTANCE
// =========================

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://dmrs.onrender.com/api',
  timeout: 10000,
});

// Automatically attach token to weekly schedule requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// =========================
//    ASYNC THUNKS
// =========================

// GET default operational hours
export const getDefaultOperationalHours = createAsyncThunk(
  'weeklySchedule/getDefaultOperationalHours',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/default-operational-hours');
      return response.data as DefaultOperationalHours;
    } catch (error: unknown) {
      let errorMessage = 'Failed to fetch default operational hours';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      return rejectWithValue(errorMessage);
    }
  }
);

// UPDATE default operational hours
export const updateDefaultOperationalHours = createAsyncThunk(
  'weeklySchedule/updateDefaultOperationalHours',
  async (
    defaultHoursData: { defaultHours: DefaultHours; slotDuration?: number; bufferTime?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put('/default-operational-hours', defaultHoursData);
      return response.data as DefaultOperationalHours;
    } catch (error: unknown) {
      let errorMessage = 'Failed to update default operational hours';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      return rejectWithValue(errorMessage);
    }
  }
);

// RESET default operational hours
export const resetDefaultOperationalHours = createAsyncThunk(
  'weeklySchedule/resetDefaultOperationalHours',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/default-operational-hours/reset');
      return response.data as DefaultOperationalHours;
    } catch (error: unknown) {
      let errorMessage = 'Failed to reset default operational hours';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      return rejectWithValue(errorMessage);
    }
  }
);

// =========================
//    SLICE
// =========================

const weeklyScheduleSlice = createSlice({
  name: 'weeklySchedule',
  initialState,
  reducers: {
    setSelectedWeek: (state, action: PayloadAction<{ type: 'next' | 'weekAfterNext' | 'thirdWeek' } | null>) => {
      state.selectedWeek = action.payload;
    },

    setDefaultHours: (state, action: PayloadAction<DefaultHours>) => {
      state.defaultHours = action.payload;
    },

    updateDefaultHours: (state, action: PayloadAction<UpdateDefaultHoursPayload>) => {
      const { day, session, field, value } = action.payload;

      // Initialize day if it doesn't exist
      if (!state.defaultHours[day]) {
        state.defaultHours[day] = {
          morning: { start: '', end: '', enabled: false },
          afternoon: { start: '', end: '', enabled: false },
          night: { start: '', end: '', enabled: false },
          lunches: [],
          nightLunches: [],
        };
      }

      // Type-safe update using a type guard
      const sessionObj = state.defaultHours[day][session];
      
      if (field === 'start' || field === 'end') {
        // For string fields
        sessionObj[field] = value as string;
      } else if (field === 'enabled') {
        // For boolean field
        sessionObj[field] = value as boolean;
      }
    },

    addLunchBreak: (state, action: PayloadAction<{ day: DayOfWeek; isNight: boolean }>) => {
      const { day, isNight } = action.payload;

      // Initialize day if it doesn't exist
      if (!state.defaultHours[day]) {
        state.defaultHours[day] = {
          morning: { start: '', end: '', enabled: false },
          afternoon: { start: '', end: '', enabled: false },
          night: { start: '', end: '', enabled: false },
          lunches: [],
          nightLunches: [],
        };
      }

      const newLunch: LunchBreak = {
        id: `lunch-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        start: isNight ? '20:00' : '12:00',
        end: isNight ? '21:00' : '13:00',
        reason: isNight ? 'Night Staff Break' : 'Additional Lunch Break',
        duration: 60,
        enabled: true,
        recurring: false,
        affectedStaff: [],
      };

      if (isNight) {
        state.defaultHours[day].nightLunches.push(newLunch);
      } else {
        state.defaultHours[day].lunches.push(newLunch);
      }
    },

    updateLunchBreak: (state, action: PayloadAction<UpdateLunchBreakPayload>) => {
      const { day, lunchId, updates, isNight } = action.payload;

      if (state.defaultHours[day]) {
        const lunchArray = isNight ? state.defaultHours[day].nightLunches : state.defaultHours[day].lunches;
        const index = lunchArray.findIndex(lunch => lunch.id === lunchId);
        if (index !== -1) {
          lunchArray[index] = {
            ...lunchArray[index],
            ...updates,
          };
        }
      }
    },

    removeLunchBreak: (state, action: PayloadAction<{ day: DayOfWeek; lunchId: string; isNight: boolean }>) => {
      const { day, lunchId, isNight } = action.payload;

      if (state.defaultHours[day]) {
        if (isNight) {
          state.defaultHours[day].nightLunches = state.defaultHours[day].nightLunches.filter(
            lunch => lunch.id !== lunchId
          );
        } else {
          state.defaultHours[day].lunches = state.defaultHours[day].lunches.filter(
            lunch => lunch.id !== lunchId
          );
        }
      }
    },

    clearError: (state) => {
      state.error = null;
    },

    clearSuccess: (state) => {
      state.success = null;
    },

    initializeWithTemplate: (state) => {
      const templateDefaultHours: DefaultHours = {
        monday: { 
          morning: { start: '08:00', end: '12:00', enabled: true }, 
          afternoon: { start: '13:00', end: '17:00', enabled: true }, 
          night: { start: '18:00', end: '22:00', enabled: false }, 
          lunches: [{ 
            id: 'lunch-1', 
            start: '12:00', 
            end: '13:00', 
            reason: 'Lunch Break', 
            duration: 60, 
            enabled: true, 
            recurring: true, 
            affectedStaff: [] 
          }], 
          nightLunches: [] 
        },
        tuesday: { 
          morning: { start: '08:00', end: '12:00', enabled: true }, 
          afternoon: { start: '13:00', end: '17:00', enabled: true }, 
          night: { start: '18:00', end: '22:00', enabled: false }, 
          lunches: [{ 
            id: 'lunch-1', 
            start: '12:00', 
            end: '13:00', 
            reason: 'Lunch Break', 
            duration: 60, 
            enabled: true, 
            recurring: true, 
            affectedStaff: [] 
          }], 
          nightLunches: [] 
        },
        wednesday: { 
          morning: { start: '08:00', end: '12:00', enabled: true }, 
          afternoon: { start: '13:00', end: '17:00', enabled: true }, 
          night: { start: '18:00', end: '22:00', enabled: false }, 
          lunches: [{ 
            id: 'lunch-1', 
            start: '12:00', 
            end: '13:00', 
            reason: 'Lunch Break', 
            duration: 60, 
            enabled: true, 
            recurring: true, 
            affectedStaff: [] 
          }], 
          nightLunches: [] 
        },
        thursday: { 
          morning: { start: '08:00', end: '12:00', enabled: true }, 
          afternoon: { start: '13:00', end: '17:00', enabled: true }, 
          night: { start: '18:00', end: '22:00', enabled: false }, 
          lunches: [{ 
            id: 'lunch-1', 
            start: '12:00', 
            end: '13:00', 
            reason: 'Lunch Break', 
            duration: 60, 
            enabled: true, 
            recurring: true, 
            affectedStaff: [] 
          }], 
          nightLunches: [] 
        },
        friday: { 
          morning: { start: '08:00', end: '12:00', enabled: true }, 
          afternoon: { start: '13:00', end: '17:00', enabled: true }, 
          night: { start: '18:00', end: '22:00', enabled: false }, 
          lunches: [{ 
            id: 'lunch-1', 
            start: '12:00', 
            end: '13:00', 
            reason: 'Lunch Break', 
            duration: 60, 
            enabled: true, 
            recurring: true, 
            affectedStaff: [] 
          }], 
          nightLunches: [] 
        },
        saturday: { 
          morning: { start: '09:00', end: '13:00', enabled: true }, 
          afternoon: { start: '14:00', end: '18:00', enabled: true }, 
          night: { start: '19:00', end: '22:00', enabled: false }, 
          lunches: [{ 
            id: 'lunch-1', 
            start: '13:00', 
            end: '14:00', 
            reason: 'Lunch Break', 
            duration: 60, 
            enabled: true, 
            recurring: true, 
            affectedStaff: [] 
          }], 
          nightLunches: [] 
        },
        sunday: { 
          morning: { start: '10:00', end: '14:00', enabled: false }, 
          afternoon: { start: '15:00', end: '19:00', enabled: false }, 
          night: { start: '20:00', end: '23:00', enabled: false }, 
          lunches: [], 
          nightLunches: [] 
        },
      };

      state.defaultHours = templateDefaultHours;
    },
  },

  extraReducers: (builder) => {
    builder
      // GET
      .addCase(getDefaultOperationalHours.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDefaultOperationalHours.fulfilled, (state, action) => {
        state.loading = false;
        state.defaultOperationalHours = action.payload;
        state.defaultHours = action.payload.defaultHours;
        state.success = 'Default hours loaded successfully';
      })
      .addCase(getDefaultOperationalHours.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // UPDATE
      .addCase(updateDefaultOperationalHours.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDefaultOperationalHours.fulfilled, (state, action) => {
        state.loading = false;
        state.defaultOperationalHours = action.payload;
        state.defaultHours = action.payload.defaultHours;
        state.success = 'Default hours saved successfully';
      })
      .addCase(updateDefaultOperationalHours.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // RESET
      .addCase(resetDefaultOperationalHours.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetDefaultOperationalHours.fulfilled, (state, action) => {
        state.loading = false;
        state.defaultOperationalHours = action.payload;
        state.defaultHours = action.payload.defaultHours;
        state.success = 'Default hours reset successfully';
      })
      .addCase(resetDefaultOperationalHours.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setSelectedWeek,
  setDefaultHours,
  updateDefaultHours,
  addLunchBreak,
  updateLunchBreak,
  removeLunchBreak,
  clearError,
  clearSuccess,
  initializeWithTemplate,
} = weeklyScheduleSlice.actions;

export default weeklyScheduleSlice.reducer;