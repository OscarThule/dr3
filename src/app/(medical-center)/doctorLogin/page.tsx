'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/app/redux/lib/hooks';
import { 
  loginPractitioner, 
  forgotPassword, 
  resetPassword,
  clearForgotPasswordState,
  clearResetPasswordState 
} from '@/app/redux/slices/doctorLogin';
import { selectAuth, selectForgotPassword, selectResetPassword } from '@/app/redux/slices/doctorLogin';

type FormMode = 'login' | 'forgot' | 'reset';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { session, token, loading, error } = useAppSelector(selectAuth);
  const forgotPasswordState = useAppSelector(selectForgotPassword);
  const resetPasswordState = useAppSelector(selectResetPassword);

  const [mode, setMode] = useState<FormMode>('login');
  
  const [resetToken, setResetToken] = useState<string>('');
  
  const [loginData, setLoginData] = useState({
    idNumber: '',
    password: ''
  });
  
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: ''
  });
  
  const [resetPasswordData, setResetPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');

  // Check for reset token in URL
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setResetToken(tokenParam);
      setMode('reset');
    }
  }, [searchParams]);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (session && token && !loading && !error) {
      router.push('/doctor-schedule');
    }
  }, [session, token, loading, error, router]);

  // Auto-switch back to login after successful reset
  useEffect(() => {
    if (resetPasswordState.success) {
      setTimeout(() => {
        setMode('login');
        dispatch(clearResetPasswordState());
      }, 3000);
    }
  }, [resetPasswordState.success, dispatch]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(loginPractitioner(loginData));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordData.email) {
      return;
    }
    await dispatch(forgotPassword(forgotPasswordData.email));
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    if (resetPasswordData.password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    
    setPasswordError('');
    await dispatch(resetPassword({ 
      token: resetToken, 
      password: resetPasswordData.password 
    }));
  };

  

  const renderLoginForm = () => (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Medical Center Portal</h1>
        <p className="text-gray-600 mt-2">Practitioner Login</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {error.includes("Invalid") || error.includes("401")
                  ? "Invalid ID number or password. Please try again."
                  : error}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ID Number
          </label>
          <input
            type="text"
            value={loginData.idNumber}
            onChange={(e) => setLoginData({ ...loginData, idNumber: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="Enter your ID number"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            value={loginData.password}
            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="Enter your password"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setMode('forgot')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition"
          >
            Forgot your password?
          </button>
        </div>
      </form>
    </>
  );

  const renderForgotPasswordForm = () => (
    <>
      <div className="text-center mb-8">
        <button
          onClick={() => setMode('login')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to login
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
        <p className="text-gray-600 mt-2">Enter your email to receive a reset link</p>
      </div>

      <form onSubmit={handleForgotPassword} className="space-y-6">
        {forgotPasswordState.error && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{forgotPasswordState.error}</span>
            </div>
          </div>
        )}

        {forgotPasswordState.success ? (
          <div className="p-4 bg-green-100 border border-green-300 text-green-800 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium">Reset link sent!</p>
                <p className="text-sm mt-1">Check your email for the password reset link. The link will expire in 15 minutes.</p>
              </div>
            </div>
            <button
              onClick={() => setMode('login')}
              className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={forgotPasswordData.email}
                onChange={(e) => setForgotPasswordData({ email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your registered email"
                required
                disabled={forgotPasswordState.loading}
              />
              <p className="text-sm text-gray-500 mt-1">
                You will receive a password reset link via email.
              </p>
            </div>

            <button
              type="submit"
              disabled={forgotPasswordState.loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg"
            >
              {forgotPasswordState.loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sending reset link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </>
        )}
      </form>
    </>
  );

  const renderResetPasswordForm = () => (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
        <p className="text-gray-600 mt-2">Create a new secure password</p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-6">
        {resetPasswordState.error && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{resetPasswordState.error}</span>
            </div>
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{passwordError}</span>
            </div>
          </div>
        )}

        {resetPasswordState.success ? (
          <div className="p-4 bg-green-100 border border-green-300 text-green-800 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium">Password reset successful!</p>
                <p className="text-sm mt-1">You can now log in with your new password.</p>
              </div>
            </div>
            <button
              onClick={() => setMode('login')}
              className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={resetPasswordData.password}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter new password (min. 8 characters)"
                required
                minLength={8}
                disabled={resetPasswordState.loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={resetPasswordData.confirmPassword}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Confirm new password"
                required
                disabled={resetPasswordState.loading}
              />
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium">Password requirements:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Minimum 8 characters</li>
                <li>Use a combination of letters and numbers</li>
                <li>Avoid common passwords</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={resetPasswordState.loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg"
            >
              {resetPasswordState.loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Resetting password...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </>
        )}
      </form>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {mode === 'login' && renderLoginForm()}
        {mode === 'forgot' && renderForgotPasswordForm()}
        {mode === 'reset' && renderResetPasswordForm()}

        {/* Help Section for login mode only */}
        {mode === 'login' && (
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact your medical center administrator
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Use your assigned ID number and password to access your schedule
            </p>
          </div>
        )}
      </div>
    </div>
  );
}