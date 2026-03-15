'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Laptop, Truck, Sparkles, Menu, X } from 'lucide-react'

const navItems = [
  { name: 'Online Consultation', href: '/onlineConsultation', icon: Laptop },
  { name: 'Transportations', href: '/transportation', icon: Truck },
]

export default function MedicalCenterNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/medicalcenter" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-all duration-300">
              MedicalCenter Portal
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-200'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-gray-700 hover:text-blue-600 transition"
          >
            {open ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg animate-slide-down">
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
