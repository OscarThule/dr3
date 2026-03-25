'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference) return;

    const verifyPayment = async () => {
      try {
        const res = await axios.get(
          `https://dmrs.onrender.com/api/payments/verify/${reference}`
        );

        if (res.data?.success) {
          router.push('/appointments');
        } else {
          router.push('/payment-failed');
        }
      } catch {
        router.push('/payment-failed');
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-700 font-medium">Processing your payment...</p>
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

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}