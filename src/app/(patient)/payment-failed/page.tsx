'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

export default function PaymentFailed() {
  const searchParams = useSearchParams();
  const router = useRouter();

  

  return <div >payment failed</div>;
}
