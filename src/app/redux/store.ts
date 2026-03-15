import { configureStore } from '@reduxjs/toolkit';
import mainPageReducer from '@/app/redux/slices/mainPageSlice';
import addPractitionerReducer from '@/app/redux/slices/addPractitionerSlice';
import medicalStaffReducer from '@/app/redux/slices/medicalStaffSlice';
import weeklySchedulesReducer from '@/app/redux/slices/weeklyScheduleSlice';
import medicalCenterSettingsReducer from '@/app/redux/slices/medicalCenterSettingsSlice';
import medicalCenterReducer from '@/app/redux/slices/medicalSlice';
import editingNextWeekReducer from './slices/editingNextWeek';  
import authReducer from './slices/doctorLogin'; // Add auth slice
import scheduleReducer from './slices/DoctorSchedule'; // Add schedule slice
import doctorScheduleReducer from './slices/DoctorSchedule'; // Keep original if still needed
import entryReducer from '@/app/reduxPatient/slices/patient/entrySlice'
import bookingReducer from '@/app/reduxPatient/slices/patient/bookingSlice'
import profileReducer from '@/app/reduxPatient/slices/patient/profileSlice'

export const store = configureStore({
  reducer: {
    mainPage: mainPageReducer,
    medicalCenter: medicalCenterReducer,
    addPractitioner: addPractitionerReducer,
    medicalStaff: medicalStaffReducer,
    weeklySchedules: weeklySchedulesReducer,
    medicalCenterSettings: medicalCenterSettingsReducer,
    editingNextWeek: editingNextWeekReducer,
    auth: authReducer, // Add auth reducer
    schedule: scheduleReducer, // Add schedule reducer
    doctorSchedule: doctorScheduleReducer,

     profile: profileReducer,
    entry: entryReducer,
    booking: bookingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;