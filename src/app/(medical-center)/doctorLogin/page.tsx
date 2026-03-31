'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/app/redux/lib/hooks';
import {
  loginPractitioner,
  forgotPassword,
  resetPassword,
  clearForgotPasswordState,
  clearResetPasswordState,
} from '@/app/redux/slices/doctorLogin';
import {
  selectAuth,
  selectForgotPassword,
  selectResetPassword,
} from '@/app/redux/slices/doctorLogin';

type FormMode = 'login' | 'forgot' | 'reset';

const inputClassName =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 placeholder:text-slate-400 caret-slate-900 shadow-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

const primaryButtonClassName =
  'w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center';

const secondaryButtonClassName =
  'w-full rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-green-700';

function MessageBox({
  type,
  children,
}: {
  type: 'error' | 'success' | 'warning';
  children: React.ReactNode;
}) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  };

  return (
    <div className={`rounded-2xl border p-4 ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {type === 'error' && (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          {type === 'success' && (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {type === 'warning' && (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1 text-sm">{children}</div>
      </div>
    </div>
  );
}

function DoctorLoginContent() {
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
    password: '',
  });
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: '',
  });
  const [resetPasswordData, setResetPasswordData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setResetToken(tokenParam);
      setMode('reset');
    }
  }, [searchParams]);

  useEffect(() => {
    if (session && token && !loading && !error) {
      router.push('/doctor-schedule');
    }
  }, [session, token, loading, error, router]);

  useEffect(() => {
    if (resetPasswordState.success) {
      const timeout = setTimeout(() => {
        setMode('login');
        dispatch(clearResetPasswordState());
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [resetPasswordState.success, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(clearForgotPasswordState());
      dispatch(clearResetPasswordState());
    };
  }, [dispatch]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await dispatch(loginPractitioner(loginData));
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!forgotPasswordData.email) return;
    await dispatch(forgotPassword(forgotPasswordData.email));
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (resetPasswordData.password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    if (!resetToken) {
      setPasswordError('Reset token is missing or invalid');
      return;
    }

    setPasswordError('');

    await dispatch(
      resetPassword({
        token: resetToken,
        password: resetPasswordData.password,
      })
    );
  };

  const renderLoginForm = () => (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 11c0-1.657 1.343-3 3-3h1V7a4 4 0 10-8 0v1h1c1.657 0 3 1.343 3 3zm-6 0h12v7a2 2 0 01-2 2H8a2 2 0 01-2-2v-7z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Medical Center Portal</h1>
        <p className="mt-2 text-sm text-slate-600">Practitioner Login</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <MessageBox type="error">
            <span className="font-medium">
              {error.includes('Invalid') || error.includes('401')
                ? 'Invalid ID number or password. Please try again.'
                : error}
            </span>
          </MessageBox>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">ID Number</label>
          <input
            type="text"
            value={loginData.idNumber}
            onChange={(e) =>
              setLoginData((prev) => ({
                ...prev,
                idNumber: e.target.value,
              }))
            }
            className={inputClassName}
            placeholder="Enter your ID number"
            required
            disabled={loading}
            autoComplete="username"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
          <input
            type="password"
            value={loginData.password}
            onChange={(e) =>
              setLoginData((prev) => ({
                ...prev,
                password: e.target.value,
              }))
            }
            className={inputClassName}
            placeholder="Enter your password"
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" disabled={loading} className={primaryButtonClassName}>
          {loading ? (
            <>
              <div className="mr-2 h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              dispatch(clearForgotPasswordState());
              dispatch(clearResetPasswordState());
              setMode('forgot');
            }}
            className="text-sm font-medium text-blue-600 transition hover:text-blue-800"
          >
            Forgot your password?
          </button>
        </div>
      </form>
    </>
  );

  const renderForgotPasswordForm = () => (
    <>
      <div className="mb-8">
        <button
          type="button"
          onClick={() => {
            dispatch(clearForgotPasswordState());
            setMode('login');
          }}
          className="mb-5 inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <svg className="mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to login
        </button>

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 11c0-1.657 1.343-3 3-3h1V7a4 4 0 10-8 0v1h1c1.657 0 3 1.343 3 3zm-6 0h12v7a2 2 0 01-2 2H8a2 2 0 01-2-2v-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reset Password</h1>
          <p className="mt-2 text-sm text-slate-600">Enter your email to receive a reset link</p>
        </div>
      </div>

      <form onSubmit={handleForgotPassword} className="space-y-5">
        {forgotPasswordState.error && (
          <MessageBox type="error">
            <span className="font-medium">{forgotPasswordState.error}</span>
          </MessageBox>
        )}

        {forgotPasswordState.success ? (
          <div className="space-y-4">
            <MessageBox type="success">
              <div>
                <p className="font-semibold">Reset link sent!</p>
                <p className="mt-1">
                  Check your email for the password reset link. The link will expire in 15 minutes.
                </p>
              </div>
            </MessageBox>

            <button
              type="button"
              onClick={() => {
                dispatch(clearForgotPasswordState());
                setMode('login');
              }}
              className={secondaryButtonClassName}
            >
              Return to Login
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                value={forgotPasswordData.email}
                onChange={(e) =>
                  setForgotPasswordData({
                    email: e.target.value,
                  })
                }
                className={inputClassName}
                placeholder="Enter your registered email"
                required
                disabled={forgotPasswordState.loading}
                autoComplete="email"
              />
              <p className="mt-2 text-sm text-slate-500">
                You will receive a password reset link via email.
              </p>
            </div>

            <button
              type="submit"
              disabled={forgotPasswordState.loading}
              className={primaryButtonClassName}
            >
              {forgotPasswordState.loading ? (
                <>
                  <div className="mr-2 h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  Sending reset link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </>
        )}
      </form>
    </>
  );

  const renderResetPasswordForm = () => (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600 shadow-sm">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Set New Password</h1>
        <p className="mt-2 text-sm text-slate-600">Create a new secure password</p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-5">
        {resetPasswordState.error && (
          <MessageBox type="error">
            <span className="font-medium">{resetPasswordState.error}</span>
          </MessageBox>
        )}

        {passwordError && (
          <MessageBox type="warning">
            <span className="font-medium">{passwordError}</span>
          </MessageBox>
        )}

        {resetPasswordState.success ? (
          <div className="space-y-4">
            <MessageBox type="success">
              <div>
                <p className="font-semibold">Password reset successful!</p>
                <p className="mt-1">You can now log in with your new password.</p>
              </div>
            </MessageBox>

            <button
              type="button"
              onClick={() => {
                dispatch(clearResetPasswordState());
                setMode('login');
              }}
              className={secondaryButtonClassName}
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">New Password</label>
              <input
                type="password"
                value={resetPasswordData.password}
                onChange={(e) =>
                  setResetPasswordData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                className={inputClassName}
                placeholder="Enter new password (min. 8 characters)"
                required
                minLength={8}
                disabled={resetPasswordState.loading}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
              <input
                type="password"
                value={resetPasswordData.confirmPassword}
                onChange={(e) =>
                  setResetPasswordData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                className={inputClassName}
                placeholder="Confirm new password"
                required
                disabled={resetPasswordState.loading}
                autoComplete="new-password"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="mb-2 font-semibold text-slate-700">Password requirements:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Minimum 8 characters</li>
                <li>Use a combination of letters and numbers</li>
                <li>Avoid common passwords</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={resetPasswordState.loading}
              className={primaryButtonClassName}
            >
              {resetPasswordState.loading ? (
                <>
                  <div className="mr-2 h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  Resetting password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </>
        )}
      </form>
    </>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eff6ff_0%,#eef2ff_50%,#f8fafc_100%)] p-4 sm:p-6">
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:p-8">
        {mode === 'login' && renderLoginForm()}
        {mode === 'forgot' && renderForgotPasswordForm()}
        {mode === 'reset' && renderResetPasswordForm()}

        {mode === 'login' && (
          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-600">Need help? Contact your medical center administrator</p>
            <p className="mt-2 text-xs text-slate-500">
              Use your assigned ID number and password to access your schedule
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DoctorLoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eff6ff_0%,#eef2ff_50%,#f8fafc_100%)] p-4 sm:p-6">
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
          <h1 className="text-2xl font-bold text-slate-900">Loading...</h1>
          <p className="mt-2 text-slate-600">Preparing login page</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<DoctorLoginFallback />}>
      <DoctorLoginContent />
    </Suspense>
  );
}