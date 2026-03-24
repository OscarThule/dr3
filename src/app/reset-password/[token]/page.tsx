'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';

interface ResetPasswordResponse {
  message: string;
  success?: boolean;
}

export default function ResetPasswordPage() {
  const params = useParams();
  // token can be string or string[] (when dynamic route with multiple segments)
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('🔐 TOKEN FROM URL:', token);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setMessage('Invalid or missing reset token');
      return;
    }

    console.log('📤 Sending token to backend:', token);
    console.log('📦 Sending password:', password);

    try {
      setLoading(true);
      const res = await axios.put<ResetPasswordResponse>(
        `https://dmrs.onrender.com/api/medical-centers/reset-password/${token}`,
        { password }
      );
      console.log('✅ Backend response:', res.data);
      setMessage(res.data.message || 'Password reset successful');
    } catch (err: unknown) {
      let errorMessage = 'Reset failed';
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ message?: string }>;
        errorMessage = axiosError.response?.data?.message || axiosError.message || 'Reset failed';
        console.log('❌ Backend error:', axiosError.response?.data || axiosError.message);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow w-96 text-black"
      >
        <h1 className="text-xl font-bold mb-4 text-black">Reset Password</h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="w-full border border-gray-400 p-2 mb-3 text-black bg-white"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>

        {message && (
          <p className="mt-3 text-center text-black font-medium">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}