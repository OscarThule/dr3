'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function PaymentFailedContent() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/entry');
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Payment Failed
        </h1>

        <p className="text-gray-600 mb-4">
          Your payment was not completed. Please try again.
        </p>

        <p className="text-sm text-gray-500">
          Redirecting to entry page in 5 seconds...
        </p>

        <button
          onClick={() => router.replace('/entry')}
          className="w-full mt-4 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition"
        >
          Go Now
        </button>
      </div>
    </div>
  );
}

function PaymentFailedFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      Loading...
    </div>
  );
}

export default function PaymentFailed() {
  return (
    <Suspense fallback={<PaymentFailedFallback />}>
      <PaymentFailedContent />
    </Suspense>
  );
}