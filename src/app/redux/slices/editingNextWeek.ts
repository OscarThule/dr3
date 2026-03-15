import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { ReactNode } from 'react';

// ============ REAL-TIME CONSTANTS ============
const ROLLING_WINDOW_DAYS = 21;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// ============ TYPES ============
export interface DoctorAssignment {
  id: string;
  userId: string | boolean;
  doctorId: string;
  doctorName: string;
  consultationType: 'face-to-face' | 'telemedicine' | 'procedure';
  specialization: string[];
  maxPatients: number;
  currentPatients: number;
  isAvailable: boolean;
  colorCode: string;
  priority?: 'normal' | 'urgent' | 'emergency';
  notes?: string;
  assignedAt?: string;
  isBooked?: boolean;
  specializations?: string[];
}

export interface TimeSlot {
  id: string;
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  startDisplay: string;
  endDisplay: string;
  capacity: number;
  assignedDoctors: DoctorAssignment[];
  availableCapacity: number;
  type: 'working' | 'night-shift' | 'regular' | 'emergency' | 'procedure';
  slotType: string;
  duration: number;
  isShifted?: boolean;
  originalTiming?: { startTime: string; endTime: string };
  shiftedFrom?: string;
  isPeakHour?: boolean;
  specialization?: string;
  specializations?: string[];
  consultationType?: string;
  bufferTime?: number;
  priority?: 'normal' | 'urgent' | 'emergency';
  tags?: string[];
  isAvailable?: boolean;
  isPast?: boolean;
  isActive?: boolean;
  isFuture?: boolean;
}

export interface LunchBreak {
  id: string;
  start: ReactNode;
  end: ReactNode;
  startTime: string;
  endTime: string;
  startDisplay: string;
  endDisplay: string;
  reason: string;
  duration: number;
  enabled: boolean;
  recurring: boolean;
  affectedStaff: string[];
  type: 'lunch' | 'night-lunch';
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  start: string;
  end: string;
  enabled: boolean;
}

export interface DailySchedule {
  _id?: string;
  date: string;
  dateDisplay: string;
  dayName: string;
  dayOfWeek: number;
  isWorking: boolean;
  is24Hours: boolean;
  isPast?: boolean;
  isToday?: boolean;
  isFuture?: boolean;
  timeSlots: TimeSlot[];
  lunchBreaks: LunchBreak[];
  sessions: {
    morning: Session;
    afternoon: Session;
    night: Session;
  };
  totalCapacity: number;
  bookedSlots: number;
  assignedDoctors: string[];
  availableSpecializations: string[];
  defaultSlotCapacity: number;
  slotDuration: number;
  bufferTime: number;
  maxDoctorsPerSlot: number;
  isReadOnly: boolean;
}

export interface DefaultDoctor {
  doctorId: string;
  doctorName: string;
  specializations: string[];
  defaultSlots: any[];
  availability: Record<string, any>;
  color: string;
}

export interface HistoricalDay {
  date: string;
  dateDisplay: string;
  dailySchedule: DailySchedule;
  archivedAt: string;
  isReadOnly: boolean;
}

export interface RollingSchedule {
  _id: string;
  schedule_id: string;
  medical_center_id: string;
  windowStart: string;
  windowEnd: string;
  lastRolledAt: string;
  nextRollAt: string;
  dailySchedules: DailySchedule[];
  historicalDays: HistoricalDay[];
  assignedDoctors: string[];
  isActive: boolean;
  defaultDoctors: DefaultDoctor[];
  slotDuration: number;
  bufferTime: number;
  maxDoctorsPerSlot: number;
  defaultSlotCapacity: number;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
  createdAt: string;
  autoRollEnabled: boolean;
  lastAutoCheck: string;
}

export interface WindowInfo {
  start: string;
  end: string;
  totalDays: number;
  today: string;
  now: string;
  nextRollAt: string;
}

export interface RollingScheduleResponse {
  success: boolean;
  data: RollingSchedule;
  windowInfo: WindowInfo;
}

export interface EditingNextWeekState {
  // Current rolling schedule
  rollingSchedule: RollingSchedule | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  success: string | null;
  
  // Settings
  settings: {
    slotDuration: number;
    bufferTime: number;
    maxDoctorsPerSlot: number;
    defaultSlotCapacity: number;
    enableEmergencyMode: boolean;
    enableNightShift: boolean;
    lunchDuration: number;
    nightLunchDuration: number;
    enableSpecializationFilter: boolean;
    enableContinuousNightShift: boolean;
    autoRollEnabled: boolean;
  };
  
  // UI state
  selectedDate: string | null;
  selectedSlot: { date: string; slotIndex: number } | null;
  activeTab: 'schedule' | 'doctors' | 'settings' | 'lunch' | 'assignments';
  
  // Window info
  windowInfo: WindowInfo | null;
  
  // New state for week management
  activeWeek: number | null;
  
  // Loading states
  isSaving: boolean;
  isRolling: boolean;
  
  // Real-time state
  currentTime: string;
  lastUpdated: string;
}

// API configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://dmrs.onrender.com/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor for auth
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

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const initialState: EditingNextWeekState = {
  rollingSchedule: null,
  isLoading: false,
  error: null,
  success: null,
  settings: {
    slotDuration: 30,
    bufferTime: 5,
    maxDoctorsPerSlot: 100,
    defaultSlotCapacity: 0,
    enableEmergencyMode: true,
    enableNightShift: true,
    lunchDuration: 60,
    nightLunchDuration: 45,
    enableSpecializationFilter: true,
    enableContinuousNightShift: true,
    autoRollEnabled: true
  },
  selectedDate: null,
  selectedSlot: null,
  activeTab: 'schedule',
  windowInfo: null,
  activeWeek: null,
  isSaving: false,
  isRolling: false,
  currentTime: new Date().toISOString(),
  lastUpdated: new Date().toISOString()
};

// ============ REAL-TIME HELPER FUNCTIONS ============
export const getCurrentTime = (): string => new Date().toISOString();

export const normalizeDate = (dateString: string): string => {
  // Extract YYYY-MM-DD from ISO string
  return dateString.split('T')[0];
};

export const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric' 
  });
};

export const formatTimeForDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const isDateInCurrentWindow = (
  dateString: string,
  windowInfo: WindowInfo | null
): boolean => {
  if (!windowInfo) return false;
  
  const date = normalizeDate(dateString);
  const windowStart = normalizeDate(windowInfo.start);
  const windowEnd = normalizeDate(windowInfo.end);
  
  return date >= windowStart && date < windowEnd;
};

export const isPastDate = (dateString: string, nowISO: string): boolean => {
  return normalizeDate(dateString) < normalizeDate(nowISO);
};

export const isToday = (dateString: string): boolean => {
  const today = normalizeDate(getCurrentTime());
  const targetDate = normalizeDate(dateString);
  return today === targetDate;
};

export const generateDoctorColor = (doctorId: string): string => {
  const colors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
    '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1'
  ];
  let hash = 0;
  for (let i = 0; i < doctorId.length; i++) {
    hash = doctorId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const getSlotStatus = (slot: TimeSlot): 'past' | 'active' | 'future' => {
  const now = new Date();
  const slotStart = new Date(slot.startTime);
  const slotEnd = new Date(slot.endTime);
  
  if (slotEnd < now) return 'past';
  if (slotStart <= now && slotEnd > now) return 'active';
  return 'future';
};

export const getDayStatus = (
  dateString: string,
  nowISO: string
): 'past' | 'today' | 'future' => {
  const d = normalizeDate(dateString);
  const today = normalizeDate(nowISO);

  if (d < today) return 'past';
  if (d === today) return 'today';
  return 'future';
};

// ============ ASYNC THUNKS ============
export const getRollingWindow = createAsyncThunk(
  'editingNextWeek/getRollingWindow',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/editing-schedules/rolling-window');
      return {
        ...response.data as RollingScheduleResponse,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch rolling window schedule');
    }
  }
);

export const checkAndRollWindow = createAsyncThunk(
  'editingNextWeek/checkAndRollWindow',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/editing-schedules/check-roll');
      return {
        ...response.data as RollingScheduleResponse,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to check and roll window');
    }
  }
);

export const saveSchedule = createAsyncThunk(
  'editingNextWeek/saveSchedule',
  async ({ 
    scheduleId, 
    schedule 
  }: { 
    scheduleId: string; 
    schedule: RollingSchedule 
  }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/editing-schedules/${scheduleId}`, {
        ...schedule,
        lastUpdated: getCurrentTime()
      });
      return {
        ...response.data,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to save schedule');
    }
  }
);

export const updateDailySchedule = createAsyncThunk(
  'editingNextWeek/updateDailySchedule',
  async ({ 
    scheduleId, 
    date, 
    updates 
  }: { 
    scheduleId: string; 
    date: string; 
    updates: Partial<DailySchedule> 
  }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/editing-schedules/${scheduleId}/daily/${normalizeDate(date)}`, {
        ...updates,
        updatedAt: getCurrentTime()
      });
      return {
        date: normalizeDate(date),
        dailySchedule: response.data.data,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update daily schedule');
    }
  }
);

export const assignDoctorToSlot = createAsyncThunk(
  'editingNextWeek/assignDoctorToSlot',
  async ({ 
    scheduleId, 
    date, 
    slotIndex, 
    doctorId,
    doctorName,
    maxPatients = 1,
    specialization = ['general']
  }: {
    scheduleId: string;
    date: string;
    slotIndex: number;
    doctorId: string;
    doctorName?: string;
    maxPatients?: number;
    specialization?: string[];
  }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/editing-schedules/${scheduleId}/assign-doctor/${normalizeDate(date)}`,
        {
          slotIndex,
          doctorId,
          doctorName,
          maxPatients,
          specialization,
          assignedAt: getCurrentTime()
        }
      );
      
      return {
        date: normalizeDate(date),
        data: response.data,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign doctor to slot');
    }
  }
);

export const removeDoctorFromSlot = createAsyncThunk(
  'editingNextWeek/removeDoctorFromSlot',
  async ({ 
    scheduleId, 
    date,
    slotIndex,
    doctorId
  }: {
    scheduleId: string;
    date: string;
    slotIndex: number;
    doctorId: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/editing-schedules/${scheduleId}/remove-doctor/${normalizeDate(date)}`,
        { 
          slotIndex,
          doctorId,
          removedAt: getCurrentTime()
        }
      );
      
      return {
        date: normalizeDate(date),
        data: response.data,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove doctor from slot');
    }
  }
);

export const updateSlotDuration = createAsyncThunk(
  'editingNextWeek/updateSlotDuration',
  async ({
    scheduleId,
    date,
    slotDuration
  }: {
    scheduleId: string;
    date: string;
    slotDuration: number;
  }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/editing-schedules/${scheduleId}/slot-duration/${normalizeDate(date)}`, {
        slotDuration,
        updatedAt: getCurrentTime()
      });
      
      return {
        date: normalizeDate(date),
        dailySchedule: response.data.data,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update slot duration');
    }
  }
);

export const addLunchBreak = createAsyncThunk(
  'editingNextWeek/addLunchBreak',
  async ({
    scheduleId,
    date,
    lunchBreak
  }: {
    scheduleId: string;
    date: string;
    lunchBreak: Partial<LunchBreak>;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/editing-schedules/${scheduleId}/lunch-break/${normalizeDate(date)}`, {
        ...lunchBreak,
        createdAt: getCurrentTime()
      });
      return {
        date: normalizeDate(date),
        dailySchedule: response.data.data,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add lunch break');
    }
  }
);

export const removeLunchBreak = createAsyncThunk(
  'editingNextWeek/removeLunchBreak',
  async ({
    scheduleId,
    date,
    breakId
  }: {
    scheduleId: string;
    date: string;
    breakId: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/editing-schedules/${scheduleId}/remove-lunch-break/${normalizeDate(date)}`, {
        breakId,
        removedAt: getCurrentTime()
      });
      return {
        date: normalizeDate(date),
        dailySchedule: response.data.data,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove lunch break');
    }
  }
);

export const updateSession = createAsyncThunk(
  'editingNextWeek/updateSession',
  async ({
    scheduleId,
    date,
    sessionKey,
    updates
  }: {
    scheduleId: string;
    date: string;
    sessionKey: 'morning' | 'afternoon' | 'night';
    updates: Partial<Session>;
  }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/editing-schedules/${scheduleId}/session/${normalizeDate(date)}`, {
        sessionKey,
        updates,
        updatedAt: getCurrentTime()
      });
      return {
        date: normalizeDate(date),
        dailySchedule: response.data.data,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update session');
    }
  }
);

export const toggleWorkingDay = createAsyncThunk(
  'editingNextWeek/toggleWorkingDay',
  async ({
    scheduleId,
    date,
    isWorking
  }: {
    scheduleId: string;
    date: string;
    isWorking: boolean;
  }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/editing-schedules/${scheduleId}/toggle-working/${normalizeDate(date)}`, {
        isWorking,
        updatedAt: getCurrentTime()
      });
      return {
        date: normalizeDate(date),
        dailySchedule: response.data.data,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle working day');
    }
  }
);

export const toggleAutoRoll = createAsyncThunk(
  'editingNextWeek/toggleAutoRoll',
  async ({
    scheduleId,
    autoRollEnabled
  }: {
    scheduleId: string;
    autoRollEnabled: boolean;
  }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/editing-schedules/${scheduleId}/auto-roll`, {
        autoRollEnabled,
        updatedAt: getCurrentTime()
      });
      return {
        data: response.data,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle auto-roll');
    }
  }
);

export const getDoctorAssignments = createAsyncThunk(
  'editingNextWeek/getDoctorAssignments',
  async (scheduleId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/editing-schedules/${scheduleId}/doctor-assignments`, {
        params: { timestamp: getCurrentTime() }
      });
      return {
        data: response.data.data || [],
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch doctor assignments');
    }
  }
);

export const rollWindow = createAsyncThunk(
  'editingNextWeek/rollWindow',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/editing-schedules/roll-window', {
        timestamp: getCurrentTime()
      });
      return {
        ...response.data as RollingScheduleResponse,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to roll window');
    }
  }
);

export const refreshSchedule = createAsyncThunk(
  'editingNextWeek/refreshSchedule',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/editing-schedules/refresh', {
        params: { timestamp: getCurrentTime() }
      });
      return {
        ...response.data as RollingScheduleResponse,
        timestamp: getCurrentTime()
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to refresh schedule');
    }
  }
);

// ============ SLICE ============
const editingNextWeekSlice = createSlice({
  name: 'editingNextWeek',
  initialState,
  reducers: {
    // Update rolling schedule directly
    updateRollingSchedule: (state, action: PayloadAction<Partial<RollingSchedule> | RollingSchedule>) => {
      if (state.rollingSchedule) {
        state.rollingSchedule = {
          ...state.rollingSchedule,
          ...action.payload,
          updatedAt: getCurrentTime()
        };
      } else if ('dailySchedules' in action.payload) {
        state.rollingSchedule = {
          ...action.payload as RollingSchedule,
          updatedAt: getCurrentTime()
        };
      }
      state.lastUpdated = getCurrentTime();
    },
    
    // Update a specific day in the schedule
    updateDayInSchedule: (state, action: PayloadAction<{
      date: string;
      updates: Partial<DailySchedule>;
    }>) => {
      const { date, updates } = action.payload;
      const normalizedDate = normalizeDate(date);
      
      if (state.rollingSchedule) {
        const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
          day => normalizeDate(day.date) === normalizedDate
        );
        
        if (dayIndex !== -1) {
          state.rollingSchedule.dailySchedules[dayIndex] = {
            ...state.rollingSchedule.dailySchedules[dayIndex],
            ...updates
          };
        }
      }
      state.lastUpdated = getCurrentTime();
    },
    
    // Assign doctor to slot (synchronous)
    assignDoctorToSlotSync: (state, action: PayloadAction<{
      date: string;
      slotIndex: number;
      doctorId: string;
      doctorName: string;
      specialization?: string[];
      maxPatients?: number;
    }>) => {
      const { date, slotIndex, doctorId, doctorName, specialization, maxPatients } = action.payload;
      const normalizedDate = normalizeDate(date);
      
      if (state.rollingSchedule) {
        const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
          day => normalizeDate(day.date) === normalizedDate
        );
        
        if (dayIndex !== -1 && state.rollingSchedule.dailySchedules[dayIndex].timeSlots[slotIndex]) {
          const slot = state.rollingSchedule.dailySchedules[dayIndex].timeSlots[slotIndex];
          
          // Check if doctor already assigned
          if (!slot.assignedDoctors.some(d => d.doctorId === doctorId)) {
            const assignedDoctor: DoctorAssignment = {
              id: doctorId,
              doctorId,
              doctorName,
              consultationType: 'face-to-face',
              specialization: specialization || ['general'],
              maxPatients: maxPatients || 1,
              currentPatients: 0,
              isAvailable: true,
              colorCode: generateDoctorColor(doctorId),
              assignedAt: getCurrentTime(),
              userId: false,
              isBooked: false
            };
            
            // Add doctor to slot
            slot.assignedDoctors.push(assignedDoctor);
            
            // Update slot capacity
            slot.availableCapacity = Math.max(
              0,
              slot.capacity - slot.assignedDoctors.reduce((sum, d) => sum + (d.maxPatients ?? 0), 0)
            );
            
            // Update slot status
            const now = new Date();
            const slotStart = new Date(slot.startTime);
            const slotEnd = new Date(slot.endTime);
            slot.isPast = slotEnd < now;
            slot.isActive = slotStart <= now && slotEnd > now;
            slot.isFuture = slotStart > now;
            
            // Update day statistics
            const day = state.rollingSchedule.dailySchedules[dayIndex];
            day.bookedSlots = day.timeSlots.filter(s => s.assignedDoctors.length > 0).length;
            day.assignedDoctors = Array.from(new Set(
              day.timeSlots.flatMap(s => s.assignedDoctors.map(d => d.doctorId))
            ));
            
            // Update day status
            const dayEnd = new Date(day.date);
            dayEnd.setDate(dayEnd.getDate() + 1);
            const nowDate = new Date();
            day.isPast = dayEnd < nowDate;
            day.isToday = new Date(day.date) <= nowDate && dayEnd > nowDate;
            day.isFuture = new Date(day.date) > nowDate;
            
            // Update schedule assigned doctors
            state.rollingSchedule.assignedDoctors = Array.from(new Set([
              ...state.rollingSchedule.assignedDoctors,
              doctorId
            ]));
          }
        }
      }
      state.lastUpdated = getCurrentTime();
    },
    
    // Remove doctor from slot (synchronous)
    removeDoctorFromSlotSync: (state, action: PayloadAction<{
      date: string;
      slotIndex: number;
      doctorId: string;
    }>) => {
      const { date, slotIndex, doctorId } = action.payload;
      const normalizedDate = normalizeDate(date);
      
      if (state.rollingSchedule) {
        const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
          day => normalizeDate(day.date) === normalizedDate
        );
        
        if (dayIndex !== -1 && state.rollingSchedule.dailySchedules[dayIndex].timeSlots[slotIndex]) {
          const slot = state.rollingSchedule.dailySchedules[dayIndex].timeSlots[slotIndex];
          
          // Remove doctor
          slot.assignedDoctors = slot.assignedDoctors.filter(doc => doc.doctorId !== doctorId);
          
          // Update slot capacity
          slot.availableCapacity = Math.max(
            0,
            slot.capacity - slot.assignedDoctors.reduce((sum, d) => sum + (d.maxPatients ?? 0), 0)
          );
          
          // Update day statistics
          const day = state.rollingSchedule.dailySchedules[dayIndex];
          day.bookedSlots = day.timeSlots.filter(s => s.assignedDoctors.length > 0).length;
          day.assignedDoctors = Array.from(new Set(
            day.timeSlots.flatMap(s => s.assignedDoctors.map(d => d.doctorId))
          ));
          
          // Update schedule assigned doctors
          const allDoctorIds = state.rollingSchedule.dailySchedules.flatMap(day => 
            day.timeSlots.flatMap(slot => slot.assignedDoctors.map(doc => doc.doctorId))
          );
          state.rollingSchedule.assignedDoctors = Array.from(new Set(allDoctorIds));
        }
      }
      state.lastUpdated = getCurrentTime();
    },
    
    // Update a specific time slot
    updateSlotSync: (state, action: PayloadAction<{
      date: string;
      slotIndex: number;
      updates: Partial<TimeSlot>;
    }>) => {
      const { date, slotIndex, updates } = action.payload;
      const normalizedDate = normalizeDate(date);
      
      if (state.rollingSchedule) {
        const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
          day => normalizeDate(day.date) === normalizedDate
        );
        
        if (dayIndex !== -1 && state.rollingSchedule.dailySchedules[dayIndex].timeSlots[slotIndex]) {
          const slot = state.rollingSchedule.dailySchedules[dayIndex].timeSlots[slotIndex];
          
          state.rollingSchedule.dailySchedules[dayIndex].timeSlots[slotIndex] = {
            ...slot,
            ...updates
          };
          
          // Recalculate day totals if capacity changed
          if (updates.capacity !== undefined) {
            const day = state.rollingSchedule.dailySchedules[dayIndex];
            day.totalCapacity = day.timeSlots.reduce((sum, s) => sum + s.capacity, 0);
          }
        }
      }
      state.lastUpdated = getCurrentTime();
    },
    
    // Update a session (morning/afternoon/night)
    updateSessionSync: (state, action: PayloadAction<{
      date: string;
      sessionKey: 'morning' | 'afternoon' | 'night';
      updates: Partial<Session>;
    }>) => {
      const { date, sessionKey, updates } = action.payload;
      const normalizedDate = normalizeDate(date);
      
      if (state.rollingSchedule) {
        const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
          day => normalizeDate(day.date) === normalizedDate
        );
        
        if (dayIndex !== -1 && state.rollingSchedule.dailySchedules[dayIndex].sessions) {
          state.rollingSchedule.dailySchedules[dayIndex].sessions[sessionKey] = {
            ...state.rollingSchedule.dailySchedules[dayIndex].sessions[sessionKey],
            ...updates
          };
        }
      }
      state.lastUpdated = getCurrentTime();
    },
    
    // Add a lunch break
    addLunchBreakSync: (state, action: PayloadAction<{
      date: string;
      lunchBreak: LunchBreak;
    }>) => {
      const { date, lunchBreak } = action.payload;
      const normalizedDate = normalizeDate(date);
      
      if (state.rollingSchedule) {
        const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
          day => normalizeDate(day.date) === normalizedDate
        );
        
        if (dayIndex !== -1) {
          if (!state.rollingSchedule.dailySchedules[dayIndex].lunchBreaks) {
            state.rollingSchedule.dailySchedules[dayIndex].lunchBreaks = [];
          }
          
          state.rollingSchedule.dailySchedules[dayIndex].lunchBreaks.push({
            ...lunchBreak,
            createdAt: getCurrentTime()
          });
        }
      }
      state.lastUpdated = getCurrentTime();
    },
    
    // Remove a lunch break
    removeLunchBreakSync: (state, action: PayloadAction<{
      date: string;
      breakId: string;
    }>) => {
      const { date, breakId } = action.payload;
      const normalizedDate = normalizeDate(date);
      
      if (state.rollingSchedule) {
        const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
          day => normalizeDate(day.date) === normalizedDate
        );
        
        if (dayIndex !== -1 && state.rollingSchedule.dailySchedules[dayIndex].lunchBreaks) {
          state.rollingSchedule.dailySchedules[dayIndex].lunchBreaks = 
            state.rollingSchedule.dailySchedules[dayIndex].lunchBreaks.filter(
              breakItem => breakItem.id !== breakId
            );
        }
      }
      state.lastUpdated = getCurrentTime();
    },
    
    // Toggle working day
    toggleWorkingDaySync: (state, action: PayloadAction<{
      date: string;
      isWorking: boolean;
    }>) => {
      const { date, isWorking } = action.payload;
      const normalizedDate = normalizeDate(date);
      
      if (state.rollingSchedule) {
        const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
          day => normalizeDate(day.date) === normalizedDate
        );
        
        if (dayIndex !== -1) {
          state.rollingSchedule.dailySchedules[dayIndex].isWorking = isWorking;
          
          // Clear time slots if day is not working
          if (!isWorking) {
            state.rollingSchedule.dailySchedules[dayIndex].timeSlots = [];
            state.rollingSchedule.dailySchedules[dayIndex].bookedSlots = 0;
            state.rollingSchedule.dailySchedules[dayIndex].assignedDoctors = [];
            state.rollingSchedule.dailySchedules[dayIndex].totalCapacity = 0;
            state.rollingSchedule.dailySchedules[dayIndex].lunchBreaks = [];
          }
        }
      }
      state.lastUpdated = getCurrentTime();
    },
    
    // Clear all doctor assignments for a specific date
    clearAssignmentsForDate: (state, action: PayloadAction<string>) => {
      const date = action.payload;
      const normalizedDate = normalizeDate(date);
      
      if (state.rollingSchedule) {
        const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
          day => normalizeDate(day.date) === normalizedDate
        );
        
        if (dayIndex !== -1) {
          const day = state.rollingSchedule.dailySchedules[dayIndex];
          day.timeSlots.forEach(slot => {
            slot.assignedDoctors = [];
            slot.availableCapacity = slot.capacity;
          });
          day.bookedSlots = 0;
          day.assignedDoctors = [];
        }
      }
      state.lastUpdated = getCurrentTime();
    },
    
    // Update settings
    updateSettings: (state, action: PayloadAction<Partial<typeof state.settings>>) => {
      state.settings = { ...state.settings, ...action.payload };
      state.lastUpdated = getCurrentTime();
    },
    
    // UI state management
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload ? normalizeDate(action.payload) : null;
    },
    
    setSelectedSlot: (state, action: PayloadAction<{ date: string; slotIndex: number } | null>) => {
      if (action.payload) {
        state.selectedSlot = {
          date: normalizeDate(action.payload.date),
          slotIndex: action.payload.slotIndex
        };
      } else {
        state.selectedSlot = null;
      }
    },
    
    setActiveTab: (state, action: PayloadAction<'schedule' | 'doctors' | 'settings' | 'lunch' | 'assignments'>) => {
      state.activeTab = action.payload;
    },
    
    setActiveWeek: (state, action: PayloadAction<number | null>) => {
      state.activeWeek = action.payload;
    },
    
    // Update current time
    updateCurrentTime: (state) => {
      state.currentTime = getCurrentTime();
      
      // Auto-refresh if schedule exists and auto-roll is enabled
      if (state.rollingSchedule?.autoRollEnabled && state.rollingSchedule.nextRollAt) {
        const now = new Date();
        const nextRoll = new Date(state.rollingSchedule.nextRollAt);
        // Auto-roll check logic can be implemented here
      }
    },
    
    // Refresh schedule data
    refreshData: (state) => {
      state.lastUpdated = getCurrentTime();
      if (state.rollingSchedule) {
        state.rollingSchedule = {
          ...state.rollingSchedule,
          updatedAt: getCurrentTime()
        };
      }
    },
    
    // Loading and error states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
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
    
    // Reset state
    resetState: () => {
      return {
        ...initialState,
        currentTime: getCurrentTime()
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // Get Rolling Window
      .addCase(getRollingWindow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(getRollingWindow.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rollingSchedule = action.payload.data;
        state.windowInfo = action.payload.windowInfo;
        state.currentTime = action.payload.timestamp;
        state.lastUpdated = action.payload.timestamp;
        state.success = 'Rolling window loaded successfully';
        
        // Update auto-roll setting
        if (action.payload.data.autoRollEnabled !== undefined) {
          state.settings.autoRollEnabled = action.payload.data.autoRollEnabled;
        }
        
        // Set default active week if not set
        if (!state.activeWeek && action.payload.data.dailySchedules.length > 0) {
          const firstDate = new Date(action.payload.data.dailySchedules[0].date);
          const firstDayOfYear = new Date(firstDate.getUTCFullYear(), 0, 1);
          const pastDaysOfYear = (firstDate.getTime() - firstDayOfYear.getTime()) / MILLISECONDS_PER_DAY;
          state.activeWeek = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
        }
      })
      .addCase(getRollingWindow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to fetch rolling window';
        state.currentTime = getCurrentTime();
      })
      
      // Check and Roll Window
      .addCase(checkAndRollWindow.pending, (state) => {
        state.isRolling = true;
        state.error = null;
      })
      .addCase(checkAndRollWindow.fulfilled, (state, action) => {
        state.isRolling = false;
        state.rollingSchedule = action.payload.data;
        state.windowInfo = action.payload.windowInfo;
        state.currentTime = action.payload.timestamp;
        state.lastUpdated = action.payload.timestamp;
        state.success = 'Window checked and updated successfully';
      })
      .addCase(checkAndRollWindow.rejected, (state, action) => {
        state.isRolling = false;
        state.error = action.payload as string || 'Failed to check and roll window';
      })
      
      // Save Schedule
      .addCase(saveSchedule.pending, (state) => {
        state.isSaving = true;
        state.error = null;
        state.success = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(saveSchedule.fulfilled, (state, action) => {
        state.isSaving = false;
        state.rollingSchedule = action.payload.data;
        state.currentTime = action.payload.timestamp;
        state.lastUpdated = action.payload.timestamp;
        state.success = 'Schedule saved successfully';
      })
      .addCase(saveSchedule.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string || 'Failed to save schedule';
        state.currentTime = getCurrentTime();
      })
      
      // Update Daily Schedule
      .addCase(updateDailySchedule.pending, (state) => {
        state.error = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(updateDailySchedule.fulfilled, (state, action) => {
        const { date, dailySchedule, timestamp } = action.payload;
        
        if (state.rollingSchedule) {
          const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
            day => normalizeDate(day.date) === date
          );
          
          if (dayIndex !== -1) {
            state.rollingSchedule.dailySchedules[dayIndex] = dailySchedule;
          }
        }
        
        state.currentTime = timestamp;
        state.lastUpdated = timestamp;
        state.success = 'Daily schedule updated successfully';
      })
      .addCase(updateDailySchedule.rejected, (state, action) => {
        state.error = action.payload as string;
        state.currentTime = getCurrentTime();
      })
      
      // Assign Doctor to Slot
      .addCase(assignDoctorToSlot.pending, (state) => {
        state.error = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(assignDoctorToSlot.fulfilled, (state, action) => {
        const { date, data, timestamp } = action.payload;
        
        if (state.rollingSchedule) {
          const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
            day => normalizeDate(day.date) === date
          );
          
          if (dayIndex !== -1 && data.data) {
            state.rollingSchedule.dailySchedules[dayIndex] = data.data;
          }
        }
        
        state.currentTime = timestamp;
        state.lastUpdated = timestamp;
        state.success = 'Doctor assigned to slot successfully';
      })
      .addCase(assignDoctorToSlot.rejected, (state, action) => {
        state.error = action.payload as string;
        state.currentTime = getCurrentTime();
      })
      
      // Remove Doctor from Slot
      .addCase(removeDoctorFromSlot.pending, (state) => {
        state.error = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(removeDoctorFromSlot.fulfilled, (state, action) => {
        const { date, data, timestamp } = action.payload;
        
        if (state.rollingSchedule) {
          const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
            day => normalizeDate(day.date) === date
          );
          
          if (dayIndex !== -1 && data.data) {
            state.rollingSchedule.dailySchedules[dayIndex] = data.data;
          }
        }
        
        state.currentTime = timestamp;
        state.lastUpdated = timestamp;
        state.success = 'Doctor removed from slot successfully';
      })
      .addCase(removeDoctorFromSlot.rejected, (state, action) => {
        state.error = action.payload as string;
        state.currentTime = getCurrentTime();
      })
      
      // Update Slot Duration
      .addCase(updateSlotDuration.pending, (state) => {
        state.error = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(updateSlotDuration.fulfilled, (state, action) => {
        const { date, dailySchedule, timestamp } = action.payload;
        
        if (state.rollingSchedule) {
          const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
            day => normalizeDate(day.date) === date
          );
          
          if (dayIndex !== -1) {
            state.rollingSchedule.dailySchedules[dayIndex] = dailySchedule;
          }
        }
        
        state.currentTime = timestamp;
        state.lastUpdated = timestamp;
        state.success = 'Slot duration updated successfully';
      })
      .addCase(updateSlotDuration.rejected, (state, action) => {
        state.error = action.payload as string;
        state.currentTime = getCurrentTime();
      })
      
      // Add Lunch Break
      .addCase(addLunchBreak.pending, (state) => {
        state.error = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(addLunchBreak.fulfilled, (state, action) => {
        const { date, dailySchedule, timestamp } = action.payload;
        
        if (state.rollingSchedule) {
          const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
            day => normalizeDate(day.date) === date
          );
          
          if (dayIndex !== -1) {
            state.rollingSchedule.dailySchedules[dayIndex] = dailySchedule;
          }
        }
        
        state.currentTime = timestamp;
        state.lastUpdated = timestamp;
        state.success = 'Lunch break added successfully';
      })
      .addCase(addLunchBreak.rejected, (state, action) => {
        state.error = action.payload as string;
        state.currentTime = getCurrentTime();
      })
      
      // Remove Lunch Break
      .addCase(removeLunchBreak.pending, (state) => {
        state.error = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(removeLunchBreak.fulfilled, (state, action) => {
        const { date, dailySchedule, timestamp } = action.payload;
        
        if (state.rollingSchedule) {
          const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
            day => normalizeDate(day.date) === date
          );
          
          if (dayIndex !== -1) {
            state.rollingSchedule.dailySchedules[dayIndex] = dailySchedule;
          }
        }
        
        state.currentTime = timestamp;
        state.lastUpdated = timestamp;
        state.success = 'Lunch break removed successfully';
      })
      .addCase(removeLunchBreak.rejected, (state, action) => {
        state.error = action.payload as string;
        state.currentTime = getCurrentTime();
      })
      
      // Update Session
      .addCase(updateSession.pending, (state) => {
        state.error = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(updateSession.fulfilled, (state, action) => {
        const { date, dailySchedule, timestamp } = action.payload;
        
        if (state.rollingSchedule) {
          const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
            day => normalizeDate(day.date) === date
          );
          
          if (dayIndex !== -1) {
            state.rollingSchedule.dailySchedules[dayIndex] = dailySchedule;
          }
        }
        
        state.currentTime = timestamp;
        state.lastUpdated = timestamp;
        state.success = 'Session updated successfully';
      })
      .addCase(updateSession.rejected, (state, action) => {
        state.error = action.payload as string;
        state.currentTime = getCurrentTime();
      })
      
      // Toggle Working Day
      .addCase(toggleWorkingDay.pending, (state) => {
        state.error = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(toggleWorkingDay.fulfilled, (state, action) => {
        const { date, dailySchedule, timestamp } = action.payload;
        
        if (state.rollingSchedule) {
          const dayIndex = state.rollingSchedule.dailySchedules.findIndex(
            day => normalizeDate(day.date) === date
          );
          
          if (dayIndex !== -1) {
            state.rollingSchedule.dailySchedules[dayIndex] = dailySchedule;
          }
        }
        
        state.currentTime = timestamp;
        state.lastUpdated = timestamp;
        state.success = 'Working day status updated successfully';
      })
      .addCase(toggleWorkingDay.rejected, (state, action) => {
        state.error = action.payload as string;
        state.currentTime = getCurrentTime();
      })
      
      // Toggle Auto Roll
      .addCase(toggleAutoRoll.pending, (state) => {
        state.error = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(toggleAutoRoll.fulfilled, (state, action) => {
        if (state.rollingSchedule && action.payload.data) {
          state.rollingSchedule.autoRollEnabled = action.payload.data.autoRollEnabled;
          state.settings.autoRollEnabled = action.payload.data.autoRollEnabled;
        }
        state.currentTime = action.payload.timestamp;
        state.lastUpdated = action.payload.timestamp;
        state.success = 'Auto-roll setting updated successfully';
      })
      .addCase(toggleAutoRoll.rejected, (state, action) => {
        state.error = action.payload as string;
        state.currentTime = getCurrentTime();
      })
      
      // Roll Window
      .addCase(rollWindow.pending, (state) => {
        state.isRolling = true;
        state.error = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(rollWindow.fulfilled, (state, action) => {
        state.isRolling = false;
        state.rollingSchedule = action.payload.data;
        state.windowInfo = action.payload.windowInfo;
        state.currentTime = action.payload.timestamp;
        state.lastUpdated = action.payload.timestamp;
        state.success = 'Window rolled forward successfully';
      })
      .addCase(rollWindow.rejected, (state, action) => {
        state.isRolling = false;
        state.error = action.payload as string;
        state.currentTime = getCurrentTime();
      })
      
      // Refresh Schedule
      .addCase(refreshSchedule.pending, (state) => {
        state.error = null;
        state.currentTime = getCurrentTime();
      })
      .addCase(refreshSchedule.fulfilled, (state, action) => {
        state.rollingSchedule = action.payload.data;
        state.windowInfo = action.payload.windowInfo;
        state.currentTime = action.payload.timestamp;
        state.lastUpdated = action.payload.timestamp;
        state.success = 'Schedule refreshed successfully';
      })
      .addCase(refreshSchedule.rejected, (state, action) => {
        state.error = action.payload as string;
        state.currentTime = getCurrentTime();
      });
  }
});

export const {
  updateRollingSchedule,
  updateDayInSchedule,
  assignDoctorToSlotSync,
  removeDoctorFromSlotSync,
  updateSlotSync,
  updateSessionSync,
  addLunchBreakSync,
  removeLunchBreakSync,
  toggleWorkingDaySync,
  clearAssignmentsForDate,
  updateSettings,
  setSelectedDate,
  setSelectedSlot,
  setActiveTab,
  setActiveWeek,
  updateCurrentTime,
  refreshData,
  setLoading,
  setError,
  setSuccess,
  clearNotifications,
  resetState,
} = editingNextWeekSlice.actions;

export default editingNextWeekSlice.reducer;

// ============ SETUP AUTO REFRESH ============
// This function sets up automatic time updates
export const setupAutoRefresh = (dispatch: any) => {
  // Update time every minute
  const timeUpdateInterval = setInterval(() => {
    dispatch(updateCurrentTime());
  }, 60000); // Every minute
  
  // Check for window roll every 5 minutes
  const rollCheckInterval = setInterval(() => {
    dispatch(checkAndRollWindow());
  }, 300000); // Every 5 minutes
  
  // Return cleanup function
  return () => {
    clearInterval(timeUpdateInterval);
    clearInterval(rollCheckInterval);
  };
};