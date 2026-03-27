'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/appointments');
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-green-700 mb-2">
          Payment Successful 🎉
        </h1>

        <p className="text-gray-700 mb-4">
          Your appointment has been confirmed.
        </p>

        <p className="text-sm text-gray-500">
          Redirecting to your appointments in 10 seconds...
        </p>

        {/* Optional: manual button */}
        <button
          onClick={() => router.replace('/appointments')}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
        >
          Go Now
        </button>
      </div>
    </div>
  );
}