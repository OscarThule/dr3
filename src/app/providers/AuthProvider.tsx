'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

// Define the shape of a user object
interface User {
  name: string
  role: string
  // Add other fields as needed (e.g., email, id, etc.)
}

// Define the shape of login credentials
interface LoginCredentials {
  email: string
  password: string
}

interface AuthContextType {
  user: User | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Verify token with backend – this would be a real API call
      setUser({ name: 'Admin User', role: 'admin' })
    }
    setIsLoading(false)
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      // Use credentials for the API call – logging to demonstrate usage
      console.log('Logging in with', credentials)
      // In a real app, you would call your login API here
      // const response = await fetch('/api/login', { method: 'POST', body: JSON.stringify(credentials) })
      setUser({ name: 'Admin User', role: 'admin' })
      localStorage.setItem('token', 'demo-token')
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}