export interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  emergencyContact: string;
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  idNumber: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber: string;
  password: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  emergencyContact: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  patient: Patient;
  message?: string;
}

export interface ApiError {
  message: string;
  success: boolean;
}

export interface PatientState {
  patientInfo: Patient | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}