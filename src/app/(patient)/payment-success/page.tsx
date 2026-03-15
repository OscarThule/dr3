'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (!reference) return;

    // Optional: verify payment on backend
    axios.get(`https://dmrs.onrender.com/api/payments/verify/${reference}`)
      .then(res => {
        if (res.data.success) {
          router.push('/appointments'); // navigate to success page
        } else {
          router.push('/payment-failed'); // navigate to failed page
        }
      })
      .catch(() => router.push('/payment-failed'));
  }, [searchParams, router]);

  return <div>Processing your payment...</div>;
}
