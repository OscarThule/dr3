'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { getAuthToken } from '@/app/reduxPatient/slices/patient/profileSlice';

// ========== Types ==========
interface MedicalCenterAddress {
  line1?: string;
  line2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

interface PopulatedMedicalCenter {
  _id?: string;
  facility_name?: string;
  address?: MedicalCenterAddress;
  phone?: string;
}

interface Appointment {
  _id: string;
  appointment_id: string;
  patient_id: string;
  medical_center_id: string | PopulatedMedicalCenter;
  practitioner_id: string;
  schedule_id: string;
  date: string;
  slot_id: string;
  slot_start: string;
  slot_end: string;
  doctor_name: string;
  doctor_role: string;
  doctor_specialization: string[];
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  reason_for_visit: string;
  symptoms: string;
  preferred_specialization: string;
  consultation_type: 'face-to-face' | 'telemedicine' | 'follow-up';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show' | 'rescheduled';
  payment_status: 'pending' | 'success' | 'failed' | 'refunded' | 'none';
  payment_reference: string | null;
  is_paid: boolean;
  consultation_fee: number;
  deposit_amount: number;
  platform_fee: number;
  total_amount: number;
  currency: string;
  payment_required: boolean;
  payment_amount_paid: number;
  notes: string;
  confirmation_sent: boolean;
  reminder_sent: boolean;
  appointment_duration: number;
  createdAt: string;
  updatedAt: string;
  medical_center?: PopulatedMedicalCenter;
}

interface ApiResponse {
  success: boolean;
  data?: Appointment[];
  message?: string;
}

const API_BASE_URL = 'https://dmrs.onrender.com/api';

// ========== Helper Functions ==========
function formatCurrency(amount?: number, currency = 'ZAR'): string {
  const safeAmount = Number(amount || 0);
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `R ${safeAmount.toFixed(2)}`;
  }
}

function getAxiosErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeString: string): string {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

function getStatusColor(status: Appointment['status']): string {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'rescheduled':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getPaymentStatusColor(status: Appointment['payment_status']): string {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-blue-100 text-blue-800';
    case 'none':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusText(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
}

function getCenterName(appointment: Appointment): string {
  if (typeof appointment.medical_center_id === 'object' && appointment.medical_center_id !== null) {
    return appointment.medical_center_id.facility_name || 'Medical Center';
  }
  return appointment.medical_center?.facility_name || 'Medical Center';
}

function getCenterId(appointment: Appointment): string {
  if (typeof appointment.medical_center_id === 'object' && appointment.medical_center_id !== null) {
    return appointment.medical_center_id._id || '';
  }
  return appointment.medical_center_id || '';
}

// ========== Main Component ==========
export default function PatientAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        setError('You are not logged in');
        setLoading(false);
        return;
      }

      const response = await axios.get<ApiResponse>(`${API_BASE_URL}/bookings/patient`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data?.success) {
        setError('Failed to fetch appointments');
        return;
      }

      // FIX: Use const because allAppointments is never reassigned
      const allAppointments: Appointment[] = response.data.data || [];
      const now = new Date();

      let filteredAppointments: Appointment[] = [];
      if (filter === 'upcoming') {
        filteredAppointments = allAppointments.filter((appt) => {
          const apptDate = new Date(appt.date);
          const [h, m] = appt.slot_start.split(':').map(Number);
          apptDate.setHours(h, m, 0, 0);
          return apptDate > now && appt.status !== 'cancelled';
        });
      } else if (filter === 'past') {
        filteredAppointments = allAppointments.filter((appt) => {
          const apptDate = new Date(appt.date);
          const [h, m] = appt.slot_start.split(':').map(Number);
          apptDate.setHours(h, m, 0, 0);
          return apptDate <= now || appt.status === 'cancelled';
        });
      } else {
        filteredAppointments = allAppointments;
      }

      filteredAppointments.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return filter === 'upcoming' ? dateA - dateB : dateB - dateA;
      });

      setAppointments(filteredAppointments);
    } catch (err: unknown) {
      const message = getAxiosErrorMessage(err, 'Unexpected error while fetching appointments');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      const token = getAuthToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.put<{ success: boolean }>(
        `${API_BASE_URL}/bookings/${appointmentId}/cancel`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        alert('Appointment cancelled successfully');
        fetchAppointments();
      } else {
        alert('Failed to cancel appointment');
      }
    } catch (err: unknown) {
      alert(getAxiosErrorMessage(err, 'Failed to cancel appointment'));
    }
  };

  // ========== JSX ==========
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/entry')}
                className="mr-3 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">My Appointments</h1>
                <p className="text-sm text-gray-500">View and manage your appointments</p>
              </div>
            </div>

            <button
              onClick={() => router.push('/booking')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Book New Appointment
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex space-x-2 border-b border-gray-200">
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 text-sm font-medium ${
                filter === 'upcoming'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Upcoming
            </button>

            <button
              onClick={() => setFilter('past')}
              className={`px-4 py-2 text-sm font-medium ${
                filter === 'past'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Past & Cancelled
            </button>

            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium ${
                filter === 'all'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All Appointments
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading appointments...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Appointments</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchAppointments}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No {filter} appointments</h3>
            <p className="text-gray-500 mb-6">
              {filter === 'upcoming'
                ? "You don't have any upcoming appointments scheduled."
                : filter === 'past'
                ? "You don't have any past appointments."
                : "You don't have any appointments yet."}
            </p>
            <button
              onClick={() => router.push('/booking')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium"
            >
              Book Your First Appointment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const remainingBalance = Math.max(
                Number(appointment.consultation_fee || 0) - Number(appointment.deposit_amount || 0),
                0
              );
              const centerName = getCenterName(appointment);
              const centerId = getCenterId(appointment);

              return (
                <div
                  key={appointment._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-800">
                                Dr. {appointment.doctor_name}
                              </h3>

                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                                {getStatusText(appointment.status)}
                              </span>

                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(appointment.payment_status)}`}>
                                Payment {getStatusText(appointment.payment_status)}
                              </span>

                              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                                {appointment.consultation_type.replace('-', ' ')}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="font-medium">Date:</span>
                                  <span>{formatDate(appointment.date)}</span>
                                </div>

                                <div className="flex items-center gap-2 text-gray-600">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="font-medium">Time:</span>
                                  <span>
                                    {formatTime(appointment.slot_start)} - {formatTime(appointment.slot_end)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  <span className="font-medium">Medical Center:</span>
                                  <span>{centerName}</span>
                                </div>

                                <div className="flex items-center gap-2 text-gray-600">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="font-medium">Appointment ID:</span>
                                  <span className="font-mono text-sm">{appointment.appointment_id}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 mb-5">
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Reason for Visit:</h4>
                                <p className="text-gray-600">{appointment.reason_for_visit}</p>
                              </div>

                              {appointment.symptoms && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-1">Symptoms:</h4>
                                  <p className="text-gray-600">{appointment.symptoms}</p>
                                </div>
                              )}

                              {appointment.notes && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-1">Notes:</h4>
                                  <p className="text-gray-600">{appointment.notes}</p>
                                </div>
                              )}
                            </div>

                            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-3.866 0-7 1.79-7 4v5h14v-5c0-2.21-3.134-4-7-4zm0 0V5m0 3v3m0-3c1.657 0 3-1.343 3-3S13.657 2 12 2 9 3.343 9 5s1.343 3 3 3z" />
                                </svg>
                                <h4 className="text-sm font-bold text-green-800">Payment Summary</h4>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-700">
                                  <span>Consultation Fee</span>
                                  <span>{formatCurrency(appointment.consultation_fee, appointment.currency)}</span>
                                </div>

                                <div className="flex justify-between text-gray-700">
                                  <span>Booking Deposit</span>
                                  <span>{formatCurrency(appointment.deposit_amount, appointment.currency)}</span>
                                </div>

                                <div className="flex justify-between text-gray-700">
                                  <span>Platform Fee</span>
                                  <span>{formatCurrency(appointment.platform_fee, appointment.currency)}</span>
                                </div>

                                <div className="flex justify-between font-semibold text-gray-900 border-t border-green-200 pt-2">
                                  <span>Total Amount To Pay</span>
                                  <span>{formatCurrency(appointment.total_amount, appointment.currency)}</span>
                                </div>

                                <div className="flex justify-between font-semibold text-gray-900">
                                  <span>Amount Paid</span>
                                  <span>{formatCurrency(appointment.payment_amount_paid, appointment.currency)}</span>
                                </div>

                                <div className="flex justify-between font-semibold text-gray-900">
                                  <span>Remaining Balance</span>
                                  <span>{formatCurrency(remainingBalance, appointment.currency)}</span>
                                </div>

                                <div className="flex justify-between text-xs text-gray-600 pt-2">
                                  <span>Payment Required: {appointment.payment_required ? 'Yes' : 'No'}</span>
                                  <span>Paid: {appointment.is_paid ? 'Yes' : 'No'}</span>
                                </div>

                                {appointment.payment_reference && (
                                  <div className="pt-2 text-xs text-gray-600 break-all">
                                    Payment Ref: {appointment.payment_reference}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {appointment.status === 'pending' || appointment.status === 'confirmed' ? (
                          <>
                            <button
                              onClick={() => handleCancelAppointment(appointment._id)}
                              className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                            >
                              Cancel Appointment
                            </button>

                            <button
                              onClick={() => router.push(`/booking?medicalCenterId=${centerId}`)}
                              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                            >
                              Book Similar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => router.push(`/booking?medicalCenterId=${centerId}`)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Book Again
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        Created: {new Date(appointment.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Duration: {appointment.appointment_duration} minutes
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}