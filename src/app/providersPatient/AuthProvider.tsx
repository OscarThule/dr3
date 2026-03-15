'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface AuthContextType {
  user: any | null
  login: (credentials: any) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Verify token with backend
      setUser({ name: 'Admin User', role: 'admin' })
    }
    setIsLoading(false)
  }, [])

  const login = async (credentials: any) => {
    try {
      setIsLoading(true)
      // Login API call would go here
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

  const value = {
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