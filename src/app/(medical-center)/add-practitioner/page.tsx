'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/app/redux/lib/hooks';
import {
  addPractitioner,
  setError,
  clearNotifications,
  NewPractitionerData,
} from '@/app/redux/slices/addPractitionerSlice';

// Import the working hours type from the slice if exported, otherwise define it locally
// For now, we assume the slice's WorkingHoursDay type is exported; adjust if not.
// If not exported, define it as:
// type WorkingHoursDay = {
//   day: string;
//   start: string;
//   end: string;
//   enabled: boolean;
//   // possibly other fields like id, sessionType, etc.
// };
// Since we don't have the slice code, we'll define it locally to match the conversion output.
type WorkingHoursDay = {
  day: string;
  start: string;
  end: string;
  enabled: boolean;
};

// Local UI types for working hours (nested sessions per day)
type TimeSlot = {
  enabled: boolean;
  start: string;
  end: string;
};

type WorkingDay = {
  day: string;
  morning: TimeSlot;
  afternoon: TimeSlot;
  night: TimeSlot;
  enabled: boolean;
};

// Form data type for UI state – uses WorkingDay[] for defaultWorkingHours
interface PractitionerFormData
  extends Omit<NewPractitionerData, 'specialization' | 'defaultWorkingHours'> {
  specialization: string[];
  defaultWorkingHours: WorkingDay[];
}

const inputClassName =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

const checkboxClassName =
  'h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500';

const cardClassName =
  'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm';

const getDefaultWorkingHours = (): WorkingDay[] => {
  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  return days.map((day) => ({
    day,
    morning: { enabled: true, start: '08:00', end: '12:00' },
    afternoon: { enabled: true, start: '13:00', end: '17:00' },
    night: { enabled: false, start: '18:00', end: '22:00' },
    enabled: !['saturday', 'sunday'].includes(day),
  }));
};

// Converts the UI working hours (nested per day with sessions) into the flat format
// expected by the slice.
const convertToWorkingHoursDays = (workingDays: WorkingDay[]): WorkingHoursDay[] => {
  const result: WorkingHoursDay[] = [];

  for (const daySchedule of workingDays) {
    if (!daySchedule.enabled) continue;

    const sessions = ['morning', 'afternoon', 'night'] as const;
    for (const session of sessions) {
      const slot = daySchedule[session];
      if (slot.enabled) {
        result.push({
          day: daySchedule.day,
          start: slot.start,
          end: slot.end,
          enabled: true,
        });
      }
    }
  }

  return result;
};

export default function AddPractitioner() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const { loading, error, success } = useAppSelector(
    (state) => state.addPractitioner
  );

  const [formData, setFormData] = useState<PractitionerFormData>({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
    password: '',
    specialization: [],
    qualification: '',
    licenseNumber: '',
    experience: 0,
    role: 'doctor',
    availableFor: ['face-to-face'],
    isActive: true,
    isTemporary: false,
    maxPatientsPerSlot: 4,
    notes: '',
    defaultWorkingHours: getDefaultWorkingHours(),
    hourlyRate: 0,
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatePassword, setGeneratePassword] = useState(true);
  const [showWorkingHours, setShowWorkingHours] = useState(false);

  const generateRandomPassword = (): string => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';

    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  };

  useEffect(() => {
    if (generatePassword) {
      const generatedPassword = generateRandomPassword();
      setFormData((prev) => ({ ...prev, password: generatedPassword }));
      setConfirmPassword(generatedPassword);
    }
  }, [generatePassword]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        dispatch(clearNotifications());
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error, success, dispatch]);

  const handleInputChange = (
    field: keyof PractitionerFormData,
    value: string | number | boolean | string[] | WorkingDay[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSpecializationChange = (value: string) => {
    const specializations = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setFormData((prev) => ({
      ...prev,
      specialization: specializations,
    }));
  };

  const handleWorkingHoursChange = (
    dayIndex: number,
    session: 'morning' | 'afternoon' | 'night',
    field: 'start' | 'end' | 'enabled',
    value: string | boolean
  ) => {
    setFormData((prev) => {
      const updatedHours = [...prev.defaultWorkingHours];

      updatedHours[dayIndex] = {
        ...updatedHours[dayIndex],
        [session]: {
          ...updatedHours[dayIndex][session],
          [field]: value,
        },
      };

      return { ...prev, defaultWorkingHours: updatedHours };
    });
  };

  const handleDayEnabledChange = (dayIndex: number, enabled: boolean) => {
    setFormData((prev) => {
      const updatedHours = [...prev.defaultWorkingHours];

      updatedHours[dayIndex] = {
        ...updatedHours[dayIndex],
        enabled,
      };

      return { ...prev, defaultWorkingHours: updatedHours };
    });
  };

  const toggleAvailability = (type: 'face-to-face' | 'online', checked: boolean) => {
    const updated = checked
      ? [...formData.availableFor, type]
      : formData.availableFor.filter((item) => item !== type);

    handleInputChange('availableFor', [...new Set(updated)]);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      idNumber: '',
      password: '',
      specialization: [],
      qualification: '',
      licenseNumber: '',
      experience: 0,
      role: 'doctor',
      availableFor: ['face-to-face'],
      isActive: true,
      isTemporary: false,
      maxPatientsPerSlot: 4,
      notes: '',
      defaultWorkingHours: getDefaultWorkingHours(),
      hourlyRate: 0,
    });
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.idNumber ||
      !formData.qualification ||
      !formData.licenseNumber
    ) {
      dispatch(setError('Please fill in all required fields.'));
      return;
    }

    if (!formData.password) {
      dispatch(setError('Password is required.'));
      return;
    }

    if (formData.password !== confirmPassword) {
      dispatch(setError('Passwords do not match.'));
      return;
    }

    if (formData.password.length < 6) {
      dispatch(setError('Password must be at least 6 characters long.'));
      return;
    }

    try {
      // Convert UI working hours to the flat format expected by the slice
      const convertedWorkingHours = convertToWorkingHoursDays(
        formData.defaultWorkingHours
      );

      // Now submissionData matches the slice's NewPractitionerData type
      const submissionData: NewPractitionerData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        idNumber: formData.idNumber,
        password: formData.password,
        specialization: formData.specialization,
        qualification: formData.qualification,
        licenseNumber: formData.licenseNumber,
        experience: Number(formData.experience) || 0,
        role: formData.role,
        availableFor: formData.availableFor,
        isActive: formData.isActive,
        isTemporary: formData.isTemporary,
        maxPatientsPerSlot: Number(formData.maxPatientsPerSlot) || 4,
        notes: formData.notes,
        defaultWorkingHours: convertedWorkingHours, // No cast needed because we typed it as WorkingHoursDay[]
        hourlyRate: Number(formData.hourlyRate) || 0,
      };

      const result = await dispatch(addPractitioner(submissionData)).unwrap();

      if (result.success) {
        resetForm();
        setTimeout(() => {
          router.push('/medical-staff');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to add practitioner:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Medical Center Portal</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Add New Practitioner
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Create a professional account for a doctor, nurse, specialist, or admin staff member.
            </p>
          </div>

          <button
            onClick={() => router.push('/medical-staff')}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Back to Staff
          </button>
        </div>
      </header>

      {(error || success) && (
        <div className="fixed right-4 top-4 z-50 w-full max-w-sm space-y-3">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-red-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">Error</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
                <button
                  onClick={() => dispatch(clearNotifications())}
                  className="text-red-500 transition hover:text-red-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-emerald-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-800">Success</p>
                  <p className="mt-1 text-sm text-emerald-700">{success}</p>
                </div>
                <button
                  onClick={() => dispatch(clearNotifications())}
                  className="text-emerald-500 transition hover:text-emerald-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className={cardClassName}>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
              <p className="mt-1 text-sm text-slate-600">
                Basic details for the practitioner profile.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={inputClassName}
                  placeholder="Dr. John Smith"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  ID Number *
                </label>
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange('idNumber', e.target.value)}
                  className={inputClassName}
                  placeholder="8001015000089"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={inputClassName}
                  placeholder="john.smith@medical.co.za"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={inputClassName}
                  placeholder="+27 11 123 4567"
                />
              </div>
            </div>
          </section>

          <section className={cardClassName}>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Professional Information</h2>
              <p className="mt-1 text-sm text-slate-600">
                Role, qualification, registration, and specialization details.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className={inputClassName}
                  required
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="specialist">Specialist</option>
                  <option value="surgeon">Surgeon</option>
                  <option value="therapist">Therapist</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Qualification *
                </label>
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => handleInputChange('qualification', e.target.value)}
                  className={inputClassName}
                  placeholder="MBChB, MMed"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  License Number *
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  className={inputClassName}
                  placeholder="MP123456"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Experience (Years)
                </label>
                <input
                  type="number"
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  className={inputClassName}
                  min="0"
                  max="50"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Specializations
              </label>
              <input
                type="text"
                value={formData.specialization.join(', ')}
                onChange={(e) => handleSpecializationChange(e.target.value)}
                className={inputClassName}
                placeholder="General Practice, Family Medicine"
              />
              <p className="mt-2 text-xs text-slate-500">
                Separate multiple specializations with commas.
              </p>
            </div>
          </section>

          <section className={cardClassName}>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Availability & Status</h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose how this practitioner can work and whether they are active.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-4 text-sm font-semibold text-slate-700">Available For</p>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      checked={formData.availableFor.includes('face-to-face')}
                      onChange={(e) => toggleAvailability('face-to-face', e.target.checked)}
                      className={checkboxClassName}
                    />
                    <span className="text-sm font-medium text-slate-800">
                      Face-to-Face Consultations
                    </span>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      checked={formData.availableFor.includes('online')}
                      onChange={(e) => toggleAvailability('online', e.target.checked)}
                      className={checkboxClassName}
                    />
                    <span className="text-sm font-medium text-slate-800">
                      Online Consultations
                    </span>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-4 text-sm font-semibold text-slate-700">Staff Status</p>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      checked={formData.isTemporary}
                      onChange={(e) => handleInputChange('isTemporary', e.target.checked)}
                      className={checkboxClassName}
                    />
                    <span className="text-sm font-medium text-slate-800">
                      Temporary Staff Member
                    </span>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                      className={checkboxClassName}
                    />
                    <span className="text-sm font-medium text-slate-800">
                      Active Practitioner
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className={cardClassName}>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Capacity & Billing</h2>
              <p className="mt-1 text-sm text-slate-600">
                Configure patient load and standard hourly rate.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Max Patients Per Slot
                </label>
                <input
                  type="number"
                  value={formData.maxPatientsPerSlot}
                  onChange={(e) => handleInputChange('maxPatientsPerSlot', e.target.value)}
                  className={inputClassName}
                  min="1"
                  max="10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Hourly Rate (ZAR)
                </label>
                <input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                  className={inputClassName}
                  min="0"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setShowWorkingHours(!showWorkingHours)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {showWorkingHours ? 'Hide Working Hours' : 'Show Working Hours'}
                </button>
              </div>
            </div>

            {showWorkingHours && (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">Default Working Hours</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Set enabled days and time sessions for the practitioner.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {formData.defaultWorkingHours.map((daySchedule, index) => (
                    <div
                      key={daySchedule.day}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={daySchedule.enabled}
                            onChange={(e) => handleDayEnabledChange(index, e.target.checked)}
                            className={checkboxClassName}
                          />
                          <span className="text-sm font-bold capitalize text-slate-900">
                            {daySchedule.day}
                          </span>
                        </label>
                      </div>

                      {daySchedule.enabled && (
                        <div className="space-y-4">
                          {(['morning', 'afternoon', 'night'] as const).map((session) => (
                            <div
                              key={session}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <label className="mb-3 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={daySchedule[session].enabled}
                                  onChange={(e) =>
                                    handleWorkingHoursChange(
                                      index,
                                      session,
                                      'enabled',
                                      e.target.checked
                                    )
                                  }
                                  className={checkboxClassName}
                                />
                                <span className="text-sm font-semibold capitalize text-slate-800">
                                  {session}
                                </span>
                              </label>

                              {daySchedule[session].enabled && (
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                  <input
                                    type="time"
                                    value={daySchedule[session].start}
                                    onChange={(e) =>
                                      handleWorkingHoursChange(
                                        index,
                                        session,
                                        'start',
                                        e.target.value
                                      )
                                    }
                                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                  />
                                  <span className="text-xs font-medium text-slate-500">to</span>
                                  <input
                                    type="time"
                                    value={daySchedule[session].end}
                                    onChange={(e) =>
                                      handleWorkingHoursChange(
                                        index,
                                        session,
                                        'end',
                                        e.target.value
                                      )
                                    }
                                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className={cardClassName}>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Account Settings</h2>
              <p className="mt-1 text-sm text-slate-600">
                Set a password manually or generate one automatically.
              </p>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password *
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={generatePassword}
                  className={`${inputClassName} disabled:bg-slate-100 disabled:text-slate-500`}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Confirm Password *
                </label>
                <input
                  type="text"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={generatePassword}
                  className={`${inputClassName} disabled:bg-slate-100 disabled:text-slate-500`}
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={generatePassword}
                onChange={(e) => setGeneratePassword(e.target.checked)}
                className={checkboxClassName}
              />
              <span className="text-sm font-medium text-slate-800">
                Generate random password automatically
              </span>
            </label>

            {generatePassword && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-800">
                  Login Details for Practitioner
                </p>

                <div className="mt-3 space-y-2 text-sm text-blue-900">
                  <p>
                    <span className="font-semibold">ID Number:</span>{' '}
                    {formData.idNumber || 'Not set'}
                  </p>
                  <p className="break-all">
                    <span className="font-semibold">Password:</span>{' '}
                    {formData.password || 'Will be generated'}
                  </p>
                </div>

                <p className="mt-3 text-xs text-blue-700">
                  Practitioner will use their ID Number and this password to log in.
                </p>
              </div>
            )}
          </section>

          <section className={cardClassName}>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">Additional Notes</h2>
              <p className="mt-1 text-sm text-slate-600">
                Optional internal notes for this practitioner.
              </p>
            </div>

            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className={`${inputClassName} resize-none`}
              placeholder="Additional information about this practitioner..."
            />
          </section>

          <div className="flex flex-col justify-end gap-3 border-t border-slate-200 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push('/medical-staff')}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {loading ? 'Creating...' : 'Create Practitioner'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}