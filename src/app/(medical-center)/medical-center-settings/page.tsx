'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/app/redux/lib/hooks';
import {
  fetchPaymentSettings,
  updatePaymentSettings,
} from '@/app/redux/slices/medicalCenterSettingsSlice';

export default function PaymentSettingsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { settings, loading, error } = useAppSelector(
    (state) => state.medicalCenterSettings
  );

  const [form, setForm] = useState({
    consultationFee: 0,
    onlineConsultationFee: 0,
    depositPercentage: 0,
    allowPartialPayments: false,
  });

  useEffect(() => {
    dispatch(fetchPaymentSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) {
      setForm({
        consultationFee: settings.consultationFee || 0,
        onlineConsultationFee: settings.onlineConsultationFee || 0,
        depositPercentage: settings.depositPercentage || 0,
        allowPartialPayments: settings.allowPartialPayments || false,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    await dispatch(
      updatePaymentSettings({
        consultationFee: Number(form.consultationFee) || 0,
        onlineConsultationFee: Number(form.onlineConsultationFee) || 0,
        depositPercentage: Number(form.depositPercentage) || 0,
        allowPartialPayments: form.allowPartialPayments,
      })
    );
  };

  const depositAmountPreview = useMemo(() => {
    return Math.round((Number(form.consultationFee) * Number(form.depositPercentage)) / 100);
  }, [form.consultationFee, form.depositPercentage]);

  const onlineDepositAmountPreview = useMemo(() => {
    return Math.round(
      (Number(form.onlineConsultationFee) * Number(form.depositPercentage)) / 100
    );
  }, [form.onlineConsultationFee, form.depositPercentage]);

  const inputClassName =
    'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Medical Center Portal</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Payment Settings
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Configure consultation fees, deposits, and payment flexibility.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/doctorLogin"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Doctor Schedule
            </Link>

            <Link
              href="/mainPage"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {(loading || error) && (
          <div className="mb-6 space-y-3">
            {loading && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                Loading payment settings...
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">Consultation Fees</h2>
              <p className="mt-1 text-sm text-slate-600">
                Set your in-person and online consultation pricing.
              </p>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Face-to-Face Consultation Fee (R)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.consultationFee}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      consultationFee: Number(e.target.value),
                    })
                  }
                  className={inputClassName}
                  placeholder="Enter consultation fee"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Online Consultation Fee (R)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.onlineConsultationFee}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      onlineConsultationFee: Number(e.target.value),
                    })
                  }
                  className={inputClassName}
                  placeholder="Enter online consultation fee"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Deposit Required (%)
                    </label>
                    <p className="mt-1 text-xs text-slate-500">
                      Choose how much patients must pay upfront.
                    </p>
                  </div>

                  <div className="rounded-full bg-blue-100 px-4 py-1.5 text-sm font-bold text-blue-700">
                    {form.depositPercentage}%
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.depositPercentage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      depositPercentage: Number(e.target.value),
                    })
                  }
                  className="w-full accent-blue-600"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.allowPartialPayments}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        allowPartialPayments: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Allow partial payments
                    </p>
                    <p className="text-xs text-slate-500">
                      Let patients pay only the deposit first and settle the balance later.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
                <button
                  onClick={() => router.back()}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  disabled={loading}
                  onClick={handleSave}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Summary Preview</h3>
              <p className="mt-1 text-sm text-slate-600">
                Quick view of your current payment structure.
              </p>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Face-to-Face Fee
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    R{Number(form.consultationFee || 0).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Online Fee
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    R{Number(form.onlineConsultationFee || 0).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Required Deposit
                  </p>
                  <p className="mt-2 text-2xl font-bold text-blue-800">
                    {form.depositPercentage}%
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-blue-700">
                    <p>
                      Face-to-face deposit: <span className="font-semibold">R{depositAmountPreview}</span>
                    </p>
                    <p>
                      Online deposit: <span className="font-semibold">R{onlineDepositAmountPreview}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Partial Payments
                  </p>
                  <p
                    className={`mt-2 text-base font-bold ${
                      form.allowPartialPayments ? 'text-emerald-700' : 'text-slate-700'
                    }`}
                  >
                    {form.allowPartialPayments ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Tips</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>
                  Set realistic consultation fees that match your service type and location.
                </p>
                <p>
                  Higher deposit percentages can reduce no-shows but may discourage some patients.
                </p>
                <p>
                  Partial payments are useful when you want patients to secure a booking first.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}