'use client'

import { AuthProvider } from "../providers/AuthProvider"
import { QueryProvider } from "../providers/QueryProvider"
import { ReduxProvider } from "../providers/ReduxProvider"


export default function MedicalCenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <QueryProvider>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </QueryProvider>
    </AuthProvider>
  )
}
