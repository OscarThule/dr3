'use client';

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// ============ AUTH UTILS ============
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  
  return (
    localStorage.getItem('patientToken') ||
    sessionStorage.getItem('patientToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token')
  )
}

const getPatientFromStorage = () => {
  if (typeof window === 'undefined') return null
   
  const storedPatient = localStorage.getItem('patientInfo') || 
                       sessionStorage.getItem('patientInfo')
  if (!storedPatient) return null
  
  try {
    return JSON.parse(storedPatient)
  } catch {
    return null
  }
}

// ============ TYPES ============
interface Address {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postal: string;
  lat?: number;
  lng?: number;
}

interface Practitioner {
  _id: string;
  practitioner_id: string;
  full_name: string;
  role?: string;
  professional_license_number?: string;
  license_type?: string;
  specialties?: string[];
  contact_email?: string;
  verification_status: string;
  is_active: boolean;
  added_at: string;
  last_updated: string;
}

interface Statistics {
  total_patients: number;
  total_appointments: number;
  monthly_appointments: number;
  average_rating: number;
  response_time: number;
}

interface MedicalCenter {
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
  theme_colors?: { primary: string; secondary: string };
  verification_status: string;
  is_verified: boolean;
  is_active: boolean;
  parent_center_id: string | null;
  branches: any[];
  created_at: string;
  updated_at: string;
  __v: number;
}

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  capacity: number;
  availableCapacity: number;
  type: string;
  isPeakHour: boolean;
  assignedDoctors: DoctorForBooking[];
  specialization: string;
  specializations: string[];
  consultationType: string;
}

interface DailySchedule {
  date: string;
  dayName: string;
  isWorking: boolean;
  timeSlots: TimeSlot[];
  lunchBreaks: any[];
  sessions: { morning: any; afternoon: any; night: any };
}

interface ScheduleData {
  _id: string;
  schedule_id: string;
  medical_center_id: string;
  windowStart: string;
  windowEnd: string;
  dailySchedules: DailySchedule[];
  historicalDays: any[];
  assignedDoctors: string[];
  isActive: boolean;
  defaultDoctors: any[];
  slotDuration: number;
  bufferTime: number;
  maxDoctorsPerSlot: number;
  createdBy: string;
  updatedBy: string;
  lateArrivals: any[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface DoctorForBooking {
  doctorId: string;
  doctorName: string;
  role?: string;
  specialization: string[];
  maxPatients: number;
  currentPatients: number;
  availableSlots: number;
  consultationType: string;
  colorCode: string;
  isAvailable?: boolean;
  isBooked?: boolean;
}

interface BookingModalData {
  isOpen: boolean;
  medicalCenter: MedicalCenter | null;
  schedule: ScheduleData | null;
  date: string;
  slot: TimeSlot | null;
  selectedDoctor: DoctorForBooking | null;
  reasonForVisit: string;
  symptoms: string;
  preferredSpecialization: string;
  consultationType: 'face-to-face' | 'telemedicine' | 'follow-up';
  step: 'select-doctor' | 'booking-details';
}

interface PatientInfo {
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
}

interface BookingPatientInfo {
  _id: string;
  email: string;
  name: string;
  phone: string;
}

interface DoctorAvailability {
  doctorId: string;
  doctorName: string;
  role?: string;
  specialization: string[];
  colorCode: string;
  availableSlots: Array<{
    date: string;
    start: string;
    end: string;
    slotId: string;
  }>;
}

interface Appointment {
  _id: string;
  appointment_id: string;
  patient_id: string;
  medical_center_id: string;
  practitioner_id: string;
  date: string;
  slot_id: string;
  reason_for_visit: string;
  symptoms: string;
  consultation_type: string;
  status:
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no-show'
  | 'rescheduled';

  payment_status: 'pending' | 'success' | 'failed' | 'refunded' |'paid'| 'none';

  payment_reference?: string;
  created_at: string;
  updated_at: string;
}

interface BookingState {
  medicalCenter: MedicalCenter | null;
  centerAppointments: Appointment[];

  schedule: ScheduleData | null;
  loading: boolean;
  scheduleLoading: boolean;
  error: string | null;
  selectedDateRange: 'today' | 'tomorrow' | 'week' | 'all';
  bookingModal: BookingModalData;
  availableDoctors: DoctorForBooking[];
  bookingLoading: boolean;
  bookingError: string | null;
  successMessage: string | null;
  patientInfo: BookingPatientInfo | null;
  doctorAvailability: DoctorAvailability[];
  viewMode: 'slots' | 'doctors';
  
  // NEW: Added booking status and appointments array
  bookingStatus: 'idle' | 'pending' | 'paid' | 'confirmed' | 'failed';
  appointments: Appointment[];
}

// ============ INITIAL STATE ============
const initialState: BookingState = {
  medicalCenter: null,
  
  schedule: null,
  loading: false,
  scheduleLoading: true,
  error: null,
  selectedDateRange: 'week',
  bookingModal: {
    isOpen: false,
    medicalCenter: null,
    schedule: null,
    date: '',
    slot: null,
    selectedDoctor: null,
    reasonForVisit: '',
    symptoms: '',
    preferredSpecialization: '',
    consultationType: 'face-to-face',
    step: 'select-doctor'
  },
  availableDoctors: [],
  bookingLoading: false,
  bookingError: null,
  successMessage: null,
  patientInfo: null,
  doctorAvailability: [],
  viewMode: 'slots',
  
  // NEW: Initial state for booking status and appointments
  bookingStatus: 'idle',
  appointments: [],
  centerAppointments: []

};

// ============ UTILITY FUNCTIONS ============
const checkDoctorAvailability = (doctor: DoctorForBooking): boolean => {
  if (doctor.isBooked === true) return false;
  if (doctor.maxPatients && doctor.currentPatients !== undefined) {
    return doctor.currentPatients < doctor.maxPatients;
  }
  return true;
};

const getSlotStatus = (slot: TimeSlot) => {
  if (!slot.assignedDoctors || slot.assignedDoctors.length === 0) {
    return { status: 'no-doctors', availableDoctors: 0, bookedDoctors: 0 };
  }
  
  const availableDoctors = slot.assignedDoctors.filter(checkDoctorAvailability).length;
  const bookedDoctors = slot.assignedDoctors.filter(doc => doc.isBooked === true).length;
  
  return {
    status: availableDoctors > 0 ? 'available' : 'all-booked',
    availableDoctors,
    bookedDoctors
  };
};

const convertToBookingPatient = (patient: PatientInfo | null): BookingPatientInfo | null => {
  if (!patient) return null;
  
  return {
    _id: patient._id,
    email: patient.email,
    name: `${patient.firstName} ${patient.lastName}`,
    phone: patient.phone
  };
};

// ============ THUNKS ============

export const fetchScheduleWithAvailabilityThunk = createAsyncThunk(
  'booking/fetchScheduleWithAvailability',
  async (centerId: string, { rejectWithValue, dispatch, getState }) => {
    try {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1) Fetch schedule
      const res = await axios.get(
        `https://dmrs.onrender.com/api/editing-schedules/public/rolling-window/${centerId}`,
        { headers, timeout: 10000 }
      );

      if (!res.data?.success || !res.data?.data) {
        throw new Error(res.data?.message || 'Invalid schedule data');
      }

      const scheduleData = res.data.data;

      // 2) Fetch appointments for this center
      if (token) {
        await dispatch(fetchCenterAppointmentsThunk(centerId)).unwrap();
      }

      // 3) Get fresh appointments from state
      const appointments = (getState() as any).booking.centerAppointments || [];

      // 4) Merge schedule with real availability
   const normalizeDate = (d: any) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().split('T')[0];
};

const processedSchedule = {
  ...scheduleData,
  dailySchedules: scheduleData.dailySchedules.map((day: any) => {
    const dayKey = normalizeDate(day.date);

    return {
      ...day,
      timeSlots: day.timeSlots.map((slot: any) => {
        const slotId = String(slot.id);

        const slotBookings = appointments.filter((appt: any) => {
          const apptDay = normalizeDate(appt.date);

          return (
            apptDay === dayKey &&
            String(appt.slot_id) === slotId &&
            (appt.status === 'pending' || appt.status === 'confirmed')
          );
        });

        const processedDoctors = (slot.assignedDoctors || []).map((doctor: any) => {
          const doctorId = String(doctor.doctorId);

          const doctorBookings = slotBookings.filter(
            (appt: any) => String(appt.practitioner_id) === doctorId
          );

          const isBooked = doctorBookings.length > 0;

          return {
            ...doctor,
            currentPatients: doctorBookings.length,
            isBooked,
            isAvailable: !isBooked
          };
        });

        return {
          ...slot,
          assignedDoctors: processedDoctors,
          availableCapacity: processedDoctors.filter((d: DoctorForBooking) => !d.isBooked).length,
          capacity: processedDoctors.length
        };
      })
    };
  })
};



      return processedSchedule;
    } catch (err: any) {
      return rejectWithValue({
        error:
          err?.response?.data?.message ||
          err?.message ||
          'Failed to fetch schedule'
      });
    }
  }
);



export const fetchCenterAppointmentsThunk = createAsyncThunk(
  'booking/fetchCenterAppointments',
  async (medicalCenterId: string, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue('Login required');

      const res = await axios.get(
        'https://dmrs.onrender.com/api/bookings/all',
        {
          params: { medical_center_id: medicalCenterId },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      return res.data.data || [];
    } catch {
      return rejectWithValue('Failed to load center appointments');
    }
  }
);


// 2️⃣ FETCH PATIENT APPOINTMENTS (SYNC WITH WEBHOOK)
export const fetchPatientAppointmentsThunk = createAsyncThunk(
  'booking/fetchPatientAppointments',
  async (_, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue('Login required');

      const res = await axios.get(
        'https://dmrs.onrender.com/api/bookings/patient',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      return res.data.data || [];
    } catch (err: any) {
      return rejectWithValue('Failed to load appointments');
    }
  }
);

// 3️⃣ HANDLE SLOT CLICK
export const handleSlotClickThunk = createAsyncThunk(
  'booking/handleSlotClick',
  async ({ date, slot, medicalCenter, schedule }: any, { rejectWithValue, dispatch }) => {
    if (!medicalCenter || !schedule) {
      return rejectWithValue('Missing medical center or schedule');
    }

    const slotStatus = getSlotStatus(slot);
    if (slotStatus.status === 'no-doctors') {
      alert('No doctors available for this slot');
      return rejectWithValue('No doctors available for this slot');
    }

    try {
      const availableDoctorsInSlot = (slot.assignedDoctors || [])
        .filter((doctor: DoctorForBooking) => doctor.isBooked !== true)
        .map((doctor: DoctorForBooking) => ({
          ...doctor,
          role: doctor.role || 'Doctor',
          isAvailable: true,
          isBooked: false,
          availableSlots: slot.availableCapacity || 1
        }));

      if (availableDoctorsInSlot.length === 0) {
        alert('No doctors available for this slot');
        return rejectWithValue('No doctors available for this slot');
      }

      dispatch(setAvailableDoctors(availableDoctorsInSlot));
      
      return {
        isOpen: true,
        medicalCenter,
        schedule,
        date,
        slot,
        selectedDoctor: null,
        reasonForVisit: '',
        symptoms: '',
        preferredSpecialization: '',
        consultationType: 'face-to-face' as const,
        step: 'select-doctor' as const
      };
    } catch (error) {
      console.error('Error in slot click:', error);
      alert('Failed to load available doctors');
      return rejectWithValue('Failed to load available doctors');
    }
  }
);

// 4️⃣ HANDLE BOOK APPOINTMENT (CREATE + REDIRECT PAYMENT)
export const handleBookAppointmentThunk = createAsyncThunk(
  'booking/handleBookAppointment',
  async (localBookingModal: any, { rejectWithValue, dispatch }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue('Please login first');

      const patient = getPatientFromStorage();
      if (!patient?._id) return rejectWithValue('Patient profile missing');

      dispatch(setBookingStatus('pending'));

      // Build booking data
      const bookingPayload = {
        patient_id: patient._id,
        medical_center_id: localBookingModal.medicalCenter._id,
        schedule_id: localBookingModal.schedule._id,
        date: localBookingModal.date,
        slot_id: localBookingModal.slot.id,
        practitioner_id: localBookingModal.selectedDoctor.doctorId,
        reason_for_visit: localBookingModal.reasonForVisit,
        symptoms: localBookingModal.symptoms || '',
        consultation_type: localBookingModal.consultationType
      };

      // Create pending appointment (backend also creates payment + paystack link)
      const bookingRes = await axios.post(
        'https://dmrs.onrender.com/api/bookings',
        bookingPayload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!bookingRes.data?.success) {
        dispatch(setBookingStatus('failed'));
        return rejectWithValue('Failed to create appointment');
      }

      const appointment = bookingRes.data.data;
      const payment = appointment?.payment;

      if (!payment?.authorization_url) {
        dispatch(setBookingStatus('failed'));
        return rejectWithValue('Payment link missing from server');
      }

      // Redirect patient to Paystack
      window.location.href = payment.authorization_url;

      return {
        success: true,
        appointment
      };
    } catch (err: any) {
      dispatch(setBookingStatus('failed'));
      return rejectWithValue(
        err?.response?.data?.message || 'Booking failed, please try again'
      );
    }
  }
);


// 5️⃣ VERIFY PAYMENT AFTER PAYSTACK REDIRECT
export const verifyPaymentThunk = createAsyncThunk(
  'booking/verifyPayment',
  async (reference: string, { rejectWithValue, dispatch }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue('Login required');

      // Fetch payment verification
      const res = await axios.get(
        `https://dmrs.onrender.com/api/payments/verify/${reference}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // After successful verification, refresh appointments
      dispatch(fetchPatientAppointmentsThunk());
      
      // Start polling for webhook confirmation
      dispatch(pollForConfirmationThunk());

      return res.data;
    } catch (err: any) {
      return rejectWithValue('Payment verification failed');
    }
  }
);

// 6️⃣ POLL FOR CONFIRMATION (WEBHOOK SYNC)
export const pollForConfirmationThunk = createAsyncThunk(
  'booking/pollConfirmation',
  async (_, { dispatch, getState }) => {
    return new Promise<void>((resolve) => {
      let checks = 0;
      const maxChecks = 10; // Poll for 30 seconds (10 * 3 seconds)

      const interval = setInterval(async () => {
        checks++;
        
        // Fetch latest appointments
        await dispatch(fetchPatientAppointmentsThunk());
        
        // Get current state to check if we can stop polling
        const state = getState() as { booking: BookingState };
        
        // Check if we have a recent confirmed appointment
        const recentAppointment = state.booking.appointments.find(appt => 
          appt.payment_status === 'paid' && 
          appt.status === 'confirmed' &&
          new Date(appt.created_at).getTime() > Date.now() - 60000 // Last minute
        );

        if (recentAppointment || checks >= maxChecks) {
          clearInterval(interval);
          resolve();
        }
      }, 3000); // Poll every 3 seconds
    });
  }
);

// 7️⃣ CHECK DOCTOR AVAILABILITY
export const checkDoctorAvailabilityThunk = createAsyncThunk(
  'booking/checkDoctorAvailability',
  async ({ date, slotId, doctorId }: { date: string; slotId: string; doctorId: string }, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await axios.get(
        `https://dmrs.onrender.com/api/bookings/check-doctor-availability`,
        {
          params: {
            practitioner_id: doctorId,
            date: date,
            slot_id: slotId
          },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        doctorId,
        date,
        slotId,
        isAvailable: response.data.isAvailable,
        existingAppointmentId: response.data.existingAppointmentId
      };
    } catch (error: any) {
      console.error('Error checking doctor availability:', error);
      return rejectWithValue('Error checking doctor availability');
    }
  }
);

// ============ SLICE ============
const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setMedicalCenter: (state, action: PayloadAction<MedicalCenter | null>) => {
      state.medicalCenter = action.payload;
    },
    setSchedule: (state, action: PayloadAction<ScheduleData | null>) => {
      state.schedule = action.payload;
    },
    setAvailableDoctors: (state, action: PayloadAction<DoctorForBooking[]>) => {
      state.availableDoctors = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setScheduleLoading: (state, action: PayloadAction<boolean>) => {
      state.scheduleLoading = action.payload;
    },
    setBookingLoading: (state, action: PayloadAction<boolean>) => {
      state.bookingLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setBookingError: (state, action: PayloadAction<string | null>) => {
      state.bookingError = action.payload;
    },
    setSuccessMessage: (state, action: PayloadAction<string | null>) => {
      state.successMessage = action.payload;
    },
    setSelectedDateRange: (state, action: PayloadAction<'today' | 'tomorrow' | 'week' | 'all'>) => {
      state.selectedDateRange = action.payload;
    },
    setBookingModal: (state, action: PayloadAction<BookingModalData>) => {
      state.bookingModal = action.payload;
    },
    setDoctorAvailability: (state, action: PayloadAction<DoctorAvailability[]>) => {
      state.doctorAvailability = action.payload;
    },
    setViewMode: (state, action: PayloadAction<'slots' | 'doctors'>) => {
      state.viewMode = action.payload;
    },
    setBookingStatus: (state, action: PayloadAction<BookingState['bookingStatus']>) => {
      state.bookingStatus = action.payload;
    },
    handleSelectDoctorThunk: (state, action: PayloadAction<DoctorForBooking>) => {
      state.bookingModal.selectedDoctor = action.payload;
      state.bookingModal.preferredSpecialization = action.payload.specialization[0] || '';
      state.bookingModal.consultationType = action.payload.consultationType as 'face-to-face' | 'telemedicine' | 'follow-up';
      state.bookingModal.step = 'booking-details';
    },
    handleBackToDoctorSelectionThunk: (state) => {
      state.bookingModal.step = 'select-doctor';
      state.bookingModal.reasonForVisit = '';
      state.bookingModal.symptoms = '';
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    clearBookingError: (state) => {
      state.bookingError = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearAllMessages: (state) => {
      state.successMessage = null;
      state.bookingError = null;
      state.error = null;
    },
    resetBookingState: () => {
      return initialState;
    },
    syncPatientInfoFromStorage: (state) => {
      const storedPatient = getPatientFromStorage();
      state.patientInfo = convertToBookingPatient(storedPatient);
    },
    closeBookingModal: (state) => {
      state.bookingModal.isOpen = false;
    },
    updateAppointmentStatus: (state, action: PayloadAction<{ appointmentId: string; status: string; paymentStatus?: string }>) => {
      const appointment = state.appointments.find(appt => appt._id === action.payload.appointmentId);
      if (appointment) {
        appointment.status = action.payload.status as any;
        if (action.payload.paymentStatus) {
          appointment.payment_status = action.payload.paymentStatus as any;
        }
        appointment.updated_at = new Date().toISOString();
      }
    }
  },
  extraReducers: (builder) => {
    // Fetch Schedule
    builder.addCase(fetchScheduleWithAvailabilityThunk.pending, (state) => {
      state.scheduleLoading = true;
      state.error = null;
    });

    builder.addCase(fetchCenterAppointmentsThunk.fulfilled, (state, action) => {
  state.centerAppointments = action.payload || [];
});

    
    builder.addCase(fetchScheduleWithAvailabilityThunk.fulfilled, (state, action) => {
      state.schedule = action.payload;
      state.scheduleLoading = false;
      state.error = null;
    });
    
    builder.addCase(fetchScheduleWithAvailabilityThunk.rejected, (state, action: any) => {
      state.error = action.payload?.error || 'Failed to fetch schedule';
      state.scheduleLoading = false;
    });

    // Handle Slot Click
    builder.addCase(handleSlotClickThunk.fulfilled, (state, action) => {
      if (action.payload) {
        state.bookingModal = action.payload;
      }
    });

    // Handle Book Appointment
    builder.addCase(handleBookAppointmentThunk.pending, (state) => {
      state.bookingLoading = true;
      state.bookingError = null;
      state.bookingStatus = 'pending';
    });
    
    builder.addCase(handleBookAppointmentThunk.fulfilled, (state) => {
      state.bookingLoading = false;
      state.bookingError = null;
      // Status remains pending until payment verification
    });
    
    builder.addCase(handleBookAppointmentThunk.rejected, (state, action) => {
      state.bookingError = action.payload as string;
      state.bookingLoading = false;
      state.bookingStatus = 'failed';
    });

    // Fetch Patient Appointments
    builder.addCase(fetchPatientAppointmentsThunk.fulfilled, (state, action) => {
      state.appointments = action.payload || [];
      
      // Update booking status based on latest appointments
      const recentAppointment = action.payload.find((appt: Appointment)=> 
        new Date(appt.created_at).getTime() > Date.now() - 300000 // Last 5 minutes
      );
      
      if (recentAppointment) {
        if (recentAppointment.payment_status === 'paid' && recentAppointment.status === 'confirmed') {
          state.bookingStatus = 'confirmed';
        } else if (recentAppointment.payment_status === 'failed') {
          state.bookingStatus = 'failed';
        } else if (recentAppointment.payment_status === 'paid') {
          state.bookingStatus = 'paid';
        }
      }
    });
    
    builder.addCase(fetchPatientAppointmentsThunk.rejected, (state) => {
      // Keep existing appointments on error
    });

    // Verify Payment
    builder.addCase(verifyPaymentThunk.pending, (state) => {
      state.bookingStatus = 'pending';
      state.bookingLoading = true;
    });
    
    builder.addCase(verifyPaymentThunk.fulfilled, (state, action) => {
      state.bookingLoading = false;
      if (action.payload.status === 'success') {
        state.bookingStatus = 'paid';
        state.successMessage = 'Payment verified! Confirming appointment...';
      } else {
        state.bookingStatus = 'failed';
        state.bookingError = 'Payment verification failed';
      }
    });
    
    builder.addCase(verifyPaymentThunk.rejected, (state) => {
      state.bookingStatus = 'failed';
      state.bookingLoading = false;
      state.bookingError = 'Payment verification failed';
    });

    // Poll for Confirmation
    builder.addCase(pollForConfirmationThunk.pending, (state) => {
      state.bookingLoading = true;
    });
    
    builder.addCase(pollForConfirmationThunk.fulfilled, (state) => {
      state.bookingLoading = false;
      // Status will be updated by fetchPatientAppointmentsThunk
    });
    
    builder.addCase(pollForConfirmationThunk.rejected, (state) => {
      state.bookingLoading = false;
    });

    // Check Doctor Availability
    builder.addCase(checkDoctorAvailabilityThunk.fulfilled, (state, action) => {
      // Update doctor availability in schedule if needed
      if (state.schedule) {
        state.schedule.dailySchedules = state.schedule.dailySchedules.map(day => {
          if (day.date === action.payload.date) {
            return {
              ...day,
              timeSlots: day.timeSlots.map(slot => {
                if (slot.id === action.payload.slotId) {
                  return {
                    ...slot,
                    assignedDoctors: slot.assignedDoctors.map(doctor => {
                      if (doctor.doctorId === action.payload.doctorId) {
                        return {
                          ...doctor,
                          isAvailable: action.payload.isAvailable,
                          isBooked: !action.payload.isAvailable
                        };
                      }
                      return doctor;
                    })
                  };
                }
                return slot;
              })
            };
          }
          return day;
        });
      }
    });
  }
});

// ============ EXPORTS ============
export const {
  setMedicalCenter,
  setSchedule,
  setLoading,
  setScheduleLoading,
  setError,
  setSelectedDateRange,
  setBookingModal,
  setAvailableDoctors,
  setBookingLoading,
  setBookingError,
  setSuccessMessage,
  setDoctorAvailability,
  setViewMode,
  setBookingStatus,
  handleSelectDoctorThunk,
  handleBackToDoctorSelectionThunk,
  clearSuccessMessage,
  clearBookingError,
  clearError,
  clearAllMessages,
  resetBookingState,
  syncPatientInfoFromStorage,
  closeBookingModal,
  updateAppointmentStatus
} = bookingSlice.actions;

export default bookingSlice.reducer;