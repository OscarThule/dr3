'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ResetPasswordPatientPage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("🔐 PATIENT TOKEN FROM URL:", token);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📤 Sending patient token:", token);
    console.log("📦 New password:", password);

    try {
      setLoading(true);
      const res = await axios.put(
        `https://dmrs.onrender.com/api/patients/reset-password/${token}`,
        { password }
      );
      console.log("✅ Backend response:", res.data);
      setMessage(res.data.message || 'Password reset successful');
    } catch (err: any) {
      console.log("❌ Backend error:", err.response?.data || err.message);
      setMessage(err.response?.data?.message || 'Reset failed');
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
        <h1 className="text-xl font-bold mb-4 text-black">
          Reset Patient Password
        </h1>

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
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
