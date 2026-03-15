'use client'

import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/app/redux/store'
import DoctorNav from '@/app/(medical-center)/components/DoctorNav'
import Link from 'next/link'
import { getRollingWindow } from '@/app/redux/slices/editingNextWeek'
import type { RollingSchedule, DailySchedule, TimeSlot, DoctorAssignment } from '@/app/redux/slices/editingNextWeek'

// ============ ICONS ============
const Icons = {
  Calendar: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Doctor: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Clock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Users: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Sun: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Moon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  Building: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Refresh: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  TrendingUp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  CheckCircle: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  XCircle: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Filter: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  Search: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Briefcase: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  UserGroup: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  ChartBar: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

// ============ HELPER FUNCTIONS ============
const formatDate = (date: Date | string): string => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatShortDate = (date: string): string => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

const generateDoctorColor = (doctorId: string): string => {
  const colors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
    '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
    '#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#EC4899'
  ]
  let hash = 0
  for (let i = 0; i < doctorId.length; i++) {
    hash = doctorId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const getSessionColor = (sessionName: string) => {
  switch (sessionName) {
    case 'morning':
      return 'bg-yellow-50 border-yellow-200'
    case 'afternoon':
      return 'bg-orange-50 border-orange-200'
    case 'night':
      return 'bg-purple-50 border-purple-200'
    default:
      return 'bg-gray-50 border-gray-200'
  }
}

const getSessionTextColor = (sessionName: string) => {
  switch (sessionName) {
    case 'morning':
      return 'text-yellow-700'
    case 'afternoon':
      return 'text-orange-700'
    case 'night':
      return 'text-purple-700'
    default:
      return 'text-gray-700'
  }
}

// ============ UI COMPONENTS ============
interface DoctorBadgeProps {
  doctor: DoctorAssignment;
  showSpecialization?: boolean;
  
}



const SlotStatusIndicator = ({ hasDoctors, availableDoctors }: { hasDoctors: boolean; availableDoctors: number }) => {
  if (!hasDoctors) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200">
        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
        <span className="font-medium">No Doctors Assigned</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
      <span className="font-medium">
        {availableDoctors} Doctor{availableDoctors !== 1 ? 's' : ''} Available
      </span>
    </div>
  )
}

const TimeSlotDetails = ({ slot, dayDate }: { slot: TimeSlot; dayDate: string }) => {
  const isNightShift = slot.type === 'night-shift'
  const isPeakHour = slot.isPeakHour
  const hasAssignedDoctors = slot.assignedDoctors && slot.assignedDoctors.length > 0
  const availableDoctors = slot.assignedDoctors?.filter(d => !d.isBooked)?.length || 0

  // Mock data for booked status - in real app, this would come from backend
  const doctorsWithStatus = slot.assignedDoctors?.map(doctor => ({
    ...doctor,
    isBooked: Math.random() > 0.5 // Randomly set booked status for demo
  })) || []

  return (
    <div className={`p-4 border rounded-lg ${isNightShift ? 'border-purple-200 bg-purple-50' : isPeakHour ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg border border-gray-200">
            <Icons.Clock className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <div className="font-bold text-lg text-gray-900">
              {formatTime(slot.start)} - {formatTime(slot.end)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-600">{slot.duration} minutes</span>
              {isNightShift && (
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                  Night Shift
                </span>
              )}
              {isPeakHour && (
                <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                  Peak Hour
                </span>
              )}
            </div>
          </div>
        </div>
        <SlotStatusIndicator hasDoctors={hasAssignedDoctors} availableDoctors={availableDoctors} />
      </div>

      {/* Slot Type & Consultation */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white p-3 border border-gray-200 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Consultation Type</div>
          <div className="font-medium text-gray-900">{slot.consultationType || 'Face-to-face'}</div>
        </div>
        <div className="bg-white p-3 border border-gray-200 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Slot Type</div>
          <div className="font-medium text-gray-900 capitalize">{slot.type?.replace('-', ' ') || 'Regular'}</div>
        </div>
      </div>

      {/* Doctor Assignments */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icons.UserGroup className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-900">Doctor Assignments</span>
          </div>
          <span className="text-sm font-medium text-gray-700">
            {slot.assignedDoctors?.length || 0} doctor{slot.assignedDoctors?.length !== 1 ? 's' : ''}
          </span>
        </div>

        {hasAssignedDoctors ? (
          <div className="space-y-3">
            
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <Icons.Doctor className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No doctors assigned to this slot</p>
            <p className="text-gray-500 text-sm mt-1">This time slot is currently unavailable</p>
          </div>
        )}
      </div>

      
      
    </div>
  )
}

const DayScheduleView = ({ day }: { day: DailySchedule }) => {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set(['morning', 'afternoon', 'night']))
  
  const date = new Date(day.date)
  const isToday = date.toDateString() === new Date().toDateString()
  const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6

  const toggleSession = (session: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(session)) {
      newExpanded.delete(session)
    } else {
      newExpanded.add(session)
    }
    setExpandedSessions(newExpanded)
  }

  // Group slots by session
  const slotsBySession = useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = { morning: [], afternoon: [], night: [] }
    
    day.timeSlots?.forEach((slot: TimeSlot) => {
      const hour = parseInt(slot.start.split(':')[0])
      if (hour >= 0 && hour < 12) grouped.morning.push(slot)
      else if (hour >= 12 && hour < 18) grouped.afternoon.push(slot)
      else grouped.night.push(slot)
    })
    
    return grouped
  }, [day.timeSlots])

  // Calculate statistics for the day
  const dayStats = useMemo(() => {
    const totalSlots = day.timeSlots?.length || 0
    const slotsWithDoctors = day.timeSlots?.filter(slot => 
      slot.assignedDoctors && slot.assignedDoctors.length > 0
    ).length || 0
    const totalDoctors = new Set(
      day.timeSlots?.flatMap(slot => 
        slot.assignedDoctors?.map(d => d.doctorId) || []
      )
    ).size
    const availableSlots = day.timeSlots?.filter(slot => 
      slot.assignedDoctors?.some(d => !d.isBooked)
    ).length || 0

    return {
      totalSlots,
      slotsWithDoctors,
      totalDoctors,
      availableSlots,
      emptySlots: totalSlots - slotsWithDoctors
    }
  }, [day.timeSlots])

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
      day.isWorking 
        ? 'bg-gradient-to-br from-white to-blue-50 border-blue-200' 
        : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
    } ${isToday ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
      
      {/* Day Header */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                day.isWorking 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-r from-gray-400 to-gray-500'
              }`}>
                {day.isWorking ? (
                  <Icons.CheckCircle className="w-6 h-6 text-white" />
                ) : (
                  <Icons.XCircle className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{day.dayName}</h3>
                <p className="text-gray-600">{formatDate(day.date)}</p>
              </div>
              {isToday && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  Today
                </span>
              )}
              {isWeekend && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                  Weekend
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{dayStats.totalSlots}</div>
              <div className="text-sm text-gray-600">Total Slots</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">{dayStats.availableSlots}</div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">{dayStats.totalDoctors}</div>
              <div className="text-sm text-gray-600">Doctors</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {day.isWorking && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-3 border border-green-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Slots with Doctors</div>
              <div className="text-lg font-bold text-green-700">{dayStats.slotsWithDoctors}</div>
            </div>
            <div className="bg-white p-3 border border-red-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Empty Slots</div>
              <div className="text-lg font-bold text-red-700">{dayStats.emptySlots}</div>
            </div>
            <div className="bg-white p-3 border border-blue-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Doctors Assigned</div>
              <div className="text-lg font-bold text-blue-700">{dayStats.totalDoctors}</div>
            </div>
            <div className="bg-white p-3 border border-purple-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Available Now</div>
              <div className="text-lg font-bold text-purple-700">{dayStats.availableSlots}</div>
            </div>
          </div>
        )}

        {/* Session Controls */}
        <div className="flex gap-3 mb-6">
          {(['morning', 'afternoon', 'night'] as const).map((session) => {
            const isEnabled = day.sessions[session]?.enabled
            const sessionSlots = slotsBySession[session] || []
            const slotsWithDoctors = sessionSlots.filter(slot => 
              slot.assignedDoctors && slot.assignedDoctors.length > 0
            ).length
            
            if (!isEnabled) return null

            return (
              <button
                key={session}
                onClick={() => toggleSession(session)}
                className={`flex-1 px-4 py-3 rounded-lg border flex items-center justify-between transition-all duration-300 ${
                  expandedSessions.has(session)
                    ? 'bg-white shadow-md border-blue-300'
                    : getSessionColor(session)
                }`}
              >
                <div className="flex items-center gap-3">
                  {session === 'morning' && <Icons.Sun className="w-5 h-5 text-yellow-500" />}
                  {session === 'afternoon' && <Icons.Sun className="w-5 h-5 text-orange-500" />}
                  {session === 'night' && <Icons.Moon className="w-5 h-5 text-purple-500" />}
                  <div className="text-left">
                    <div className={`font-bold capitalize ${getSessionTextColor(session)}`}>{session}</div>
                    <div className="text-sm text-gray-600">
                      {day.sessions[session]?.start} - {day.sessions[session]?.end}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    sessionSlots.length > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {slotsWithDoctors}/{sessionSlots.length} slots
                  </span>
                  <span className="text-gray-500 text-xs">
                    {expandedSessions.has(session) ? 'Collapse' : 'Expand'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Working Day Content */}
      {day.isWorking ? (
        <div className="px-6 pb-6 space-y-6">
          {/* All Doctors for this Day */}
          {dayStats.totalDoctors > 0 && (
            <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Icons.UserGroup className="w-6 h-6 text-gray-700" />
                  <h4 className="text-xl font-bold text-gray-900">Assigned Doctors Today</h4>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 font-medium rounded-full">
                  {dayStats.totalDoctors} doctors
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from(new Map(
                  day.timeSlots?.flatMap(slot => 
                    slot.assignedDoctors?.map((doctor: DoctorAssignment) => [doctor.doctorId, doctor]) || []
                  )
                ).values()).map((doctor: DoctorAssignment) => (
                  <div key={doctor.doctorId} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: generateDoctorColor(doctor.doctorId) }}
                      >
                        {doctor.doctorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{doctor.doctorName}</div>
                        <div className="text-xs text-blue-600 font-semibold">
                          {doctor.specialization?.join(', ') || 'General Practitioner'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                          {day.timeSlots?.filter(slot => 
                            slot.assignedDoctors?.some(d => d.doctorId === doctor.doctorId)
                          ).length || 0}
                        </div>
                        <div className="text-xs text-gray-600">Slots</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {doctor.maxPatients || 0}
                        </div>
                        <div className="text-xs text-gray-600">Max Patients</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Slots by Session */}
          {(['morning', 'afternoon', 'night'] as const).map((session) => {
            const sessionSlots = slotsBySession[session] || []
            const isEnabled = day.sessions[session]?.enabled
            
            if (!isEnabled || !expandedSessions.has(session)) return null

            return (
              <div key={session} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className={`text-xl font-bold capitalize ${getSessionTextColor(session)}`}>
                      {session} Session
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        getSessionColor(session)
                      } ${getSessionTextColor(session)}`}>
                        {sessionSlots.length} time slots
                      </span>
                      <span className="text-sm text-gray-600">
                        ({sessionSlots.filter(s => s.assignedDoctors && s.assignedDoctors.length > 0).length} with doctors)
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {day.sessions[session]?.start} - {day.sessions[session]?.end}
                  </div>
                </div>

                {sessionSlots.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {sessionSlots.map((slot: TimeSlot, index: number) => (
                      <TimeSlotDetails
                        key={`${day.date}-${session}-${index}`}
                        slot={slot}
                        dayDate={day.date}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-8 border-2 border-dashed rounded-xl ${getSessionColor(session)}`}>
                    <Icons.Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No time slots scheduled for {session} session</p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Day Statistics */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <h4 className="text-xl font-bold text-gray-900 mb-4">Day Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">{dayStats.totalSlots}</div>
                <div className="text-sm text-gray-600">Total Time Slots</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-green-600">{dayStats.slotsWithDoctors}</div>
                <div className="text-sm text-gray-600">Slots with Doctors</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-red-600">{dayStats.emptySlots}</div>
                <div className="text-sm text-gray-600">Empty Slots</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-orange-600">{day.slotDuration || 30}</div>
                <div className="text-sm text-gray-600">Slot Duration (min)</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 pb-6">
          <div className="text-center py-12 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
            <div className="w-20 h-20 mx-auto mb-6 text-gray-400">
              🌴
            </div>
            <h4 className="text-2xl font-bold text-gray-900 mb-3">Day Off</h4>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              This day is marked as non-working. No appointments or consultations are scheduled.
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-600">Slots</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-600">Doctors</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-600">Available</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const DoctorAssignmentSummary = ({ schedule }: { schedule: RollingSchedule }) => {
  const [expandedDoctors, setExpandedDoctors] = useState<Set<string>>(new Set())
  
  // Calculate doctor assignments
  const doctorAssignments = useMemo(() => {
    const assignments: Record<string, {
      doctor: DoctorAssignment;
      totalSlots: number;
      availableSlots: number;
      bookedSlots: number;
      days: Set<string>;
      slotsByDay: Record<string, TimeSlot[]>;
    }> = {}

    schedule.dailySchedules.forEach((day: DailySchedule) => {
      if (!day.isWorking) return

      day.timeSlots?.forEach((slot: TimeSlot) => {
        slot.assignedDoctors?.forEach((doctor: DoctorAssignment) => {
          if (!assignments[doctor.doctorId]) {
            assignments[doctor.doctorId] = {
              doctor,
              totalSlots: 0,
              availableSlots: 0,
              bookedSlots: 0,
              days: new Set(),
              slotsByDay: {}
            }
          }

          const assignment = assignments[doctor.doctorId]
          assignment.totalSlots += 1
          // Mock booked status for demo
          const isBooked = Math.random() > 0.5
          if (isBooked) {
            assignment.bookedSlots += 1
          } else {
            assignment.availableSlots += 1
          }
          assignment.days.add(day.date)
          
          if (!assignment.slotsByDay[day.date]) {
            assignment.slotsByDay[day.date] = []
          }
          assignment.slotsByDay[day.date].push(slot)
        })
      })
    })

    return Object.values(assignments).sort((a, b) => b.totalSlots - a.totalSlots)
  }, [schedule])

  const toggleDoctor = (doctorId: string) => {
    const newExpanded = new Set(expandedDoctors)
    if (newExpanded.has(doctorId)) {
      newExpanded.delete(doctorId)
    } else {
      newExpanded.add(doctorId)
    }
    setExpandedDoctors(newExpanded)
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Doctor Assignments Summary</h3>
            <p className="text-gray-600">
              Overview of all doctor assignments across the schedule
            </p>
          </div>
          <div className="px-4 py-2 bg-white rounded-lg border border-indigo-200">
            <span className="font-semibold text-indigo-700">
              {doctorAssignments.length} doctors assigned
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">
              {doctorAssignments.reduce((sum, d) => sum + d.totalSlots, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Assignments</div>
          </div>
          <div className="text-center bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-green-600">
              {doctorAssignments.reduce((sum, d) => sum + d.availableSlots, 0)}
            </div>
            <div className="text-sm text-gray-600">Available Slots</div>
          </div>
          <div className="text-center bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-red-600">
              {doctorAssignments.reduce((sum, d) => sum + d.bookedSlots, 0)}
            </div>
            <div className="text-sm text-gray-600">Booked Slots</div>
          </div>
          <div className="text-center bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(doctorAssignments.reduce((sum, d) => sum + d.days.size, 0) / doctorAssignments.length) || 0}
            </div>
            <div className="text-sm text-gray-600">Avg Days per Doctor</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {doctorAssignments.map((assignment) => (
          <div key={assignment.doctor.doctorId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div 
              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleDoctor(assignment.doctor.doctorId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: generateDoctorColor(assignment.doctor.doctorId) }}
                  >
                    {assignment.doctor.doctorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{assignment.doctor.doctorName}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full">
                        {assignment.doctor.specialization?.join(', ') || 'General Practitioner'}
                      </span>
                      <span className="text-sm text-gray-600">
                        Max: {assignment.doctor.maxPatients || 0} patients
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{assignment.totalSlots}</div>
                    <div className="text-sm text-gray-600">Total Slots</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{assignment.availableSlots}</div>
                    <div className="text-sm text-gray-600">Available</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">{assignment.days.size}</div>
                    <div className="text-sm text-gray-600">Days</div>
                  </div>
                  <div className="text-gray-500">
                    {expandedDoctors.has(assignment.doctor.doctorId) ? '▲' : '▼'}
                  </div>
                </div>
              </div>
            </div>

            {expandedDoctors.has(assignment.doctor.doctorId) && (
              <div className="border-t border-gray-200 p-6">
                <h5 className="text-lg font-bold text-gray-900 mb-4">Assignment Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(assignment.slotsByDay).map(([date, slots]) => {
                    const day = schedule.dailySchedules.find(d => d.date === date)
                    if (!day) return null

                    return (
                      <div key={date} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <div className="font-medium text-gray-900">{day.dayName}</div>
                            <div className="text-sm text-gray-600">{formatShortDate(date)}</div>
                          </div>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                            {slots.length} slots
                          </span>
                        </div>
                        <div className="space-y-2">
                          {slots.map((slot, idx) => (
                            <div key={idx} className="bg-white p-3 border border-gray-200 rounded">
                              <div className="font-medium text-gray-900">
                                {formatTime(slot.start)} - {formatTime(slot.end)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {slot.consultationType || 'Face-to-face'} • {slot.duration} min
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ MAIN COMPONENT ============
export default function ComprehensiveScheduleView() {
  const dispatch = useDispatch<AppDispatch>()
  
  const { 
    rollingSchedule, 
    isLoading, 
    error, 
    success,
    windowInfo 
  } = useSelector((state: RootState) => ({
    rollingSchedule: state.editingNextWeek?.rollingSchedule || null,
    isLoading: state.editingNextWeek?.isLoading || false,
    error: state.editingNextWeek?.error || null,
    success: state.editingNextWeek?.success || null,
    windowInfo: state.editingNextWeek?.windowInfo || null
  }))

  const [activeView, setActiveView] = useState<'schedule' | 'doctors'>('schedule')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch schedule on load
  useEffect(() => {
    dispatch(getRollingWindow())
  }, [dispatch])

  // Filter days based on search
  const filteredDays = useMemo(() => {
    if (!rollingSchedule?.dailySchedules) return []
    
    return rollingSchedule.dailySchedules.filter(day => {
      if (!searchQuery) return true
      
      const searchLower = searchQuery.toLowerCase()
      return (
        day.dayName.toLowerCase().includes(searchLower) ||
        formatDate(day.date).toLowerCase().includes(searchLower) ||
        (day.timeSlots?.some(slot => 
          slot.assignedDoctors?.some(doctor => 
            doctor.doctorName.toLowerCase().includes(searchLower) ||
            doctor.specialization?.some(spec => spec.toLowerCase().includes(searchLower))
          )
        )) ||
        false
      )
    })
  }, [rollingSchedule, searchQuery])

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    if (!rollingSchedule?.dailySchedules) return null

    const allDays = rollingSchedule.dailySchedules
    const workingDays = allDays.filter(day => day.isWorking)
    
    // Get all unique doctors
    const allDoctors = new Set<string>()
    const slotsWithDoctors = new Set<string>()
    const emptySlots = new Set<string>()
    
    allDays.forEach(day => {
      if (day.timeSlots) {
        day.timeSlots.forEach(slot => {
          const slotKey = `${day.date}-${slot.start}-${slot.end}`
          if (slot.assignedDoctors && slot.assignedDoctors.length > 0) {
            slotsWithDoctors.add(slotKey)
            slot.assignedDoctors.forEach(doctor => {
              if (doctor.doctorId) allDoctors.add(doctor.doctorId)
            })
          } else {
            emptySlots.add(slotKey)
          }
        })
      }
    })

    const totalSlots = allDays.reduce((sum, day) => sum + (day.timeSlots?.length || 0), 0)
    const totalSlotsWithDoctors = slotsWithDoctors.size
    const totalEmptySlots = emptySlots.size

    return {
      totalDays: allDays.length,
      workingDays: workingDays.length,
      totalDoctors: allDoctors.size,
      totalSlots,
      totalSlotsWithDoctors,
      totalEmptySlots,
      utilizationRate: totalSlots > 0 ? (totalSlotsWithDoctors / totalSlots) * 100 : 0
    }
  }, [rollingSchedule])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <DoctorNav />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Loading Comprehensive Schedule View...</p>
              <p className="text-gray-500">Fetching doctor assignments and schedule details</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <DoctorNav />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Failed to Load Schedule</h3>
                <p className="text-gray-600">{error}</p>
              </div>
            </div>
            <button
              onClick={() => dispatch(getRollingWindow())}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Icons.Refresh className="w-5 h-5" />
              Retry Loading Schedule
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!rollingSchedule) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <DoctorNav />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-400">
              <Icons.Calendar className="w-full h-full" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">No Schedule Data Available</h1>
            <p className="text-gray-600 mb-6">Unable to load the rolling window schedule. Please try again.</p>
            <button
              onClick={() => dispatch(getRollingWindow())}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Icons.Refresh className="w-5 h-5" />
              Load Schedule
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <DoctorNav />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              Medical Center Schedule Dashboard
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="flex items-center gap-2">
                <Icons.Building className="w-5 h-5 text-blue-600" />
                <span className="text-gray-600">21-Day Rolling Window</span>
              </div>
              {windowInfo && (
                <div className="flex items-center gap-2">
                  <Icons.Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {new Date(windowInfo.start).toLocaleDateString()} - {new Date(windowInfo.end).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/weekly-schedules"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-300"
            >
              Back to Schedules
            </Link>
            <button
              onClick={() => dispatch(getRollingWindow())}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center gap-2"
            >
              <Icons.Refresh className="w-4 h-4" />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center">
              <Icons.CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <p className="text-green-800">{success}</p>
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveView('schedule')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              activeView === 'schedule'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Icons.Calendar className="w-4 h-4" />
            Schedule View
          </button>
          <button
            onClick={() => setActiveView('doctors')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              activeView === 'doctors'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Icons.UserGroup className="w-4 h-4" />
            Doctor Assignments
          </button>
        </div>

        {/* Search and Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {activeView === 'schedule' ? 'Daily Schedule Overview' : 'Doctor Assignment Summary'}
              </h3>
              <p className="text-gray-600">
                {activeView === 'schedule' 
                  ? 'View detailed schedule with doctor assignments and time slots' 
                  : 'See all doctor assignments across the entire schedule'}
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icons.Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by day, date, or doctor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Quick Stats */}
          {overallStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{overallStats.workingDays}</div>
                <div className="text-sm text-gray-600">Working Days</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{overallStats.totalSlotsWithDoctors}</div>
                <div className="text-sm text-gray-600">Slots with Doctors</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">{overallStats.totalEmptySlots}</div>
                <div className="text-sm text-gray-600">Empty Slots</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{Math.round(overallStats.utilizationRate)}%</div>
                <div className="text-sm text-gray-600">Slot Coverage</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {activeView === 'schedule' ? (
          <div className="space-y-8">
            {filteredDays.length > 0 ? (
              filteredDays.map((day: DailySchedule) => (
                <DayScheduleView key={day.date} day={day} />
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Icons.Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Matching Days Found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search criteria to see schedule data.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        ) : (
          <DoctorAssignmentSummary schedule={rollingSchedule} />
        )}

        {/* Schedule Summary */}
        {rollingSchedule && (
          <div className="mt-8 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold mb-2">Schedule Summary</h3>
                <p className="text-gray-300">
                  Complete overview of the 21-day rolling schedule
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="font-semibold">Schedule ID: </span>
                  <code className="text-blue-300">{rollingSchedule.schedule_id}</code>
                </div>
                <div className="px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="font-semibold">Last Updated: </span>
                  <span className="text-blue-300">
                    {new Date(rollingSchedule.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                <div className="text-sm text-gray-300 mb-2">Schedule Period</div>
                <div className="text-lg font-semibold">
                  {new Date(rollingSchedule.windowStart).toLocaleDateString()} - {new Date(rollingSchedule.windowEnd).toLocaleDateString()}
                </div>
              </div>
              <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                <div className="text-sm text-gray-300 mb-2">Default Settings</div>
                <div className="text-lg font-semibold">
                  {rollingSchedule.slotDuration} min slots • {rollingSchedule.bufferTime} min buffer
                </div>
              </div>
              <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                <div className="text-sm text-gray-300 mb-2">Total Days</div>
                <div className="text-lg font-semibold">
                  {rollingSchedule.dailySchedules.length} days in window
                </div>
              </div>
              <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                <div className="text-sm text-gray-300 mb-2">Assigned Doctors</div>
                <div className="text-lg font-semibold">
                  {rollingSchedule.assignedDoctors.length} doctors assigned
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Quick Stats */}
      {overallStats && (
        <div className="fixed bottom-6 right-6 bg-white rounded-xl border border-gray-200 shadow-2xl p-4 w-72">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-900">Quick Stats</div>
            <div className="text-xs text-gray-500">
              {activeView === 'schedule' ? 'Schedule View' : 'Doctor View'}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Working Days</span>
              <span className="font-semibold text-blue-600">{overallStats.workingDays}/{overallStats.totalDays}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Slots with Doctors</span>
              <span className="font-semibold text-green-600">{overallStats.totalSlotsWithDoctors}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Empty Slots</span>
              <span className="font-semibold text-red-600">{overallStats.totalEmptySlots}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Coverage</span>
              <span className="font-semibold text-purple-600">{Math.round(overallStats.utilizationRate)}%</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              Data refreshed: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}