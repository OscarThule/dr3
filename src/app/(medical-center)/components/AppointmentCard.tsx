'use client'

interface Appointment {
  id: number
  patient: string
  time: string
  type: string
  status: 'confirmed' | 'pending' | 'cancelled'
  duration: string
}

interface AppointmentCardProps {
  appointment: Appointment
}

export default function AppointmentCard({ appointment }: AppointmentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-semibold">
            {appointment.patient.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{appointment.patient}</h3>
          <p className="text-sm text-gray-600">{appointment.type}</p>
        </div>
      </div>

      <div className="text-right">
        <div className="font-semibold text-gray-900">{appointment.time}</div>
        <div className="text-sm text-gray-600">{appointment.duration}</div>
      </div>

      <div className="flex items-center space-x-3">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
          {appointment.status}
        </span>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Start
        </button>
      </div>
    </div>
  )
}