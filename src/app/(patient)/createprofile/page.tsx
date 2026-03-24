'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import Link from 'next/link'
import { 
  UserCircle, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  User,
  Shield,
  Stethoscope,
  ChevronRight,
  LogOut,
  Eye,
  EyeOff,
  ClipboardList,
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  LucideIcon
} from 'lucide-react'
import type { RootState, AppDispatch } from '@/app/redux/store'
import { 
  registerPatient, 
  loginPatient, 
  getPatientProfile, 
  logout, 
  clearError 
} from '@/app/reduxPatient/slices/patient/profileSlice'

// ==================== Types ====================

interface PatientFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  idNumber: string
  password: string
  confirmPassword: string
  address: string
  dateOfBirth: string
  gender: string
  emergencyContact: string
}

interface FormErrors {
  [key: string]: string
}

interface PatientInfo {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  idNumber: string
  address: string
  dateOfBirth: string
  gender: string
  emergencyContact: string
  createdAt?: string
  updatedAt?: string
}

interface ApiError {
  message: string
  status?: number
}

interface ProfileState {
  patientInfo: PatientInfo | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

// Type guard for ApiError
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

// ==================== Custom Hooks ====================

const useAppDispatch = () => useDispatch<AppDispatch>()
const useAppSelector = <TSelected = unknown>(
  selector: (state: RootState) => TSelected
) => useSelector(selector)

// ==================== Helper Functions ====================

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error
  if (isApiError(error)) return error.message
  return 'An unexpected error occurred'
}

// ==================== Main Component ====================

export default function PatientProfilePage() {
  
  const dispatch = useAppDispatch()
  const router = useRouter()
  const profileState = useAppSelector((state: RootState) => state.profile) as ProfileState
  
  const { 
    patientInfo = null, 
    loading = false, 
    error = null, 
    isAuthenticated = false 
  } = profileState
  
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    idNumber: '',
    password: '',
    confirmPassword: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    emergencyContact: ''
  })

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('patientToken')
        if (token && !patientInfo) {
          await dispatch(getPatientProfile()).unwrap()
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('patientToken')
      }
    }
    
    checkAuthStatus()
  }, [dispatch, patientInfo])

  // Redirect to /entry if authenticated
  useEffect(() => {
    if (isAuthenticated && patientInfo) {
      const timer = setTimeout(() => {
        router.push('/entry')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, patientInfo, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
    if (localError) setLocalError(null)
  }

  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {}
    
    if (!isLogin) {
      if (!formData.firstName.trim()) errors.firstName = 'First name is required'
      if (!formData.lastName.trim()) errors.lastName = 'Last name is required'
      if (!formData.email.trim()) errors.email = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format'
      
      if (!formData.phone.trim()) errors.phone = 'Phone number is required'
      else if (!/^[+]?[\d\s-]+$/.test(formData.phone)) errors.phone = 'Invalid phone number'
      
      if (!formData.idNumber.trim()) errors.idNumber = 'ID number is required'
      
      if (!formData.password) errors.password = 'Password is required'
      else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters'
      
      if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm your password'
      else if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match'
      
      if (!formData.address.trim()) errors.address = 'Address is required'
      if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required'
      else {
        const birthDate = new Date(formData.dateOfBirth)
        const today = new Date()
        const age = today.getFullYear() - birthDate.getFullYear()
        if (age < 0 || age > 120) errors.dateOfBirth = 'Please enter a valid date of birth'
      }
      
      if (!formData.gender) errors.gender = 'Please select a gender'
      if (!formData.emergencyContact.trim()) errors.emergencyContact = 'Emergency contact is required'
    } else {
      if (!formData.idNumber.trim()) errors.idNumber = 'ID number is required'
      if (!formData.password) errors.password = 'Password is required'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [isLogin, formData])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      dispatch(clearError())
      setLocalError(null)
      
      const result = await dispatch(loginPatient({ 
        idNumber: formData.idNumber, 
        password: formData.password 
      })).unwrap()
      
      if (result?.success) {
        setSuccessMessage('Login successful! Redirecting to dashboard...');
        setFormData(prev => ({
          ...prev,
          idNumber: '',
          password: ''
        }));
        
        setTimeout(() => {
          router.push('/entry');
        }, 1500);
      }
    } catch (err: unknown) {
      setLocalError(getErrorMessage(err) || 'Login failed. Please check your credentials.')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      dispatch(clearError())
      setLocalError(null)
      
      const registerData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        idNumber: formData.idNumber.trim(),
        password: formData.password,
        address: formData.address.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        emergencyContact: formData.emergencyContact.trim()
      }

      const result = await dispatch(registerPatient(registerData)).unwrap()
      
      if (result?.success) {
        setSuccessMessage('Registration successful! You can now login.')
        setIsLogin(true)
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          idNumber: '',
          password: '',
          confirmPassword: '',
          address: '',
          dateOfBirth: '',
          gender: '',
          emergencyContact: ''
        })
        setFormErrors({})
      }
    } catch (err: unknown) {
      setLocalError(getErrorMessage(err) || 'Registration failed. Please try again.')
    }
  }

  const handleLogout = async () => {
    try {
      await dispatch(logout())
      setSuccessMessage('Logged out successfully')
      localStorage.removeItem('patientToken')
      localStorage.removeItem('refreshToken')
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (err: unknown) {
      setLocalError(getErrorMessage(err) || 'Logout failed')
    }
  }

  const handleFormSwitch = () => {
    setIsLogin(!isLogin)
    dispatch(clearError())
    setLocalError(null)
    setSuccessMessage(null)
    setFormErrors({})
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      idNumber: '',
      password: '',
      confirmPassword: '',
      address: '',
      dateOfBirth: '',
      gender: '',
      emergencyContact: ''
    })
  }

  const handleForgotPassword = async () => {
    const email = prompt('Enter your email to reset password:')
    if (!email) return

    try {
      const res = await fetch('https://dmrs.onrender.com/api/patients/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json() as { message?: string }
      alert(data.message || 'Check your email for reset link')
    } catch (err) {
      alert('Failed to send reset email')
    }
  }

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || localError) {
      const timer = setTimeout(() => {
        setSuccessMessage(null)
        setLocalError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage, localError])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/50">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 font-medium animate-pulse">Loading your profile...</p>
          <p className="text-sm text-gray-500">Please wait while we load your information</p>
        </div>
      </div>
    )
  }

  const displayError = error || localError

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
      {/* Floating Medical Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-slate-200/10 rounded-full blur-3xl"></div>
      </div>

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Global Error/Success Messages */}
        {displayError && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm">{displayError}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start space-x-3 animate-fade-in">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-green-800 font-medium">Success</p>
                <p className="text-green-600 text-sm">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {isAuthenticated && patientInfo ? (
          // Dashboard View - Will redirect to /entry after 1 second
          <DashboardView patientInfo={patientInfo} onLogout={handleLogout} />
        ) : (
          // Auth Forms View
          <AuthFormsView
            isLogin={isLogin}
            formData={formData}
            formErrors={formErrors}
            showPassword={showPassword}
            showConfirmPassword={showConfirmPassword}
            loading={loading}
            onInputChange={handleInputChange}
            onTogglePassword={() => setShowPassword(!showPassword)}
            onToggleConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
            onLoginSubmit={handleLogin}
            onRegisterSubmit={handleRegister}
            onFormSwitch={handleFormSwitch}
            onForgotPassword={handleForgotPassword}
          />
        )}
      </main>
    </div>
  )
}

// ==================== Dashboard Components ====================

interface DashboardViewProps {
  patientInfo: PatientInfo
  onLogout: () => void
}

function DashboardView({ patientInfo, onLogout }: DashboardViewProps) {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
              Welcome back, <span className="text-blue-600">{patientInfo.firstName}!</span>
            </h1>
            <p className="text-slate-600">Manage your health profile and appointments</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] group self-start"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <PersonalInfoCard patientInfo={patientInfo} />
          <MedicalInfoCard patientInfo={patientInfo} />
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          <QuickStatsCard />
          <QuickActionsCard />
          <AccountStatusCard />
        </div>
      </div>
    </div>
  )
}

// Personal Info Card Component
interface InfoFieldProps {
  label: string
  value: string
  icon?: LucideIcon
}

function PersonalInfoCard({ patientInfo }: { patientInfo: PatientInfo }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
          <UserCircle className="w-6 h-6 text-blue-600" />
          <span>Personal Information</span>
        </h2>
        <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
          Verified
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <InfoField label="Full Name" value={`${patientInfo.firstName} ${patientInfo.lastName}`} />
          <InfoField label="Email Address" value={patientInfo.email} icon={Mail} />
          <InfoField label="Phone Number" value={patientInfo.phone} icon={Phone} />
        </div>
        
        <div className="space-y-4">
          <InfoField label="ID Number" value={patientInfo.idNumber} icon={Shield} />
          <InfoField 
            label="Date of Birth" 
            value={new Date(patientInfo.dateOfBirth).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} 
            icon={Calendar}
          />
          <InfoField label="Gender" value={patientInfo.gender} icon={User} />
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value, icon: Icon }: InfoFieldProps) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <div className="flex items-center space-x-2">
        {Icon && <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        <p className="font-semibold text-slate-900 break-words">{value}</p>
      </div>
    </div>
  )
}

// Medical Info Card Component
function MedicalInfoCard({ patientInfo }: { patientInfo: PatientInfo }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-6 border border-blue-100">
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center space-x-2">
        <Stethoscope className="w-6 h-6 text-blue-600" />
        <span>Medical Information</span>
      </h2>
      
      <div className="space-y-4">
        <div className="bg-white/50 p-4 rounded-xl backdrop-blur-sm">
          <p className="text-sm text-slate-500 mb-1">Home Address</p>
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
            <p className="font-semibold text-slate-900">{patientInfo.address}</p>
          </div>
        </div>
        <div className="bg-white/50 p-4 rounded-xl backdrop-blur-sm">
          <p className="text-sm text-slate-500 mb-1">Emergency Contact</p>
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="font-semibold text-slate-900">{patientInfo.emergencyContact}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Quick Stats Card Component
interface StatItemProps {
  label: string
  value: string
  icon: LucideIcon
  color: 'green' | 'blue' | 'purple'
}

function QuickStatsCard() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
      <h3 className="font-bold text-slate-900 mb-4">Health Overview</h3>
      <div className="space-y-3">
        <StatItem label="Appointments" value="0" icon={Activity} color="green" />
        <StatItem label="Prescriptions" value="0" icon={ClipboardList} color="blue" />
      </div>
    </div>
  )
}

function StatItem({ label, value, icon: Icon, color }: StatItemProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600'
  }

  return (
    <div className={`flex items-center justify-between p-3 ${colorClasses[color]} rounded-lg`}>
      <div>
        <p className="text-sm text-slate-600">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <Icon className="w-8 h-8 opacity-80" />
    </div>
  )
}

// Quick Actions Card Component
interface QuickActionLinkProps {
  href: string
  title: string
  description: string
  icon: LucideIcon
  color: 'green' | 'blue' | 'purple'
}

function QuickActionsCard() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
      <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
      <div className="space-y-3">
        <QuickActionLink
          href="/booking"
          title="Book Appointment"
          description="Schedule a consultation"
          icon={Calendar}
          color="blue"
        />
        <QuickActionLink
          href="/consultation"
          title="Online Consultation"
          description="Virtual appointment"
          icon={Phone}
          color="green"
        />
      </div>
    </div>
  )
}

function QuickActionLink({ href, title, description, icon: Icon, color }: QuickActionLinkProps) {
  const colorClasses = {
    green: 'bg-green-50 hover:bg-green-100 text-green-600',
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-600'
  }

  return (
    <Link href={href}>
      <div className={`flex items-center justify-between p-4 ${colorClasses[color]} rounded-xl transition-all duration-300 cursor-pointer group`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 ${color === 'green' ? 'bg-green-100' : color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'} rounded-lg flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{title}</p>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
      </div>
    </Link>
  )
}

// Account Status Card Component
function AccountStatusCard() {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl shadow-lg p-6 text-white">
      <h3 className="font-bold mb-4">Account Status</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-blue-100">Profile Complete</span>
          <span className="font-bold">100%</span>
        </div>
        <div className="w-full bg-blue-400/30 rounded-full h-2">
          <div className="bg-white w-full h-2 rounded-full"></div>
        </div>
        <p className="text-sm text-blue-100 mt-2">Your profile is fully verified and active</p>
      </div>
    </div>
  )
}

// ==================== Auth Forms Components ====================

interface AuthFormsViewProps {
  isLogin: boolean
  formData: PatientFormData
  formErrors: FormErrors
  showPassword: boolean
  showConfirmPassword: boolean
  loading: boolean
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onTogglePassword: () => void
  onToggleConfirmPassword: () => void
  onLoginSubmit: (e: React.FormEvent) => void
  onRegisterSubmit: (e: React.FormEvent) => void
  onFormSwitch: () => void
  onForgotPassword: () => void
}

function AuthFormsView({
  isLogin,
  formData,
  formErrors,
  showPassword,
  showConfirmPassword,
  loading,
  onInputChange,
  onTogglePassword,
  onToggleConfirmPassword,
  onLoginSubmit,
  onRegisterSubmit,
  onFormSwitch,
  onForgotPassword
}: AuthFormsViewProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Welcome Message */}
        <div className="text-center lg:text-left">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg mb-6">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Welcome to <span className="text-blue-600">Health Portal</span>
            </h1>
            <p className="text-slate-600 text-lg">
              Manage your medical appointments, access health records, and connect with healthcare professionals in one secure platform.
            </p>
          </div>
          
          <div className="space-y-4">
            <FeatureItem icon={Shield} text="Secure & HIPAA Compliant" color="green" />
            <FeatureItem icon={Calendar} text="24/7 Appointment Booking" color="blue" />
            <FeatureItem icon={Phone} text="Virtual Consultations" color="purple" />
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200">
          <div className="flex mb-6">
            <button
              type="button"
              onClick={() => !isLogin && onFormSwitch()}
              className={`flex-1 py-3 font-medium transition-all duration-300 ${isLogin 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => isLogin && onFormSwitch()}
              className={`flex-1 py-3 font-medium transition-all duration-300 ${!isLogin 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-400 hover:text-slate-600'}`}
            >
              Register
            </button>
          </div>

          {isLogin ? (
            <LoginForm
              formData={formData}
              formErrors={formErrors}
              showPassword={showPassword}
              loading={loading}
              onInputChange={onInputChange}
              onTogglePassword={onTogglePassword}
              onSubmit={onLoginSubmit}
            />
          ) : (
            <RegisterForm
              formData={formData}
              formErrors={formErrors}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              loading={loading}
              onInputChange={onInputChange}
              onTogglePassword={onTogglePassword}
              onToggleConfirmPassword={onToggleConfirmPassword}
              onSubmit={onRegisterSubmit}
            />
          )}

          <div className="mt-6 text-center space-y-2">
            <button
              type="button"
              onClick={onFormSwitch}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {isLogin 
                ? "Don't have an account? Register here" 
                : 'Already have an account? Sign in here'}
            </button>
            <div className="text-right">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Forgot password?
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Login Form Component
interface LoginFormProps {
  formData: PatientFormData
  formErrors: FormErrors
  showPassword: boolean
  loading: boolean
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onTogglePassword: () => void
  onSubmit: (e: React.FormEvent) => void
}

function LoginForm({
  formData,
  formErrors,
  showPassword,
  loading,
  onInputChange,
  onTogglePassword,
  onSubmit
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormField
        label="ID Number"
        name="idNumber"
        type="text"
        value={formData.idNumber}
        onChange={onInputChange}
        error={formErrors.idNumber}
        icon={Shield}
        placeholder="Enter your ID number"
        disabled={loading}
        required
      />

      <FormField
        label="Password"
        name="password"
        type={showPassword ? "text" : "password"}
        value={formData.password}
        onChange={onInputChange}
        error={formErrors.password}
        icon={Lock}
        placeholder="Enter your password"
        disabled={loading}
        required
        showPasswordToggle
        onTogglePassword={onTogglePassword}
        showPassword={showPassword}
      />

      <SubmitButton
        loading={loading}
        text={loading ? "Signing in..." : "Sign In"}
        loadingText="Signing in..."
      />
    </form>
  )
}

// Register Form Component
interface RegisterFormProps {
  formData: PatientFormData
  formErrors: FormErrors
  showPassword: boolean
  showConfirmPassword: boolean
  loading: boolean
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onTogglePassword: () => void
  onToggleConfirmPassword: () => void
  onSubmit: (e: React.FormEvent) => void
}

function RegisterForm({
  formData,
  formErrors,
  showPassword,
  showConfirmPassword,
  loading,
  onInputChange,
  onTogglePassword,
  onToggleConfirmPassword,
  onSubmit
}: RegisterFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="First Name"
          name="firstName"
          type="text"
          value={formData.firstName}
          onChange={onInputChange}
          error={formErrors.firstName}
          placeholder="John"
          disabled={loading}
          required
        />
        <FormField
          label="Last Name"
          name="lastName"
          type="text"
          value={formData.lastName}
          onChange={onInputChange}
          error={formErrors.lastName}
          placeholder="Doe"
          disabled={loading}
          required
        />
      </div>

      <FormField
        label="Email Address"
        name="email"
        type="email"
        value={formData.email}
        onChange={onInputChange}
        error={formErrors.email}
        icon={Mail}
        placeholder="john@example.com"
        disabled={loading}
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={onInputChange}
          error={formErrors.phone}
          icon={Phone}
          placeholder="+27"
          disabled={loading}
          required
        />
        <FormField
          label="ID Number"
          name="idNumber"
          type="text"
          value={formData.idNumber}
          onChange={onInputChange}
          error={formErrors.idNumber}
          icon={Shield}
          placeholder="ID Number"
          disabled={loading}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={onInputChange}
          error={formErrors.password}
          icon={Lock}
          placeholder="••••••••"
          disabled={loading}
          required
          showPasswordToggle
          onTogglePassword={onTogglePassword}
          showPassword={showPassword}
        />
        <FormField
          label="Confirm Password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          value={formData.confirmPassword}
          onChange={onInputChange}
          error={formErrors.confirmPassword}
          icon={Lock}
          placeholder="••••••••"
          disabled={loading}
          required
          showPasswordToggle
          onTogglePassword={onToggleConfirmPassword}
          showPassword={showConfirmPassword}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={onInputChange}
          error={formErrors.dateOfBirth}
          icon={Calendar}
          disabled={loading}
          required
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Gender
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={onInputChange}
            disabled={loading}
            className={`w-full px-4 py-3 border ${formErrors.gender ? 'border-red-300' : 'border-slate-300'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 transition-all duration-300`}
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {formErrors.gender && <p className="mt-1 text-sm text-red-600">{formErrors.gender}</p>}
        </div>
      </div>

      <FormField
        label="Emergency Contact"
        name="emergencyContact"
        type="text"
        value={formData.emergencyContact}
        onChange={onInputChange}
        error={formErrors.emergencyContact}
        icon={Phone}
        iconClassName="text-red-400"
        placeholder="Name and phone number"
        disabled={loading}
        required
      />

      <FormField
        label="Address"
        name="address"
        type="text"
        value={formData.address}
        onChange={onInputChange}
        error={formErrors.address}
        icon={MapPin}
        placeholder="Full residential address"
        disabled={loading}
        required
      />

      <SubmitButton
        loading={loading}
        text={loading ? "Creating Account..." : "Create Account"}
        loadingText="Creating Account..."
      />
    </form>
  )
}

// Feature Item Component
interface FeatureItemProps {
  icon: LucideIcon
  text: string
  color: 'green' | 'blue' | 'purple'
}

function FeatureItem({ icon: Icon, text, color }: FeatureItemProps) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600'
  }

  return (
    <div className="flex items-center space-x-3">
      <div className={`w-8 h-8 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-slate-700">{text}</span>
    </div>
  )
}

// Form Field Component
interface FormFieldProps {
  label: string
  name: string
  type: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  error?: string
  icon?: LucideIcon
  iconClassName?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  showPasswordToggle?: boolean
  onTogglePassword?: () => void
  showPassword?: boolean
}

function FormField({
  label,
  name,
  type,
  value,
  onChange,
  error,
  icon: Icon,
  iconClassName = "text-slate-400",
  placeholder,
  disabled,
  required,
  showPasswordToggle,
  onTogglePassword,
  showPassword
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${iconClassName}`} />
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full ${Icon ? 'pl-12' : 'pl-4'} ${showPasswordToggle ? 'pr-12' : 'pr-4'} py-3 border ${error ? 'border-red-300' : 'border-slate-300'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 transition-all duration-300`}
          placeholder={placeholder}
          required={required}
        />
        {showPasswordToggle && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

// Submit Button Component
interface SubmitButtonProps {
  loading: boolean
  text: string
  loadingText: string
}

function SubmitButton({ loading, text, loadingText }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
    >
      {loading ? (
        <span className="flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{loadingText}</span>
        </span>
      ) : (
        text
      )}
    </button>
  )
}