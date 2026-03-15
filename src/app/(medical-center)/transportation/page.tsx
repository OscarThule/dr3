'use client'

export default function TransportationsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-indigo-500/20">
      <div className="text-center p-10 bg-white/70 backdrop-blur-lg shadow-2xl rounded-3xl border border-gray-200 max-w-xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Transportations
        </h1>

        <p className="text-lg text-gray-700 mb-6">
          This service is being prepared for all Medical Centers.
        </p>

        <span className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-md text-lg font-medium animate-pulse">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
