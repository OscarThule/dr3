'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import Link from 'next/link'
import { AppDispatch, RootState } from '@/app/redux/store'
import { fetchPractitioners } from '@/app/redux/slices/medicalStaffSlice'
import {
  getRollingWindow,
  updateDailySchedule,
  assignDoctorToSlot,
  removeDoctorFromSlot,
  updateSlotDuration,
  addLunchBreak,
  removeLunchBreak,
  updateSession,
  toggleWorkingDay,
  getDoctorAssignments,
  rollWindow,
  assignDoctorToSlotSync,
  removeDoctorFromSlotSync,
  updateSlotSync,
  updateSessionSync,
  addLunchBreakSync,
  removeLunchBreakSync,
  toggleWorkingDaySync,
  setSelectedDate,
  setSelectedSlot,
  setActiveTab,
  setLoading,
  setError,
  setSuccess,
  updateRollingSchedule,
  setActiveWeek,
  saveSchedule,
  clearNotifications
} from '@/app/redux/slices/editingNextWeek'
import DoctorNav from '@/app/(medical-center)/components/DoctorNav'
import type {
  RollingSchedule,
  DailySchedule,
  TimeSlot,
  DoctorAssignment,
  LunchBreak,
  Session,
  WindowInfo,
  
} from '@/app/redux/slices/editingNextWeek'

// ============ TYPES ============
interface BasicPractitioner {
  _id: string
  name: string
  specialization: string[]
  email?: string
  role?: string
  isActive?: boolean
}

interface WeekData {
  weekNumber: number
  label: string
  startDate: Date
  endDate: Date
  dates: string[]
}

interface DayAssignment {
  date: string
  dayName: string
  slots: Array<{
    id: string
    start: string
    end: string
    type: 'morning' | 'afternoon' | 'night'
    capacity: number
    assignedDoctorsCount: number
    patientCapacity: number
  }>
  totalSlots: number
  totalCapacity: number
  totalPatients: number
}

interface DoctorAssignmentData {
  doctorId: string
  doctorName: string
  specialization: string[]
  assignments: DayAssignment[]
  totalWeeklySlots: number
  totalWeeklyCapacity: number
  totalWeeklyPatients: number
}

// ============ HELPER FUNCTIONS ============
const generateDoctorColor = (doctorId: string): string => {
  const colors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
    '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1'
  ]
  let hash = 0
  for (let i = 0; i < doctorId.length; i++) {
    hash = doctorId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const formatDate = (date: Date | string): string => {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

const formatDisplayDate = (date: string): string => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

const isDateInCurrentWindow = (date: string, windowInfo: WindowInfo | null): boolean => {
  if (!windowInfo) return false
  const targetDate = new Date(date)
  const windowStart = new Date(windowInfo.start)
  const windowEnd = new Date(windowInfo.end)
  return targetDate >= windowStart && targetDate <= windowEnd
}

const isPastDate = (date: string): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  return targetDate < today
}

const isToday = (date: string): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  return targetDate.getTime() === today.getTime()
}

const generateTimeSlots = (
  start: string,
  end: string,
  duration: number,
  type: TimeSlot['type'] = 'working'
): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const [startHour, startMin] = start.split(':').map(Number)
  const [endHour, endMin] = end.split(':').map(Number)

  let current = new Date()
  current.setHours(startHour, startMin, 0, 0)
  const endTime = new Date()
  endTime.setHours(endHour, endMin, 0, 0)

  if (endHour < startHour) {
    endTime.setDate(endTime.getDate() + 1)
  }

  let slotCounter = 1
  while (current < endTime) {
    const slotEnd = new Date(current.getTime() + duration * 60000)

    if (slotEnd > endTime) break

    const slotTime = current.getHours() * 60 + current.getMinutes()
    const isPeakHour = (slotTime >= 9 * 60 && slotTime < 11 * 60) || (slotTime >= 14 * 60 && slotTime < 16 * 60)

    const slotId = `slot-${Date.now()}-${slotCounter++}`

    slots.push({
      id: slotId,
      start: current.toTimeString().slice(0, 5),
      end: slotEnd.toTimeString().slice(0, 5),
      type,
      capacity: 0,
      assignedDoctors: [],
      availableCapacity: 10000,
      slotType: type === 'working' ? 'standard' : type,
      duration,
      isShifted: false,
      isPeakHour,
      specialization: 'general',
      specializations: ['general'],
      consultationType: 'face-to-face',
      bufferTime: 5,
      priority: 'normal',
      tags: [],
      isAvailable: true,
      startTime: current.toISOString(),
      endTime: slotEnd.toISOString(),
      startDisplay: current.toTimeString().slice(0, 5),
      endDisplay: slotEnd.toTimeString().slice(0, 5)
    })

    current = new Date(slotEnd.getTime())
  }

  return slots
}

const generateNightShiftSlots = (): TimeSlot[] => {
  const part1 = generateTimeSlots('18:00', '22:00', 60, 'night-shift')
  const part2 = generateTimeSlots('23:00', '08:00', 60, 'night-shift')
  return [...part1, ...part2]
}

const generateLunchBreakId = () => {
  return `lunch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

const groupDaysByWeek = (dailySchedules: DailySchedule[]): WeekData[] => {
  const weeks: Map<number, WeekData> = new Map()

  dailySchedules.forEach((day: DailySchedule) => {
    const date = new Date(day.date)
    const weekNumber = getWeekNumber(date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    if (!weeks.has(weekNumber)) {
      weeks.set(weekNumber, {
        weekNumber,
        label: `Week ${weekNumber}`,
        startDate: weekStart,
        endDate: weekEnd,
        dates: []
      })
    }

    weeks.get(weekNumber)!.dates.push(day.date)
  })

  return Array.from(weeks.values()).sort((a, b) => a.weekNumber - b.weekNumber)
}

// ============ DOCTOR ASSIGNMENTS VIEW ============
const DoctorAssignmentsView = ({
  doctors,
  schedule,
  onClose
}: {
  doctors: BasicPractitioner[];
  schedule: RollingSchedule | null;
  onClose: () => void;
}) => {
  const [doctorAssignments, setDoctorAssignments] = useState<DoctorAssignmentData[]>([])

  useEffect(() => {
    if (!schedule || !schedule.dailySchedules || !doctors.length) return

    const assignments: DoctorAssignmentData[] = doctors.map((doctor: BasicPractitioner) => {
      const doctorAssignment: DoctorAssignmentData = {
        doctorId: doctor._id,
        doctorName: doctor.name,
        specialization: doctor.specialization || [],
        assignments: [],
        totalWeeklySlots: 0,
        totalWeeklyCapacity: 0,
        totalWeeklyPatients: 0
      }

      schedule.dailySchedules.forEach((day: DailySchedule) => {
        if (!day.isWorking || !day.timeSlots) return

        const dayAssignments: DayAssignment = {
          date: day.date,
          dayName: day.dayName,
          slots: [],
          totalSlots: 0,
          totalCapacity: 0,
          totalPatients: 0
        }

        day.timeSlots.forEach((slot: TimeSlot) => {
          if (!slot.assignedDoctors) return
          const isAssigned = slot.assignedDoctors.some((d: DoctorAssignment) => d.doctorId === doctor._id)
          if (isAssigned) {
            const [hour] = slot.start.split(':').map(Number)
            let type: 'morning' | 'afternoon' | 'night' = 'morning'

            if (hour >= 18 || hour < 8) {
              type = 'night'
            } else if (hour >= 13) {
              type = 'afternoon'
            }

            const patientCapacity = slot.assignedDoctors
              .find((d: DoctorAssignment) => d.doctorId === doctor._id)
              ?.maxPatients || 0

            dayAssignments.slots.push({
              id: slot.id,
              start: slot.start,
              end: slot.end,
              type,
              capacity: slot.capacity,
              assignedDoctorsCount: slot.assignedDoctors.length,
              patientCapacity
            })

            dayAssignments.totalSlots++
            dayAssignments.totalCapacity += slot.capacity
            dayAssignments.totalPatients += patientCapacity
          }
        })

        if (dayAssignments.totalSlots > 0) {
          doctorAssignment.assignments.push(dayAssignments)
          doctorAssignment.totalWeeklySlots += dayAssignments.totalSlots
          doctorAssignment.totalWeeklyCapacity += dayAssignments.totalCapacity
          doctorAssignment.totalWeeklyPatients += dayAssignments.totalPatients
        }
      })

      return doctorAssignment
    })

    setDoctorAssignments(assignments.filter(d => d.totalWeeklySlots > 0))
  }, [schedule, doctors])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Doctor Assignments</h3>
            <p className="text-sm text-gray-600">View all doctor assignments across the schedule</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors duration-300 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {doctorAssignments.map((doctor: DoctorAssignmentData) => (
            <div key={doctor.doctorId} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-white font-bold">
                        {doctor.doctorName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">{doctor.doctorName}</h4>
                      <p className="text-sm text-gray-600">
                        {doctor.specialization.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{doctor.totalWeeklySlots}</div>
                  <div className="text-sm text-gray-600">Total Slots</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600">Weekly Capacity</div>
                  <div className="text-lg font-bold text-gray-900">{doctor.totalWeeklyCapacity}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600">Patient Capacity</div>
                  <div className="text-lg font-bold text-green-600">{doctor.totalWeeklyPatients}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600">Days Assigned</div>
                  <div className="text-lg font-bold text-purple-600">{doctor.assignments.length}</div>
                </div>
              </div>

              <div className="space-y-3">
                {doctor.assignments.map((day: DayAssignment, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{day.dayName}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{day.totalSlots} slots</p>
                        <p className="text-sm text-gray-600">{day.totalPatients} patients</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {day.slots.map((slot, slotIdx: number) => (
                        <div key={slotIdx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              slot.type === 'morning' ? 'bg-yellow-100 text-yellow-800' :
                              slot.type === 'afternoon' ? 'bg-orange-100 text-orange-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {slot.type}
                            </div>
                            <span className="font-medium">{slot.start} - {slot.end}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {slot.patientCapacity} patients • {slot.assignedDoctorsCount} doctors
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {doctorAssignments.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 text-gray-300 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Assignments Found</h4>
              <p className="text-gray-600">No doctors have been assigned to any slots yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ ICONS ============
const Icons = {
  Calendar: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Doctor: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Plus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Trash: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Save: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
  Assignment: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Shift: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  Lunch: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M5 10v9a2 2 0 002 2h10a2 2 0 002-2v-9M5 10V7a2 2 0 012-2h10a2 2 0 012 2v3" />
    </svg>
  ),
  Copy: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Refresh: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Settings: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ChevronLeft: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Week: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

// ============ UI COMPONENTS ============
const AnimatedCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-200 p-4 transition-all duration-300 hover:shadow-lg hover:border-blue-300 ${className}`}>
    {children}
  </div>
)

const GradientButton = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  disabled = false,
  type = 'button'
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    secondary: 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
    success: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    warning: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

const PulseDot = ({ color = '#3B82F6', size = 'medium' }: { color?: string; size?: 'small' | 'medium' | 'large' }) => {
  const sizes = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4'
  }

  return (
    <div className="relative">
      <div
        className={`${sizes[size]} rounded-full`}
        style={{ backgroundColor: color }}
      />
      <div
        className={`absolute inset-0 ${sizes[size]} rounded-full animate-ping`}
        style={{ backgroundColor: color, opacity: 0.3 }}
      />
    </div>
  )
}

const WeekSelector = ({ 
  weeks, 
  activeWeek, 
  onWeekChange 
}: { 
  weeks: WeekData[]; 
  activeWeek: number | null; 
  onWeekChange: (weekNumber: number) => void;
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {weeks.map((week: WeekData) => (
        <button
          key={week.weekNumber}
          onClick={() => onWeekChange(week.weekNumber)}
          className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all duration-300 ${
            activeWeek === week.weekNumber
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="text-sm font-medium">{week.label}</div>
          <div className="text-xs opacity-80">
            {week.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
            {week.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </button>
      ))}
    </div>
  )
}

// ============ MAIN COMPONENT ============
export default function EditingNextWeek() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()

  const { practitioners, loading: practitionersLoading } = useSelector((state: RootState) => state.medicalStaff)
  
  // Safe selector with fallback values
  const editingNextWeekState = useSelector((state: RootState) => {
    const slice = state.editingNextWeek;
    return {
      rollingSchedule: slice?.rollingSchedule || null,
      isLoading: slice?.isLoading || false,
      error: slice?.error || null,
      success: slice?.success || null,
      settings: slice?.settings || {
        slotDuration: 30,
        bufferTime: 5,
        maxDoctorsPerSlot: 100,
        defaultSlotCapacity: 0,
        enableEmergencyMode: true,
        enableNightShift: true,
        lunchDuration: 60,
        nightLunchDuration: 45,
        enableSpecializationFilter: true,
        enableContinuousNightShift: true,
        autoRollEnabled: true
      },
      selectedDate: slice?.selectedDate || null,
      selectedSlot: slice?.selectedSlot || null,
      activeTab: slice?.activeTab || 'schedule',
      windowInfo: slice?.windowInfo || null,
      activeWeek: slice?.activeWeek || null,
      isSaving: slice?.isSaving || false,
      isRolling: slice?.isRolling || false
    };
  })

  const [isAddingLunch, setIsAddingLunch] = useState<string | null>(null)
  const [newLunchBreak, setNewLunchBreak] = useState({ start: '12:00', end: '13:00', type: 'lunch' as 'lunch' | 'night-lunch' })
  const [showDoctorAssignments, setShowDoctorAssignments] = useState(false)
  const [copyFromDate, setCopyFromDate] = useState<string | null>(null)
  const [showCopyModal, setShowCopyModal] = useState(false)

  // Destructure after getting safe state
  const {
    rollingSchedule,
    isLoading,
    error,
    success,
    settings,
    selectedDate,
    selectedSlot,
    activeTab,
    windowInfo,
    activeWeek
  } = editingNextWeekState

  // Fetch practitioners on load
  useEffect(() => {
    if (practitioners.length === 0) {
      dispatch(fetchPractitioners())
    }
  }, [dispatch, practitioners.length])

  // Fetch rolling window on load
  useEffect(() => {
    dispatch(getRollingWindow())
  }, [dispatch])

  // Clear notifications after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        dispatch(clearNotifications())
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success, dispatch])

  // Group days by week
  const weeks = useMemo(() => {
    if (!rollingSchedule?.dailySchedules) return []
    return groupDaysByWeek(rollingSchedule.dailySchedules)
  }, [rollingSchedule])

  // Filter days for active week
  const filteredDays = useMemo(() => {
    if (!rollingSchedule?.dailySchedules || !activeWeek) return rollingSchedule?.dailySchedules || []
    return rollingSchedule.dailySchedules.filter((day: DailySchedule) => {
      const weekNumber = getWeekNumber(new Date(day.date))
      return weekNumber === activeWeek
    })
  }, [rollingSchedule, activeWeek])

  // Set default active week
  useEffect(() => {
    if (weeks.length > 0 && !activeWeek) {
      dispatch(setActiveWeek(weeks[0].weekNumber))
    }
  }, [weeks, activeWeek, dispatch])

  // Save schedule
  const handleSave = useCallback(async () => {
    if (!rollingSchedule) return

    try {
      dispatch(setLoading(true))

      // Save the entire schedule
      await dispatch(saveSchedule({
        scheduleId: rollingSchedule._id,
        schedule: rollingSchedule
      })).unwrap()

      dispatch(setSuccess('Schedule saved successfully'))
      
      // Refresh schedule
      dispatch(getRollingWindow())
      
    } catch (error: any) {
      console.error("Save error:", error)
      dispatch(setError(error.message || 'Failed to save schedule'))
    } finally {
      dispatch(setLoading(false))
    }
  }, [rollingSchedule, dispatch])

  // Assign doctor to slot
  const handleAssignDoctor = useCallback((date: string, slotIndex: number, doctorId: string) => {
    if (!rollingSchedule) return

    const doctor = practitioners.find(d => d._id === doctorId)
    if (!doctor) return

    // Get day from schedule
    const daySchedule = rollingSchedule.dailySchedules.find((d: DailySchedule) => 
      formatDate(d.date) === formatDate(date)
    )

    if (!daySchedule || !daySchedule.timeSlots || !daySchedule.isWorking) return

    const slot = daySchedule.timeSlots[slotIndex]
    if (!slot) return

    // Check if doctor already assigned
    const isAlreadyAssigned = slot.assignedDoctors?.some((d: DoctorAssignment) => d.doctorId === doctorId)
    if (isAlreadyAssigned) {
      dispatch(setError('Doctor already assigned to this slot'))
      return
    }

    // Update state synchronously
    dispatch(assignDoctorToSlotSync({
      date,
      slotIndex,
      doctorId,
      doctorName: doctor.name,
      specialization: doctor.specialization || ['general'],
      maxPatients: 1
    }))

    // Async API call
    if (rollingSchedule._id) {
      dispatch(assignDoctorToSlot({
        scheduleId: rollingSchedule._id,
        date,
        slotIndex,
        doctorId,
        doctorName: doctor.name,
        maxPatients: 1,
        specialization: doctor.specialization || ['general']
      }))
    }

    // Close modal
    dispatch(setSelectedDate(null))
    dispatch(setSelectedSlot(null))
  }, [rollingSchedule, practitioners, dispatch])

  // Remove doctor from slot
  const handleRemoveDoctor = useCallback((date: string, slotIndex: number, doctorId: string) => {
    if (!rollingSchedule) return

    // Update state synchronously
    dispatch(removeDoctorFromSlotSync({
      date,
      slotIndex,
      doctorId
    }))

    // Async API call
    if (rollingSchedule._id) {
      dispatch(removeDoctorFromSlot({
        scheduleId: rollingSchedule._id,
        date,
        slotIndex,
        doctorId
      }))
    }
  }, [rollingSchedule, dispatch])

  // Update slot duration
  const handleUpdateSlotDuration = useCallback((date: string, slotDuration: number) => {
    if (!rollingSchedule || isPastDate(date)) return

    // Find the day
    const day = rollingSchedule.dailySchedules.find((d: DailySchedule) => formatDate(d.date) === formatDate(date))
    if (!day) return

    // Regenerate time slots with new duration
    let newTimeSlots: TimeSlot[] = []

    if (day.sessions.morning.enabled) {
      newTimeSlots = [
        ...newTimeSlots,
        ...generateTimeSlots(day.sessions.morning.start, day.sessions.morning.end, slotDuration, 'working')
      ]
    }

    if (day.sessions.afternoon.enabled) {
      newTimeSlots = [
        ...newTimeSlots,
        ...generateTimeSlots(day.sessions.afternoon.start, day.sessions.afternoon.end, slotDuration, 'working')
      ]
    }

    if (day.sessions.night.enabled) {
      newTimeSlots = [
        ...newTimeSlots,
        ...generateNightShiftSlots()
      ]
    }

    // Preserve existing assignments
    newTimeSlots.forEach((newSlot: TimeSlot) => {
      const matchingOldSlot = day.timeSlots.find((old: TimeSlot) =>
        old.start === newSlot.start && old.end === newSlot.end
      )
      if (matchingOldSlot) {
        newSlot.assignedDoctors = matchingOldSlot.assignedDoctors
        newSlot.availableCapacity = matchingOldSlot.availableCapacity
        newSlot.capacity = matchingOldSlot.capacity
      }
    })

    // Create updated schedule with proper typing
    const updatedSchedule: RollingSchedule = {
      ...rollingSchedule,
      dailySchedules: rollingSchedule.dailySchedules.map((d: DailySchedule) =>
        formatDate(d.date) === formatDate(date)
          ? { 
              ...d, 
              slotDuration, 
              timeSlots: newTimeSlots,
              totalCapacity: newTimeSlots.reduce((sum: number, slot: TimeSlot) => sum + slot.capacity, 0)
            }
          : d
      )
    }

    dispatch(updateRollingSchedule(updatedSchedule))

    // Async API call
    if (rollingSchedule._id) {
      dispatch(updateSlotDuration({
        scheduleId: rollingSchedule._id,
        date,
        slotDuration
      }))
    }
  }, [rollingSchedule, dispatch])

  // Add lunch break
  const handleAddLunchBreak = useCallback((date: string) => {
    if (!rollingSchedule || isPastDate(date)) return

    const lunchBreak: LunchBreak = {
      id: generateLunchBreakId(),
      start: newLunchBreak.start,
      end: newLunchBreak.end,
      startTime: newLunchBreak.start,
      endTime: newLunchBreak.end,
      startDisplay: newLunchBreak.start,
      endDisplay: newLunchBreak.end,
      reason: newLunchBreak.type === 'lunch' ? 'Lunch break' : 'Night shift break',
      duration: newLunchBreak.type === 'lunch' ? 60 : 45,
      enabled: true,
      recurring: true,
      affectedStaff: [],
      type: newLunchBreak.type
    }

    // Update state synchronously
    dispatch(addLunchBreakSync({
      date,
      lunchBreak
    }))

    // Async API call
    if (rollingSchedule._id) {
      dispatch(addLunchBreak({
        scheduleId: rollingSchedule._id,
        date,
        lunchBreak
      }))
    }

    setIsAddingLunch(null)
    setNewLunchBreak({ start: '12:00', end: '13:00', type: 'lunch' })
  }, [rollingSchedule, newLunchBreak, dispatch])

  // Remove lunch break
  const handleRemoveLunchBreak = useCallback((date: string, breakId: string) => {
    if (!rollingSchedule || isPastDate(date)) return

    // Update state synchronously
    dispatch(removeLunchBreakSync({
      date,
      breakId
    }))

    // Async API call
    if (rollingSchedule._id) {
      dispatch(removeLunchBreak({
        scheduleId: rollingSchedule._id,
        date,
        breakId
      }))
    }
  }, [rollingSchedule, dispatch])

  // Update session
  const handleUpdateSession = useCallback((date: string, session: 'morning' | 'afternoon' | 'night', field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    if (!rollingSchedule || isPastDate(date)) return

    // Update state synchronously
    dispatch(updateSessionSync({
      date,
      sessionKey: session,
      updates: { [field]: value }
    }))

    // Async API call
    if (rollingSchedule._id) {
      dispatch(updateSession({
        scheduleId: rollingSchedule._id,
        date,
        sessionKey: session,
        updates: { [field]: value }
      }))
    }
  }, [rollingSchedule, dispatch])

  // Toggle working day
  const handleToggleWorkingDay = useCallback((date: string, isWorking: boolean) => {
    if (!rollingSchedule || isPastDate(date)) return

    // Update state synchronously
    dispatch(toggleWorkingDaySync({
      date,
      isWorking
    }))

    // Async API call
    if (rollingSchedule._id) {
      dispatch(toggleWorkingDay({
        scheduleId: rollingSchedule._id,
        date,
        isWorking
      }))
    }
  }, [rollingSchedule, dispatch])

  // Generate slots for day
  const handleGenerateSlotsForDay = useCallback((date: string) => {
    if (!rollingSchedule || isPastDate(date)) return

    const day = rollingSchedule.dailySchedules.find((d: DailySchedule) => formatDate(d.date) === formatDate(date))
    if (!day || !day.isWorking) return

    let newTimeSlots: TimeSlot[] = []

    if (day.sessions.morning.enabled) {
      newTimeSlots = [
        ...newTimeSlots,
        ...generateTimeSlots(day.sessions.morning.start, day.sessions.morning.end, day.slotDuration || 30, 'working')
      ]
    }

    if (day.sessions.afternoon.enabled) {
      newTimeSlots = [
        ...newTimeSlots,
        ...generateTimeSlots(day.sessions.afternoon.start, day.sessions.afternoon.end, day.slotDuration || 30, 'working')
      ]
    }

    if (day.sessions.night.enabled) {
      newTimeSlots = [
        ...newTimeSlots,
        ...generateNightShiftSlots()
      ]
    }

    // Preserve existing assignments
    newTimeSlots.forEach((newSlot: TimeSlot) => {
      const matchingOldSlot = day.timeSlots.find((old: TimeSlot) =>
        old.start === newSlot.start && old.end === newSlot.end
      )
      if (matchingOldSlot) {
        newSlot.assignedDoctors = matchingOldSlot.assignedDoctors
        newSlot.availableCapacity = matchingOldSlot.availableCapacity
        newSlot.capacity = matchingOldSlot.capacity
      }
    })

    const updatedSchedule: RollingSchedule = {
      ...rollingSchedule,
      dailySchedules: rollingSchedule.dailySchedules.map((d: DailySchedule) =>
        formatDate(d.date) === formatDate(date)
          ? { 
              ...d, 
              timeSlots: newTimeSlots,
              totalCapacity: newTimeSlots.reduce((sum: number, slot: TimeSlot) => sum + slot.capacity, 0)
            }
          : d
      )
    }

    dispatch(updateRollingSchedule(updatedSchedule))
  }, [rollingSchedule, dispatch])

  // Apply template to all days
  const applyTemplateToAll = useCallback((template: 'standard' | 'extended' | 'shift') => {
    if (!rollingSchedule) return

    const templates = {
      standard: {
        morning: { start: '09:00', end: '12:00', enabled: true },
        afternoon: { start: '13:00', end: '17:00', enabled: true },
        night: { start: '18:00', end: '20:00', enabled: false }
      },
      extended: {
        morning: { start: '08:00', end: '12:00', enabled: true },
        afternoon: { start: '13:00', end: '20:00', enabled: true },
        night: { start: '20:00', end: '22:00', enabled: true }
      },
      shift: {
        morning: { start: '08:00', end: '16:00', enabled: true },
        afternoon: { start: '16:00', end: '00:00', enabled: true },
        night: { start: '00:00', end: '08:00', enabled: true }
      }
    }

    const templateData = templates[template]
    const updatedSchedule: RollingSchedule = {
      ...rollingSchedule,
      dailySchedules: rollingSchedule.dailySchedules.map((day: DailySchedule) => {
        if (isPastDate(day.date)) return day

        const updatedDay: DailySchedule = { 
          ...day,
          sessions: {
            morning: { ...day.sessions.morning, ...templateData.morning },
            afternoon: { ...day.sessions.afternoon, ...templateData.afternoon },
            night: { ...day.sessions.night, ...templateData.night }
          }
        }

        // Regenerate slots if day is working
        if (updatedDay.isWorking) {
          let newTimeSlots: TimeSlot[] = []

          if (updatedDay.sessions.morning.enabled) {
            newTimeSlots = [
              ...newTimeSlots,
              ...generateTimeSlots(
                updatedDay.sessions.morning.start,
                updatedDay.sessions.morning.end,
                updatedDay.slotDuration || 30,
                'working'
              )
            ]
          }

          if (updatedDay.sessions.afternoon.enabled) {
            newTimeSlots = [
              ...newTimeSlots,
              ...generateTimeSlots(
                updatedDay.sessions.afternoon.start,
                updatedDay.sessions.afternoon.end,
                updatedDay.slotDuration || 30,
                'working'
              )
            ]
          }

          if (updatedDay.sessions.night.enabled) {
            newTimeSlots = [
              ...newTimeSlots,
              ...generateNightShiftSlots()
            ]
          }

          updatedDay.timeSlots = newTimeSlots
          updatedDay.totalCapacity = newTimeSlots.reduce((sum: number, slot: TimeSlot) => sum + slot.capacity, 0)
        }

        return updatedDay
      })
    }

    dispatch(updateRollingSchedule(updatedSchedule))
  }, [rollingSchedule, dispatch])

  // Set all working days for current week
  const setAllWorkingDaysForWeek = useCallback((isWorking: boolean) => {
    if (!rollingSchedule || !activeWeek) return

    const updatedSchedule: RollingSchedule = {
      ...rollingSchedule,
      dailySchedules: rollingSchedule.dailySchedules.map((day: DailySchedule) => {
        const weekNumber = getWeekNumber(new Date(day.date))
        if (weekNumber !== activeWeek || isPastDate(day.date)) return day

        const updatedDay: DailySchedule = { ...day, isWorking }

        if (!isWorking) {
          updatedDay.timeSlots = []
          updatedDay.assignedDoctors = []
          updatedDay.totalCapacity = 0
        }

        return updatedDay
      })
    }

    dispatch(updateRollingSchedule(updatedSchedule))
  }, [rollingSchedule, activeWeek, dispatch])

  // Clear all assignments for current week
  const clearAllAssignmentsForWeek = useCallback(() => {
    if (!rollingSchedule || !activeWeek) return

    const updatedSchedule: RollingSchedule = {
      ...rollingSchedule,
      dailySchedules: rollingSchedule.dailySchedules.map((day: DailySchedule) => {
        const weekNumber = getWeekNumber(new Date(day.date))
        if (weekNumber !== activeWeek) return day

        const updatedTimeSlots = day.timeSlots.map((slot: TimeSlot) => ({
          ...slot,
          assignedDoctors: [],
          availableCapacity: slot.capacity
        }))

        return {
          ...day,
          timeSlots: updatedTimeSlots,
          assignedDoctors: []
        }
      })
    }

    dispatch(updateRollingSchedule(updatedSchedule))
    dispatch(setSuccess('All assignments cleared for this week'))
  }, [rollingSchedule, activeWeek, dispatch])

  // Copy schedule from one date to another
  const handleCopySchedule = useCallback((fromDate: string, toDate: string) => {
    if (!rollingSchedule) return

    const fromDay = rollingSchedule.dailySchedules.find((d: DailySchedule) => formatDate(d.date) === formatDate(fromDate))
    const toDayIndex = rollingSchedule.dailySchedules.findIndex((d: DailySchedule) => formatDate(d.date) === formatDate(toDate))

    if (!fromDay || toDayIndex === -1) return

    const updatedSchedule: RollingSchedule = {
      ...rollingSchedule,
      dailySchedules: rollingSchedule.dailySchedules.map((day: DailySchedule, index: number) => {
        if (index === toDayIndex) {
          return {
            ...day,
            isWorking: fromDay.isWorking,
            sessions: { ...fromDay.sessions },
            timeSlots: fromDay.timeSlots.map((slot: TimeSlot) => ({
              ...slot,
              id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
            })),
            lunchBreaks: fromDay.lunchBreaks.map((breakItem: LunchBreak) => ({
              ...breakItem,
              id: generateLunchBreakId()
            })),
            slotDuration: fromDay.slotDuration,
            totalCapacity: fromDay.totalCapacity
          }
        }
        return day
      })
    }

    dispatch(updateRollingSchedule(updatedSchedule))
    setShowCopyModal(false)
    setCopyFromDate(null)
    dispatch(setSuccess(`Schedule copied from ${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}`))
  }, [rollingSchedule, dispatch])

  // Roll window forward
  const handleRollWindow = useCallback(async () => {
    try {
      await dispatch(rollWindow()).unwrap()
      dispatch(setSuccess('Window rolled forward successfully'))
      dispatch(getRollingWindow())
    } catch (error: any) {
      dispatch(setError(error.message || 'Failed to roll window'))
    }
  }, [dispatch])

  // Handle copy button click
  const handleCopyButtonClick = useCallback((date: string) => {
    setCopyFromDate(date)
    setShowCopyModal(true)
  }, [])

  if (isLoading || practitionersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <DoctorNav />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Loading schedule editor...</p>
              <p className="text-gray-500 text-sm">Please wait while we load your schedule</p>
            </div>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">No Schedule Found</h1>
            <p className="text-gray-600 mb-6">Unable to load the rolling window schedule.</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => dispatch(getRollingWindow())}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Icons.Refresh className="w-5 h-5" />
                Reload Schedule
              </button>
              <Link
                href="/weekly-schedules"
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Schedules
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <DoctorNav />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              Advanced Schedule Planner
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  21-Day Rolling Window
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                  {weeks.length} Weeks
                </span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                  Today: {new Date().toLocaleDateString()}
                </span>
              </div>
              {windowInfo && (
                <p className="text-sm text-gray-600">
                  {new Date(windowInfo.start).toLocaleDateString()} - {new Date(windowInfo.end).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowDoctorAssignments(true)}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center gap-2"
            >
              <Icons.Assignment className="w-5 h-5" />
              View Assignments
            </button>
            <button
              onClick={handleRollWindow}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 flex items-center gap-2"
            >
              <Icons.Refresh className="w-5 h-5" />
              Roll Window
            </button>
            <Link
              href="/weekly-schedules"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-300"
            >
              Cancel
            </Link>
            <GradientButton
              onClick={handleSave}
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <Icons.Save className="w-5 h-5" />
              {isLoading ? 'Saving...' : 'Save Schedule'}
            </GradientButton>
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-3 mb-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Week Selector */}
        {weeks.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Select Week to Edit</h2>
              <div className="text-sm text-gray-600">
                Showing {filteredDays.length} days for selected week
              </div>
            </div>
            <WeekSelector
              weeks={weeks}
              activeWeek={activeWeek}
              onWeekChange={(weekNumber) => dispatch(setActiveWeek(weekNumber))}
            />
          </div>
        )}

        {/* Stats Summary */}
        {activeWeek && (
          <AnimatedCard className="mb-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {filteredDays.filter((d: DailySchedule) => d.isWorking).length}
                </div>
                <div className="text-sm text-gray-600">Working Days</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {filteredDays.reduce((sum: number, day: DailySchedule) => sum + day.totalCapacity, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Capacity</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {new Set(
                    filteredDays.flatMap((day: DailySchedule) => day.assignedDoctors || [])
                  ).size}
                </div>
                <div className="text-sm text-gray-600">Assigned Doctors</div>
              </div>
              
            </div>
          </AnimatedCard>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-1 mb-6">
          {(['schedule', 'doctors', 'lunch', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => dispatch(setActiveTab(tab))}
              className={`flex-1 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab === 'schedule' && <Icons.Calendar className="w-4 h-4" />}
              {tab === 'doctors' && <Icons.Doctor className="w-4 h-4" />}
              {tab === 'lunch' && <Icons.Lunch className="w-4 h-4" />}
              {tab === 'settings' && <Icons.Settings className="w-4 h-4" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Week Controls */}
            {activeWeek && (
              <AnimatedCard className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-xl text-gray-900">Week {activeWeek} Controls</h3>
                    <p className="text-sm text-gray-600">
                      Apply settings and templates to all days in this week
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setAllWorkingDaysForWeek(true)}
                      className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      Set All Working Days
                    </button>
                    <button
                      onClick={() => setAllWorkingDaysForWeek(false)}
                      className="px-4 py-2 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      Set All Non-Working
                    </button>
                    <button
                      onClick={clearAllAssignmentsForWeek}
                      className="px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                    >
                      Clear All Assignments
                    </button>
                  </div>
                </div>

                {/* Templates */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Apply Template to All Days in Week</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => applyTemplateToAll('standard')}
                      className="px-3 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                    >
                      Standard 9-5
                    </button>
                    <button
                      onClick={() => applyTemplateToAll('extended')}
                      className="px-3 py-2 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
                    >
                      Extended 8-8
                    </button>
                    <button
                      onClick={() => applyTemplateToAll('shift')}
                      className="px-3 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      Shift System
                    </button>
                  </div>
                </div>
              </AnimatedCard>
            )}

            {/* Daily Schedules */}
            {filteredDays.map((day: DailySchedule, dayIndex: number) => {
              const isPast = isPastDate(day.date)
              const isTodayDate = isToday(day.date)
              const isReadOnly = isPast

              return (
                <AnimatedCard
                  key={`day-${dayIndex}-${day.date}`}
                  className={`p-6 ${isPast ? 'opacity-70' : ''} ${isTodayDate ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                >
                  {/* Day Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={day.isWorking}
                            onChange={(e) => handleToggleWorkingDay(day.date, e.target.checked)}
                            disabled={isReadOnly}
                            className={`w-6 h-6 text-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          {day.isWorking && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-gray-900">{day.dayName}</h3>
                            {isTodayDate && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                Today
                              </span>
                            )}
                            {isPast && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                                Past
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDisplayDate(day.date)}
                          </p>
                        </div>
                      </div>

                      {/* Day Actions */}
                      {!isReadOnly && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyButtonClick(day.date)}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                          >
                            <Icons.Copy className="w-3 h-3" />
                            Copy
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Day Stats */}
                    <div className="flex flex-wrap gap-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${day.isWorking ? 'text-green-600' : 'text-gray-400'}`}>
                          {day.isWorking ? 'Working' : 'Off'}
                        </div>
                        <div className="text-xs text-gray-500">Status</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{day.assignedDoctors?.length || 0}</div>
                        <div className="text-xs text-gray-500">Doctors</div>
                      </div>
                     
                     
                    </div>
                  </div>

                  {day.isWorking ? (
                    <div className="space-y-6">
                      {/* Working Hours Configuration */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-900">Working Hours</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Slot Duration:</span>
                            <div className="flex gap-1">
                              {[15, 30, 45, 60].map((duration) => (
                                <button
                                  key={duration}
                                  onClick={() => handleUpdateSlotDuration(day.date, duration)}
                                  disabled={isReadOnly}
                                  className={`px-2 py-1 text-xs font-medium rounded transition-all duration-300 ${
                                    (day.slotDuration || 30) === duration
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {duration}m
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {(['morning', 'afternoon', 'night'] as const).map((session) => (
                            <div key={`${day.date}-${session}`} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                  {session === 'morning' && <Icons.Sun className="w-4 h-4 text-yellow-500" />}
                                  {session === 'afternoon' && <Icons.Sun className="w-4 h-4 text-orange-500" />}
                                  {session === 'night' && <Icons.Moon className="w-4 h-4 text-purple-500" />}
                                  {session.charAt(0).toUpperCase() + session.slice(1)} Session
                                </label>
                                <button
                                  onClick={() => {
                                    if (isReadOnly) return
                                    handleUpdateSession(day.date, session, 'enabled', !day.sessions[session].enabled)
                                  }}
                                  disabled={isReadOnly}
                                  className={`w-8 h-4 rounded-full transition-colors ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''} ${
                                    day.sessions[session].enabled ? 'bg-green-500' : 'bg-gray-300'
                                  }`}
                                >
                                  <span className={`block w-3 h-3 bg-white rounded-full transform transition-transform ${
                                    day.sessions[session].enabled ? 'translate-x-4' : 'translate-x-1'
                                  }`} />
                                </button>
                              </div>

                              {day.sessions[session].enabled && (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <input
                                      type="time"
                                      value={day.sessions[session].start}
                                      onChange={(e) => handleUpdateSession(day.date, session, 'start', e.target.value)}
                                      disabled={isReadOnly}
                                      className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                    <input
                                      type="time"
                                      value={day.sessions[session].end}
                                      onChange={(e) => handleUpdateSession(day.date, session, 'end', e.target.value)}
                                      disabled={isReadOnly}
                                      className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {!isReadOnly && (
                          <div className="mt-4">
                            <button
                              onClick={() => handleGenerateSlotsForDay(day.date)}
                              disabled={isReadOnly}
                              className={`w-full py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              Generate Time Slots
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Time Slots Grid */}
                      {day.timeSlots && day.timeSlots.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h4 className="font-medium text-gray-900 text-lg">Time Slots</h4>
                              <p className="text-sm text-gray-600">
                                {day.timeSlots.length} slots • {day.slotDuration || 30} minutes each
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {day.timeSlots.map((slot: TimeSlot, slotIndex: number) => {
                             
                              const isNightShift = slot.type === 'night-shift'

                              return (
                                <AnimatedCard
                                  key={`${day.date}-${slotIndex}-${slot.id}`}
                                  
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-gray-900">
                                          {slot.start} - {slot.end}
                                        </span>
                                        {isNightShift && (
                                          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                            Night
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">
                                          {slot.duration} min
                                        </span>
                                        {slot.isPeakHour && (
                                          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                            Peak
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                               {/* Capacity */}
<div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm font-medium text-gray-700">Capacity depend on availability of Doctors or practitioners</span>

    
  </div>

  
</div>

                                 {/* Assigned Doctors */}
<div className="space-y-3">

  <div className="flex justify-between items-center">
    <div>
      <p className="text-sm font-medium text-gray-700">Assigned Doctors</p>
      <p className="text-xs text-gray-500">
        {(slot.assignedDoctors?.length || 0)} assigned
      </p>
    </div>

    {!isReadOnly && (
      <button
        onClick={() => {
          dispatch(setSelectedDate(day.date))
          dispatch(setSelectedSlot({ date: day.date, slotIndex }))
        }}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        + Add Doctor
      </button>
    )}
  </div>

  {/* Doctor List */}
  {slot.assignedDoctors?.map((doctor: DoctorAssignment) => (
    <div
      key={doctor.doctorId}
      className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <PulseDot color={doctor.colorCode} size="small" />

        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {doctor.doctorName}
          </p>

          <div className="flex items-center gap-1">
            {doctor.specialization?.slice(0, 2).map((spec, idx) => (
              <span key={idx} className="text-xs text-gray-500">
                {spec}{idx < Math.min(2, doctor.specialization.length - 1) ? " •" : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      {!isReadOnly && (
        <button
          onClick={() =>
            handleRemoveDoctor(day.date, slotIndex, doctor.doctorId)
          }
          className="p-1 text-red-500 hover:text-red-700 transition-colors text-lg"
          title="Remove doctor"
        >
          ×
        </button>
      )}
    </div>
  ))}

  {/* When no doctors */}
  {(!slot.assignedDoctors || slot.assignedDoctors.length === 0) && (
    <div className="text-center py-4 text-gray-400 border border-dashed border-gray-300 rounded-lg">
      <Icons.Doctor className="w-8 h-8 mx-auto mb-2" />
      <p className="text-sm">No doctors assigned</p>

      {!isReadOnly && (
        <button
          onClick={() => {
            dispatch(setSelectedDate(day.date))
            dispatch(setSelectedSlot({ date: day.date, slotIndex }))
          }}
          className="mt-2 text-blue-600 text-sm font-medium hover:text-blue-800"
        >
          Assign a doctor
        </button>
      )}
    </div>
  )}
</div>

                                </AnimatedCard>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          <Icons.Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">No Time Slots Created</h4>
                          <p className="text-gray-600 mb-4">
                            Configure working hours above or click "Generate Time Slots" to create slots.
                          </p>
                          {!isReadOnly && (
                            <button
                              onClick={() => handleGenerateSlotsForDay(day.date)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-colors"
                            >
                              Generate Time Slots
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="w-12 h-12 text-gray-400 mx-auto mb-4">
                        🌴
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Day Off</h4>
                      <p className="text-gray-600 mb-4">
                        This day is marked as non-working. No appointments will be scheduled.
                      </p>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleToggleWorkingDay(day.date, true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Set as Working Day
                        </button>
                      )}
                    </div>
                  )}
                </AnimatedCard>
              )
            })}
          </div>
        )}

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <AnimatedCard className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Available Doctors</h3>
                <p className="text-sm text-gray-600">
                  {practitioners.length} doctors available for scheduling
                </p>
              </div>
              <button
                onClick={() => setShowDoctorAssignments(true)}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300"
              >
                View All Assignments
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {practitioners.map((doctor: BasicPractitioner) => (
                <AnimatedCard key={doctor._id} className="p-4 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {doctor.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate">{doctor.name}</h4>
                      <p className="text-sm text-gray-600 truncate">
                        {doctor.specialization?.join(', ') || 'General Practitioner'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Email:</span>
                      <span className="text-gray-900 truncate">{doctor.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Role:</span>
                      <span className="text-gray-900">{doctor.role || 'Doctor'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        doctor.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doctor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </AnimatedCard>
        )}

        {/* Lunch Breaks Tab */}
        {activeTab === 'lunch' && rollingSchedule.dailySchedules && (
          <div className="space-y-6">
            {filteredDays.map((day: DailySchedule) => {
              const isReadOnly = isPastDate(day.date)

              return (
                <AnimatedCard key={`lunch-day-${day.date}`} className={`p-6 ${isReadOnly ? 'opacity-70' : ''}`}>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{day.dayName}</h3>
                      <p className="text-sm text-gray-600">
                        {formatDisplayDate(day.date)} • {(day.lunchBreaks?.length || 0)} breaks
                      </p>
                    </div>

                    {!isReadOnly && (
                      <GradientButton
                        onClick={() => setIsAddingLunch(day.date)}
                        className="flex items-center gap-2"
                      >
                        <Icons.Plus className="w-4 h-4" />
                        Add Break
                      </GradientButton>
                    )}
                  </div>

                  {/* Existing Breaks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {day.lunchBreaks?.map((lunch: LunchBreak) => (
                      <div key={lunch.id} className={`p-4 border rounded-lg ${
                        lunch.type === 'night-lunch'
                          ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'
                          : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {lunch.type === 'night-lunch' ? (
                              <Icons.Moon className="w-5 h-5 text-purple-600" />
                            ) : (
                              <Icons.Lunch className="w-5 h-5 text-green-600" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {lunch.start} - {lunch.end}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  lunch.type === 'night-lunch'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {lunch.type === 'night-lunch' ? 'Night Break' : 'Day Lunch'}
                                </span>
                                <p className="text-sm text-gray-600">{lunch.duration} minutes</p>
                              </div>
                            </div>
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={() => handleRemoveLunchBreak(day.date, lunch.id)}
                              className="p-1 text-red-500 hover:text-red-700 transition-colors duration-300"
                            >
                              <Icons.Trash className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {lunch.type === 'night-lunch' && (
                          <p className="mt-3 text-sm text-purple-600 bg-purple-50 p-2 rounded">
                            ⏰ Night shift continues from 23:00 after this break
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Break Form */}
                  {!isReadOnly && isAddingLunch === day.date && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-4">Add New Break</h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <input
                              type="time"
                              value={newLunchBreak.start}
                              onChange={(e) => setNewLunchBreak({ ...newLunchBreak, start: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                            <input
                              type="time"
                              value={newLunchBreak.end}
                              onChange={(e) => setNewLunchBreak({ ...newLunchBreak, end: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Break Type</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setNewLunchBreak({ ...newLunchBreak, type: 'lunch' })}
                              className={`flex-1 py-2 rounded-lg transition-all duration-300 ${
                                newLunchBreak.type === 'lunch'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Day Lunch
                            </button>
                            <button
                              onClick={() => setNewLunchBreak({ ...newLunchBreak, type: 'night-lunch' })}
                              className={`flex-1 py-2 rounded-lg transition-all duration-300 ${
                                newLunchBreak.type === 'night-lunch'
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Night Break
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <GradientButton
                            onClick={() => handleAddLunchBreak(day.date)}
                            className="flex-1"
                          >
                            Add Break
                          </GradientButton>
                          <button
                            onClick={() => setIsAddingLunch(null)}
                            className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </AnimatedCard>
              )
            })}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <AnimatedCard className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Schedule Settings</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Slot Duration (minutes)
                  </label>
                  <select
                    value={settings.slotDuration}
                    onChange={(e) => {
                      if (!rollingSchedule) return
                      // Update global slot duration
                      const updatedSchedule: RollingSchedule = {
                        ...rollingSchedule,
                        slotDuration: parseInt(e.target.value),
                        dailySchedules: rollingSchedule.dailySchedules.map((day: DailySchedule) => ({
                          ...day,
                          slotDuration: parseInt(e.target.value)
                        }))
                      }
                      dispatch(updateRollingSchedule(updatedSchedule))
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buffer Time Between Slots (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.bufferTime}
                    onChange={(e) => {
                      if (!rollingSchedule) return
                      // Update global buffer time
                      const updatedSchedule: RollingSchedule = {
                        ...rollingSchedule,
                        bufferTime: parseInt(e.target.value)
                      }
                      dispatch(updateRollingSchedule(updatedSchedule))
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    min="0"
                    max="30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Doctors Per Slot
                  </label>
                  <input
                    type="number"
                    value={settings.maxDoctorsPerSlot}
                    onChange={(e) => {
                      if (!rollingSchedule) return
                      // Update global max doctors per slot
                      const updatedSchedule: RollingSchedule = {
                        ...rollingSchedule,
                        maxDoctorsPerSlot: parseInt(e.target.value)
                      }
                      dispatch(updateRollingSchedule(updatedSchedule))
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    min="1"
                    max="20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Slot Capacity
                  </label>
                  <input
                    type="number"
                    value={settings.defaultSlotCapacity}
                    onChange={(e) => {
                      if (!rollingSchedule) return
                      // Update global default slot capacity
                      const updatedSchedule: RollingSchedule = {
                        ...rollingSchedule,
                        dailySchedules: rollingSchedule.dailySchedules.map((day: DailySchedule) => ({
                          ...day,
                          timeSlots: day.timeSlots.map((slot: TimeSlot) => ({
                            ...slot,
                            capacity: parseInt(e.target.value),
                            availableCapacity: parseInt(e.target.value)
                          }))
                        }))
                      }
                      dispatch(updateRollingSchedule(updatedSchedule))
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    min="1"
                    max="100"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.enableEmergencyMode}
                      onChange={(e) => {
                        // Update emergency mode setting
                        const updatedSettings = {
                          ...settings,
                          enableEmergencyMode: e.target.checked
                        }
                        // You might want to dispatch an action to update settings
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label className="text-sm text-gray-700">Enable Emergency Mode</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.enableNightShift}
                      onChange={(e) => {
                        // Update night shift setting
                        const updatedSettings = {
                          ...settings,
                          enableNightShift: e.target.checked
                        }
                        // You might want to dispatch an action to update settings
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label className="text-sm text-gray-700">Enable Night Shift</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.enableSpecializationFilter}
                      onChange={(e) => {
                        // Update specialization filter setting
                        const updatedSettings = {
                          ...settings,
                          enableSpecializationFilter: e.target.checked
                        }
                        // You might want to dispatch an action to update settings
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label className="text-sm text-gray-700">Enable Specialization Filter</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.enableContinuousNightShift}
                      onChange={(e) => {
                        // Update continuous night shift setting
                        const updatedSettings = {
                          ...settings,
                          enableContinuousNightShift: e.target.checked
                        }
                        // You might want to dispatch an action to update settings
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label className="text-sm text-gray-700">Continuous Night Shift</label>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedCard>
        )}
      </main>

      {/* Doctor Assignment Modal */}
      {selectedDate && selectedSlot && rollingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Assign Doctor</h3>
                <p className="text-sm text-gray-600">
                  {formatDisplayDate(selectedDate)} • {selectedSlot.slotIndex + 1}:00 slot
                </p>
              </div>
              <button
                onClick={() => {
                  dispatch(setSelectedDate(null))
                  dispatch(setSelectedSlot(null))
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-300 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {practitioners.map((doctor: BasicPractitioner) => {
                const daySchedule = rollingSchedule.dailySchedules.find((d: DailySchedule) => 
                  formatDate(d.date) === formatDate(selectedDate)
                )
                const slot = daySchedule?.timeSlots?.[selectedSlot.slotIndex]
                const isAssigned = slot?.assignedDoctors?.some((d: DoctorAssignment) => d.doctorId === doctor._id)

                return (
                  <div 
                    key={doctor._id} 
                    className={`flex items-center justify-between p-3 border rounded-lg transition-all duration-300 ${
                      isAssigned 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: generateDoctorColor(doctor._id) }}
                      >
                        {doctor.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doctor.name}</p>
                        <p className="text-sm text-gray-600">
                          {doctor.specialization?.join(', ') || 'General'}
                        </p>
                      </div>
                    </div>

                    {isAssigned ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-600 font-medium">Assigned</span>
                        <button
                          onClick={() => handleRemoveDoctor(selectedDate, selectedSlot.slotIndex, doctor._id)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Icons.Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAssignDoctor(selectedDate, selectedSlot.slotIndex, doctor._id)}
                        className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {practitioners.length === 0 && (
              <div className="text-center py-8">
                <Icons.Doctor className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No doctors available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Copy Schedule Modal */}
      {showCopyModal && copyFromDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Copy Schedule</h3>
                <p className="text-sm text-gray-600">
                  Copy schedule from {formatDisplayDate(copyFromDate)} to another date
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCopyModal(false)
                  setCopyFromDate(null)
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-300 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Copy to Date
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                  {rollingSchedule?.dailySchedules
                    .filter((day: DailySchedule) => formatDate(day.date) !== formatDate(copyFromDate))
                    .map((day: DailySchedule) => (
                      <button
                        key={day.date}
                        onClick={() => handleCopySchedule(copyFromDate, day.date)}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{day.dayName}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            {formatDisplayDate(day.date)}
                          </span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          day.isWorking 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {day.isWorking ? 'Working' : 'Off'}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowCopyModal(false)
                    setCopyFromDate(null)
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Assignments View Modal */}
      {showDoctorAssignments && (
        <DoctorAssignmentsView
          doctors={practitioners.map(p => ({
            _id: p._id,
            name: p.name,
            specialization: p.specialization || [],
            email: p.email,
            role: p.role,
            isActive: p.isActive
          }))}
          schedule={rollingSchedule}
          onClose={() => setShowDoctorAssignments(false)}
        />
      )}
    </div>
  )
}