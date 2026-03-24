// Core Schedule Types
export interface TimeSlot {
  id: string;
  start: string;
  end: string;
  type: 'working' | 'night-shift' | 'lunch' | 'night-lunch' | 'break' | 'regular' | 'custom' | 'emergency' | 'procedure' | 'consultation' | 'followup';
  capacity: number;
  isPeakHour: boolean;
  assignedDoctors: AssignedDoctor[];
  availableDoctors: string[];
  availableCapacity: number;
  specialization: string;
  specializations: string[];
  consultationType: 'face-to-face' | 'online';
  isShifted?: boolean;
  originalTiming?: { start: string; end: string };
  shiftedFrom?: string;
  originalTime?: string;
  isAvailable?: boolean;

  // Enhanced properties
  bufferTime: number;
  slotType: string;
  priority: string;
  tags: string[];
  duration: number;
  maxDoctors?: number;
  isCustom?: boolean;
  color?: string;
  notes?: string;
  room?: string;
  equipment?: string[];
  restrictions?: string[];
}

export interface AssignedDoctor {
  doctorId: string;
  doctorName: string;
  consultationType: 'face-to-face' | 'online';
  specialization: string[];
  maxPatients: number;
  currentPatients: number;
  isAvailable: boolean;
  colorCode?: string;
  
  // Optional properties
  originalStart?: string;
  originalEnd?: string;
  isShifted?: boolean;
  shiftReason?: string;
  isLate?: boolean;
  lateByMinutes?: number;
  isAbsent?: boolean;
  currentLoad?: number;
  maxCapacity?: number;
  assignedSlots?: string[];
  order?: number;
  specializationMatch?: string[];
  notes?: string;
}

export interface LunchBreak {
  id: string;
  start: string;
  end: string;
  reason: string;
  duration: number;
  enabled: boolean;
  recurring: boolean;
  affectedStaff: string[];
  type?: string;
  mandatory?: boolean;
  location?: string;
  color?: string;
  notes?: string;
}

export interface Session {
  start: string;
  end: string;
  enabled: boolean;
  slotDuration?: number;
  bufferTime?: number;
  maxDoctors?: number;
  maxPatientsPerDoctor?: number;
  allowOverbooking?: boolean;
  overbookingLimit?: number;
  isCustom?: boolean;
  type?: string;
}

export interface DailySchedule {
  date: string;
  dayOfWeek: number;
  dayName: string;
  isWorking: boolean;
  is24Hours: boolean;
  sessions: {
    morning: Session;
    afternoon: Session;
    night: Session;
    emergency: Session;
    lunches: LunchBreak[];
    nightLunches: LunchBreak[];
  };
  timeSlots: TimeSlot[];
  totalCapacity: number;
  bookedSlots: number;
  assignedDoctors: string[];
  availableSpecializations: string[];
  doctorSchedules: DoctorSchedule[];
  doctorAssignments: DoctorAssignment[];
  shiftedAppointments?: Array<{
    originalSlot: TimeSlot;
    newSlot: TimeSlot;
    doctorId: string;
    shiftDuration: number;
  }>;
  settings?: DailyScheduleSettings;
  rooms?: Room[];
  emergencyCoverage?: EmergencyCoverage[];
  notes?: string;
}

export interface DailyScheduleSettings {
  slotDuration: number;
  bufferTime: number;
  maxDoctorsPerSlot: number;
  maxPatientsPerSlot: number;
  allowEmergencyOverrides: boolean;
  autoReschedule: boolean;
  notifyOnChanges: boolean;
  enableWaitlist: boolean;
  enableRecurring: boolean;
  enableSpecializationFilter?: boolean;
  maxShiftDuration?: number;
}

export interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
  equipment: string[];
  available: boolean;
  color?: string;
}

export interface EmergencyCoverage {
  doctorId: string;
  doctorName: string;
  start: string;
  end: string;
  level: string;
  available: boolean;
  notes?: string;
}

export interface DayAvailability {
  morning: boolean;
  afternoon: boolean;
  night: boolean;
}

export type AvailabilityMap = Record<string, DayAvailability>;

export interface DoctorAssignment {
  doctorId: string;
  doctorName: string;
  date: string;
  slots: {
    morning: boolean;
    afternoon: boolean;
    night: boolean;
    emergency: boolean;
  };
  assignedTimeSlots: string[];
  notes: string;
  lateArrival?: {
    duration: number;
    reason: string;
    timestamp: string;
  };
  specialization?: string[];
  availability?: AvailabilityMap;
  workload?: number;
  emergencyCoverage?: boolean;
  color?: string;
  currentLoad?: number;
  maxLoad?: number;
}

export interface DefaultDoctor {
  doctorId: string;
  doctorName: string;
  specializations: string[];
  defaultSlots: string[];               // Previously any[]
  availability: AvailabilityMap;        // Previously Record<string, any>
  preferredDays?: string[];
  blackoutDates?: string[];
  color?: string;
  maxPatients?: number;
}

export interface WeeklySchedule {
  _id?: string;
  weekNumber: number;
  year: number;
  weekStart: string;
  weekEnd: string;
  dailySchedules: DailySchedule[];
  assignedDoctors: string[];
  isActive: boolean;
  defaultDoctors: DefaultDoctor[];
  weekType?: 'current' | 'next' | 'weekAfterNext' | 'thirdWeek';
  
  // Enhanced properties
  slotDuration?: number;
  bufferTime?: number;
  maxDoctorsPerSlot?: number;
  
  lateArrivals?: Array<{
    doctorId: string;
    date: string;
    duration: number;
    reason: string;
    timestamp: string;
  }>;
  notes?: string;
  settings?: WeeklyScheduleSettings;
  statistics?: {
    totalSlots: number;
    bookedSlots: number;
    utilizationRate: number;
    doctorUtilization: { [key: string]: number };
    peakHours: string[];
    busyDays: string[];
  };
}

export interface WeeklyScheduleSettings {
  enableSmartScheduling: boolean;
  autoAssignEmergency: boolean;
  enableLoadBalancing: boolean;
  enableSpecializationFilter: boolean;
  maxShiftDuration: number;
  minDoctorsPerSpecialization: number;
  enableNightShift: boolean;
  nightShiftStart: string;
  nightShiftEnd: string;
  enableCrossCoverage: boolean;
  enableTelemedicine: boolean;
  enableMultiDoctorSlots: boolean;
  slotDuration?: number;
  bufferTime?: number;
  maxDoctorsPerSlot?: number;
}

// Doctor/Practitioner Types
export interface Doctor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  password: string;
  specialization: string[];
  qualification: string;
  licenseNumber: string;
  experience: number;
  role: 'doctor' | 'nurse' | 'specialist' | 'surgeon' | 'therapist' | 'resident';
  availableFor: ('face-to-face' | 'online')[];
  isActive: boolean;
  isTemporary: boolean;
  temporaryPeriod?: {
    start: string;
    end: string;
  };
  workingHours?: {
    [key: string]: {
      start: string;
      end: string;
      breaks: Array<{
        start: string;
        end: string;
        reason: string;
      }>;
    };
  };
  notes?: string;
  hourlyRate?: number;
  maxPatientsPerSlot: number;
  currentPatientLoad: number;
  personalSchedule?: {
    [date: string]: {
      slots: Array<{
        start: string;
        end: string;
        type: 'working' | 'break' | 'emergency' | 'leave';
        patientBookings: string[];
        status: 'available' | 'booked' | 'cancelled' | 'rescheduled';
      }>;
      adjustments: Array<{
        originalTime: string;
        newTime: string;
        reason: string;
        affectedPatients: string[];
        timestamp: string;
      }>;
    };
  };
  defaultWorkingHours: DefaultWorkingHours;
  absences: Absence[];
  lateArrivals: LateArrival[];
  currentStatus: 'available' | 'busy' | 'break' | 'absent' | 'late' | 'off-duty';
  lastCheckIn?: string;
  colorCode?: string;
  avatar?: string;
  department?: string;
  subSpecialization?: string[];
  language?: string[];
  certifications?: string[];
  rating?: number;
  totalPatients?: number;
  lastActive?: string;
  medical_centers?: string[];
  consultationFee?: number;
  emergencyAvailability?: boolean;
  preferredSlots?: string[];
}

export interface Practitioner extends Doctor {
  medical_centers?: string[];
  qualifications?: string[];
}

// Schedule Settings Interface
export interface ScheduleSettings {
  // Slot Configuration
  slotDuration: number;
  bufferTime: number;
  maxDoctorsPerSlot: number;
  maxPatientsPerSlot: number;
  minPatientsPerDoctor: number;
  maxPatientsPerDoctor: number;
  
  // Time Settings
  autoShiftOnLateArrival: boolean;
  maxShiftDuration: number;
  minShiftDuration: number;
  allowPartialShifts: boolean;
  
  // Notification Settings
  notifyPatientsOnShift: boolean;
  notifyDoctorsOnChange: boolean;
  notifyAdminsOnConflict: boolean;
  
  // Emergency Settings
  enableEmergencyOverrides: boolean;
  autoAssignBackup: boolean;
  emergencyShiftDuration: number;
  maxEmergencyShifts: number;
  
  // Capacity Settings
  enableDynamicCapacity: boolean;
  maxOverbookingPercentage: number;
  enableWaitlist: boolean;
  waitlistLimit: number;
  
  // Specialization Settings
  enableSpecializationFilter: boolean;
  requireSpecializationMatch: boolean;
  allowCrossSpecialization: boolean;
  
  // Night Shift Settings
  enableNightShift: boolean;
  nightShiftDuration: number;
  nightShiftBuffer: number;
  minNightShiftDoctors: number;
  
  // Advanced Settings
  enableAutoScheduling: boolean;
  enableLoadBalancing: boolean;
  enableConflictDetection: boolean;
  enableOptimization: boolean;
  optimizationPriority: 'efficiency' | 'fairness' | 'patient-satisfaction' | 'doctor-preferences';
  
  // UI Settings
  showDoctorColors: boolean;
  showSpecializationIcons: boolean;
  enableDragAndDrop: boolean;
  enableBulkEditing: boolean;
}

// Redux State Types
export interface EditingNextWeekState {
  selectedWeek: {
    schedule: WeeklySchedule | null;
    type: 'next' | 'weekAfterNext' | 'thirdWeek' | null;
  } | null;
  schedules: {
    next: WeeklySchedule | null;
    weekAfterNext: WeeklySchedule | null;
    thirdWeek: WeeklySchedule | null;
  };
  isLoading: boolean;
  error: string | null;
  success: string | null;
  practitioners: Practitioner[];
  lateArrivals: LateArrivalRecord[];
  shiftedAppointments: ShiftedAppointment[];
  doctorAvailability: {
    [doctorId: string]: {
      currentLoad: number;
      maxLoad: number;
      isAvailable: boolean;
      lateToday?: number;
      color?: string;
    };
  };
  
  // Enhanced settings
  settings: ScheduleSettings;
  
  statistics: {
    totalSlots: number;
    bookedSlots: number;
    utilizationRate: number;
    doctorUtilization: { [key: string]: number };
    peakHours: string[];
    busyDays: string[];
    capacityUtilization?: number;
    doctorCoverage?: number;
    emergencySlots?: number;
  };
  
  bulkOperations: {
    selectedSlots: string[];
    isSelecting: boolean;
    lastOperation: string | null;
  };
}

// Other types from original file (kept for compatibility)
export interface OutsourcedDoctor {
  id: string;
  name: string;
  specialization: string[];
  contact: string;
  duration: string;
  cost: number;
}

export interface PersonalSchedule {
  _id: string;
  doctorId: string;
  weeklySchedules: WeeklySchedule[];
  preferredSlots: string[];
  unavailableTimes: UnavailableTime[];
}

export interface DefaultWorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
  [key: string]: DaySchedule;
}

export interface DaySchedule {
  morning: SessionHours;
  afternoon: SessionHours;
  night: SessionHours;
  enabled: boolean;
}

export interface SessionHours {
  start: string;
  end: string;
  enabled: boolean;
}

export interface SessionSchedule {
  morning: SessionHours;
  afternoon: SessionHours;
  night: SessionHours;
  lunches: LunchBreak[];
  nightLunches: LunchBreak[];
}

export interface Booking {
  _id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientAge: number;
  patientGender: string;
  medicalCondition: string;
  symptoms: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  preferredDate: string;
  preferredTime: string;
  status: 'approved' | 'rescheduled' | 'auto-approved' | 'pending-reschedule' | 'doctor-rescheduled';
  assignedTime?: string;
  assignedDate?: string;
  createdAt: string;
  emergencyContact: string;
  insuranceDetails: string;
  consultationType: 'online' | 'face-to-face';
  patientSector: 'government' | 'private';
  autoApproved?: boolean;
  assignedDoctor?: string;
  specializationRequired?: string[];
  rescheduleHistory?: Array<{
    fromDate: string;
    fromTime: string;
    toDate: string;
    toTime: string;
    reason: string;
    timestamp: string;
    initiatedBy: 'system' | 'patient' | 'doctor' | 'admin';
  }>;
  doctorNotes?: string;
  followUpRequired?: boolean;
  slotShifted?: boolean;
  originalSlot?: string;
  doctorSpecialization: string[];   // Previously any
}

export interface Absence {
  id: string;
  date: string;
  reason: string;
  duration: 'full-day' | 'half-day' | 'custom';
  startTime?: string;
  endTime?: string;
  status: 'pending' | 'approved' | 'rejected';
  affectedSlots: string[];
  replacementDoctor?: string;
}

export interface LateArrival {
  id?: string;
  practitionerId?: string;
  doctorId?: string;
  doctorName?: string;
  date: string;
  duration: number;
  reason: string;
  timestamp: string;
  expectedTime?: string;
  actualTime?: string;
  lateByMinutes?: number;
  affectedSlots?: string[];
  rescheduledPatients?: string[];
}

export interface LateArrivalRecord {
  doctorId: string;
  doctorName: string;
  date: string;
  duration: number;
  reason: string;
  affectedSlots: string[];
  timestamp: string;
  type: string;
}

export interface AssignedSlotDoctor {
  doctorId: string;
  doctorName: string;
  specialization: string[];
  isAvailable: boolean;
  isLate?: boolean;
  lateByMinutes?: number;
  isAbsent?: boolean;
  currentLoad: number;
  maxCapacity: number;
  consultationType: 'face-to-face' | 'online';
  assignedSlots: string[];
}

export interface DoctorSchedule {
  doctorId: string;
  doctorName: string;
  slots: DoctorSlot[];
  totalHours: number;
  weeklyLoad: number;
}

export interface DoctorSlot {
  maxPatients: number;
  slotId: string;
  start: string;
  end: string;
  type: string;
  patientLoad: number;
  consultationType: 'face-to-face' | 'online';
}

export interface DefaultDoctorAssignment {
  doctorId: string;
  doctorName: string;
  specializations: string[];
  defaultSlots: string[];
  availability: {
    [day: string]: {
      morning: boolean;
      afternoon: boolean;
      night: boolean;
    };
  };
}

export interface ShiftedAppointment {
  id: string;
  practitionerId: string;
  originalSlot: { start: string; end: string };
  newSlot: { start: string; end: string };
  shiftDuration: number;
  reason: string;
  timestamp: string;
  originalTime?: string;
  newTime?: string;
  doctorId?: string;
  patientId?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
}

export interface UnavailableTime {
  date: string;
  start: string;
  end: string;
  reason: string;
}

export interface ShiftAdjustment {
  slotId: string;
  originalTime: string;
  newTime: string;
  affectedPatients: string[];
  reason: string;
}

export interface DoctorScheduleAdjustment {
  doctorId: string;
  date: string;
  originalStart: string;
  newStart: string;
  reason: string;
  affectedBookings: string[];
  timestamp: string;
  duration: number;
}

export interface MedicalCenterSettings {
  clinicName: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicAddress: string;
  clinicSector: 'government' | 'private' | 'mixed';
  
  slotDuration: number;
  bufferTime: number;
  
  maxFaceToFace: number;
  maxOnline: number;
  maxDoctorsPerSlot: number;
  availableDoctorsDay: number;
  availableDoctorsNight: number;
  maxDailyAppointments: number;
  
  defaultWorkingHours: Array<{
    dayOfWeek: number;
    dayName: string;
    isWorking: boolean;
    is24Hours: boolean;
    sessions: {
      morning: { start: string; end: string; enabled: boolean };
      lunches: LunchBreak[];
      afternoon: { start: string; end: string; enabled: boolean };
      night: { start: string; end: string; enabled: boolean };
      nightLunches: LunchBreak[];
    };
  }>;
  
  defaultDoctorAssignments: DefaultDoctorAssignment[];
  doctors: Doctor[];
  currentWeekSchedule: WeeklySchedule;
  nextWeekSchedule?: WeeklySchedule;
  weekAfterNextSchedule?: WeeklySchedule;
  thirdWeekSchedule?: WeeklySchedule;
  scheduleHistory: WeeklySchedule[];
  
  consultationCosts: ConsultationCosts;
  
  bookingLeadTime: number;
  maxRescheduleAttempts: number;
  autoCancelUnconfirmed: number;
  allowAutomaticRescheduling: boolean;
  
  nonWorkingDates: Array<{
    date: string;
    reason: string;
    isRecurring: boolean;
  }>;
  
  peakHours: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    multiplier: number;
  }>;
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
  effectiveFrom: string;
  history: Array<{
    government: { faceToFace: number; online: number };
    private: { faceToFace: number; online: number };
    effectiveFrom: string;
    changedAt: string;
  }>;
}

export interface AvailableSlot {
  time: string;
  available: number;
  isPeakHour: boolean;
  slotType: 'standard' | 'peak' | 'emergency';
  availableDoctors: Doctor[];
  specializations: string[];
  assignedDoctors: Array<{
    doctorId: string;
    doctorName: string;
    specialization: string[];
    currentLoad: number;
    maxCapacity: number;
  }>;
}

export interface PractitionerSession {
  doctorId: string;
  name: string;
  email: string;
  role: string;
  specialization: string[];
  isTemporary: boolean;
  lastLogin: string;
  currentStatus?: 'available' | 'busy' | 'break' | 'absent' | 'late' | 'off-duty';
}

export interface PractitionerScheduleView {
  weeklySchedule: WeeklySchedule;
  personalSlots: DoctorSlot[];
  upcomingAppointments: Booking[];
  availabilityStatus: 'available' | 'busy' | 'break' | 'off-duty';
  nextSlot?: DoctorSlot;
  todayStats: {
    totalSlots: number;
    completedSlots: number;
    upcomingSlots: number;
    patientLoad: number;
  };
  lateArrivals?: Array<{
    doctorId: string;
    date: string;
    duration: number;
    reason: string;
    timestamp: string;
  }>;
  absences?: Array<{
    id: string;
    date: string;
    reason: string;
    duration: string;
    status: string;
  }>;
  recentActivity?: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export interface WeeklySchedulesState {
  schedules: {
    currentWeekSchedule: WeeklySchedule | null;
    nextWeekSchedule: WeeklySchedule | null;
    weekAfterNextSchedule: WeeklySchedule | null;
    thirdWeekSchedule: WeeklySchedule | null;
  };
  selectedWeek: { 
    schedule: WeeklySchedule; 
    type: 'next' | 'weekAfterNext' | 'thirdWeek' 
  } | null;
  loading: boolean;
  error: string | null;
  success: string | null;
  lateArrivals: LateArrival[];
  shiftedAppointments: ShiftedAppointment[];
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface StatusUpdateResponse {
  status: 'available' | 'busy' | 'break' | 'absent' | 'off-duty';
  updatedAt: string;
  doctorId: string;
}

export interface LoginResponse {
  token: string;
  session: PractitionerSession;
  message?: string;
}

export interface ScheduleResponse {
  schedule: PractitionerScheduleView;
  message?: string;
}

// Add these types to your existing types.ts file

export interface BackendAppointment {
  _id: string;
  appointment_id: string;
  patient_id: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth?: string;
    gender?: string;
    emergencyContact?: string;
  };
  medical_center_id: {
    _id: string;
    facility_name: string;
    address: string;
    phone: string;
  };
  practitioner_id: {
    _id: string;
    full_name: string;
    role: string;
    specialties: string[];
  };
  schedule_id: string;
  date: string;
  slot_id: string;
  original_slot_id?: string;
  slot_start: string;
  slot_end: string;
  doctor_name: string;
  doctor_specialization: string[];
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  reason_for_visit: string;
  symptoms: string;
  preferred_specialization: string;
  consultation_type: 'face-to-face' | 'telemedicine' | 'follow-up';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show' | 'rescheduled';
  notes: string;
  cancellation_reason?: string;
  cancelled_by?: 'patient' | 'doctor' | 'medicalCenter' | 'system';
  cancelled_at?: string;
  is_shifted_slot?: boolean;
  shift_notes?: string;
  appointment_duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Duplicate ApiResponse definition is removed; the one above is used.

export interface MedicalCenterResponse {
  _id: string;
  facility_name: string;
  address: string;
  phone: string;
  email: string;
  doctors: Doctor[];
  currentWeekSchedule?: WeeklySchedule;
  settings: {
    appointment_duration: number;
    buffer_time: number;
    max_daily_appointments: number;
  };
}