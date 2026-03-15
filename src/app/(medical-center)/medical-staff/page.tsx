'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/app/redux/lib/hooks';
import {
  fetchPractitioners,
  deletePractitioner,
  clearNotifications,
  Practitioner,
} from '@/app/redux/slices/medicalStaffSlice';

export default function MedicalStaff() {
  const dispatch = useAppDispatch();

  const {
    practitioners,
    loading,
    error,
    success,
  } = useAppSelector((state) => state.medicalStaff);

  useEffect(() => {
    dispatch(fetchPractitioners());
  }, [dispatch]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        dispatch(clearNotifications());
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error, success, dispatch]);

  const handleEditPractitioner = (practitioner: Practitioner) => {
    console.log('Edit practitioner:', practitioner);
  };

  const handleRemovePractitioner = async (practitionerId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to remove this practitioner? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      await dispatch(deletePractitioner(practitionerId)).unwrap();
    } catch (err) {
      console.error('Failed to remove practitioner:', err);
    }
  };

  const getPractitionerStatus = (practitioner: Practitioner) => {
    if (!practitioner.isActive) {
      return {
        label: 'Inactive',
        className: 'bg-red-100 text-red-700 ring-red-200',
      };
    }

    switch (practitioner.currentStatus) {
      case 'absent':
        return {
          label: 'Absent',
          className: 'bg-red-100 text-red-700 ring-red-200',
        };
      case 'busy':
        return {
          label: 'Busy',
          className: 'bg-blue-100 text-blue-700 ring-blue-200',
        };
      case 'on_break':
        return {
          label: 'On Break',
          className: 'bg-amber-100 text-amber-700 ring-amber-200',
        };
      case 'off_duty':
        return {
          label: 'Off Duty',
          className: 'bg-slate-100 text-slate-700 ring-slate-200',
        };
      default:
        return {
          label: 'Available',
          className: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        };
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'doctor':
        return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
      case 'nurse':
        return 'bg-violet-100 text-violet-700 ring-violet-200';
      case 'specialist':
        return 'bg-orange-100 text-orange-700 ring-orange-200';
      case 'surgeon':
        return 'bg-rose-100 text-rose-700 ring-rose-200';
      case 'therapist':
        return 'bg-sky-100 text-sky-700 ring-sky-200';
      case 'admin':
        return 'bg-slate-100 text-slate-700 ring-slate-200';
      default:
        return 'bg-gray-100 text-gray-700 ring-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';

    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalStaff = practitioners.length;
  const activeStaff = practitioners.filter((p) => p.isActive).length;
  const temporaryStaff = practitioners.filter((p) => p.isTemporary).length;
  const totalSpecializations = new Set(
    practitioners.flatMap((p) => p.specialization || [])
  ).size;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div>
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                Medical Center Portal
              </h1>
            </div>
          </div>
        </header>

        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white px-10 py-12 text-center shadow-sm">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Loading medical staff
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Please wait while we fetch practitioner information.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Medical Center Portal
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Medical Staff Management
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              View, manage, and organize all practitioners in your facility.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/mainPage"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>

            <Link
              href="/add-practitioner"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Practitioner
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {(error || success) && (
          <div className="mb-6 space-y-3">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
                {success}
              </div>
            )}
          </div>
        )}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Staff</p>
            <h3 className="mt-2 text-3xl font-bold text-slate-900">
              {totalStaff}
            </h3>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Active Staff</p>
            <h3 className="mt-2 text-3xl font-bold text-emerald-600">
              {activeStaff}
            </h3>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Specializations
            </p>
            <h3 className="mt-2 text-3xl font-bold text-violet-600">
              {totalSpecializations}
            </h3>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Temporary Staff</p>
            <h3 className="mt-2 text-3xl font-bold text-orange-600">
              {temporaryStaff}
            </h3>
          </div>
        </section>

        {practitioners.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl">
              👨‍⚕️
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              No medical staff found
            </h2>
            <p className="mx-auto mt-3 max-w-md text-slate-600">
              Add medical practitioners to start managing appointments,
              schedules, and staffing more easily.
            </p>
            <Link
              href="/add-practitioner"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Your First Practitioner
            </Link>
          </section>
        ) : (
          <section className="space-y-6">
            {practitioners.map((practitioner) => {
              const statusInfo = getPractitionerStatus(practitioner);
              const approvedUpcomingAbsences =
                practitioner.absences?.filter(
                  (absence) =>
                    absence.status === 'approved' &&
                    new Date(absence.endDate) >= new Date()
                ) || [];

              return (
                <article
                  key={practitioner._id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 px-6 py-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            {practitioner.name}
                          </h2>

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${getRoleColor(
                              practitioner.role
                            )}`}
                          >
                            {practitioner.role}
                          </span>

                          {practitioner.isTemporary && (
                            <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                              Temporary
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-slate-600">
                          Practitioner profile and professional details
                        </p>
                      </div>

                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row xl:flex-col">
                        <button
                          onClick={() => handleEditPractitioner(practitioner)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleRemovePractitioner(practitioner._id)
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 px-6 py-6">
                    {practitioner.specialization?.length > 0 && (
                      <section>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Specializations
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {practitioner.specialization.map((spec) => (
                            <span
                              key={spec}
                              className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-blue-200"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <InfoCard label="Email" value={practitioner.email || 'Not provided'} />
                      <InfoCard label="Phone" value={practitioner.phone || 'Not provided'} />
                      <InfoCard label="ID Number" value={practitioner.idNumber || 'Not provided'} />
                    </section>

                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <InfoCard
                        label="Qualification"
                        value={practitioner.qualification || 'Not provided'}
                      />
                      <InfoCard
                        label="License Number"
                        value={practitioner.licenseNumber || 'Not provided'}
                      />
                      <InfoCard
                        label="Experience"
                        value={`${practitioner.experience || 0} years`}
                      />
                      <InfoCard
                        label="Patient Load"
                        value={`${practitioner.currentPatientLoad || 0}/${practitioner.maxPatientsPerSlot || 0}`}
                      />
                    </section>

                    <section>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Availability
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {practitioner.availableFor?.includes('face-to-face') && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
                            Face-to-Face
                          </span>
                        )}

                        {practitioner.availableFor?.includes('online') && (
                          <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700 ring-1 ring-violet-200">
                            Online Consultation
                          </span>
                        )}

                        {!practitioner.availableFor?.length && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                            No availability set
                          </span>
                        )}
                      </div>
                    </section>

                    {approvedUpcomingAbsences.length > 0 && (
                      <section>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Upcoming Absences
                        </h3>

                        <div className="space-y-3">
                          {approvedUpcomingAbsences.slice(0, 3).map((absence) => (
                            <div
                              key={absence._id}
                              className="flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex items-start gap-3">
                                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                                <div>
                                  <p className="font-semibold text-red-700">
                                    {formatDate(absence.startDate)} - {formatDate(absence.endDate)}
                                  </p>
                                  <p className="text-sm text-red-600">
                                    {absence.reason || 'No reason provided'}
                                  </p>
                                </div>
                              </div>

                              <span className="self-start rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-red-700 ring-1 ring-red-200">
                                {absence.type?.replace(/_/g, ' ') || 'absence'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
};

function InfoCard({ label, value }: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900 sm:text-base">
        {value}
      </p>
    </div>
  );
}