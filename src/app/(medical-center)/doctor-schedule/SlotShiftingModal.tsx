// app/components/SlotShiftingModal.tsx
import React, { useState } from 'react';
import type { DoctorSlot } from '@/app/redux/slices/DoctorSchedule';

interface SlotShiftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (delayMinutes: number, reason: string) => void;
  slot: DoctorSlot | null;
  date: string | null;
  loading: boolean;
}

const SlotShiftingModal: React.FC<SlotShiftingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  slot,
  date,
  loading
}) => {
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [reason, setReason] = useState('');

  if (!isOpen || !slot || !date) return null;

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const calculateNewTime = (currentTime: string, minutesToAdd: number): string => {
    const [hours, mins] = currentTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins, 0, 0);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    
    const newHours = date.getHours().toString().padStart(2, '0');
    const newMinutes = date.getMinutes().toString().padStart(2, '0');
    const period = date.getHours() >= 12 ? 'PM' : 'AM';
    const displayHours = date.getHours() % 12 || 12;
    return `${displayHours}:${newMinutes} ${period}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (delayMinutes > 0) {
      onSubmit(delayMinutes, reason);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header - Fixed */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delay & Shift Schedule</h3>
                <p className="text-gray-600 text-sm mt-1">
                  {slot && formatTime(slot.start)} • {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Content - Horizontal Layout */}
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Time Preview & Quick Actions */}
                <div className="space-y-6">
                  {/* Time Comparison Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-gray-800 mb-4 text-lg">Time Adjustment</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-xs font-medium text-gray-500 mb-1">Current Slot</p>
                        <p className="text-lg font-bold text-gray-900">{formatTime(slot.start)}</p>
                        <p className="text-sm text-gray-600">- {formatTime(slot.end)}</p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-100">
                        <p className="text-xs font-medium text-orange-600 mb-1">New Slot</p>
                        <p className="text-lg font-bold text-orange-700">
                          {calculateNewTime(slot.start, delayMinutes)}
                        </p>
                        <p className="text-sm text-orange-600">
                          - {calculateNewTime(slot.end, delayMinutes)}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-blue-200/50">
                      <p className="text-sm text-blue-700 font-medium">
                        All future slots will shift by <span className="font-bold text-orange-600">{delayMinutes} minutes</span>
                      </p>
                    </div>
                  </div>

                  {/* Quick Delay Buttons */}
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-4">Quick Delay Options</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[15, 30, 45, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setDelayMinutes(mins)}
                          className={`py-3 px-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                            delayMinutes === mins
                              ? 'bg-orange-500 text-white shadow-md transform scale-[1.02]'
                              : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow-sm border border-gray-300'
                          }`}
                        >
                          {mins} min
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom Delay Slider */}
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-medium text-gray-700">Custom Delay</label>
                        <span className="font-bold text-orange-600">{delayMinutes} minutes</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="240"
                        step="5"
                        value={delayMinutes}
                        onChange={(e) => setDelayMinutes(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-300 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>5 min</span>
                        <span>4 hours</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Reason & Actions */}
                <div className="space-y-6">
                  {/* Reason Input */}
                  <div className="bg-white p-5 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3">Reason for Delay (Optional)</h4>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g., Traffic, Emergency case, Personal reasons..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400 resize-none transition-all"
                      rows={4}
                    />
                  </div>

                  {/* Impact Warning */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-semibold text-yellow-800">Important Impact</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                            <li className="flex items-center">
                              <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full mr-2" />
                              All future appointments shifted
                            </li>
                            <li className="flex items-center">
                              <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full mr-2" />
                              Patients will be notified
                            </li>
                            <li className="flex items-center">
                              <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full mr-2" />
                              Cannot be auto-undone
                            </li>
                            <li className="flex items-center">
                              <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full mr-2" />
                              Affects entire day schedule
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading || delayMinutes <= 0}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Apply {delayMinutes}-Minute Delay
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Summary */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Total delay:</span>
                        <span className="font-bold text-orange-600">{delayMinutes} minutes</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-600">New start time:</span>
                        <span className="font-medium text-gray-900">
                          {calculateNewTime(slot.start, delayMinutes)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotShiftingModal;