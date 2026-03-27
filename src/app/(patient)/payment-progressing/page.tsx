'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

function PaymentProcessingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    if (!reference) {
      router.replace('/payment-failed');
      return;
    }

    const verifyPayment = async () => {
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || 'https://dmrs.onrender.com/api';

      const maxAttempts = 6;
      const delay = 2500;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const res = await axios.get(
            `${API_BASE_URL}/payments/verify/${reference}`
          );

          const paymentStatus = res.data?.data?.status;

          if (paymentStatus === 'success') {
            router.replace('/payment-success');
            return;
          }

          if (paymentStatus === 'failed' || paymentStatus === 'abandoned') {
            router.replace('/payment-failed');
            return;
          }
        } catch (error) {
          console.error('Verification attempt failed:', error);
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      router.replace('/payment-failed');
    };

    verifyPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-700 font-medium">Verifying your payment...</p>
      </div>
    </div>
  );
}

function Fallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      Loading...
    </div>
  );
}

export default function PaymentProcessingPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PaymentProcessingContent />
    </Suspense>
  );
}