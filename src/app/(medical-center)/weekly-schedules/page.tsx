// weekly-schedule/page.tsx
'use client'
import { Calendar } from 'lucide-react'
import { useState, useEffect, memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDispatch, useSelector } from 'react-redux'
import DoctorNav from '@/app/(medical-center)/components/DoctorNav'
import { 
  updateDefaultHours, 
  addLunchBreak, 
  updateLunchBreak, 
  removeLunchBreak,
  clearError,
  clearSuccess,
  getDefaultOperationalHours,
  updateDefaultOperationalHours,
  resetDefaultOperationalHours,
  initializeWithTemplate
} from '@/app/redux/slices/weeklyScheduleSlice'
import { RootState, AppDispatch } from '@/app/redux/store'
import {
  DayOfWeek,
  SessionType,
  DefaultHours,
  Session,
  LunchBreak
} from '@/app/(medical-center)/weekly-schedules/types'

// =========================
//    ICONS WITH PROPER TYPES
// =========================

interface IconProps {
  className?: string;
}

const Icons = {
  Info: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Sun: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Moon: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  Clock: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Calendar: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Plus: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Trash: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Edit: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Lunch: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M5 10v9a2 2 0 002 2h10a2 2 0 002-2v-9M5 10V7a2 2 0 012-2h10a2 2 0 012 2v3" />
    </svg>
  ),
  Save: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
  Reset: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Refresh: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Warning: (props: IconProps) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

// =========================
//    STYLED COMPONENTS
// =========================

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const ModernCard: React.FC<ModernCardProps> = ({ children, className = '', hover = false }) => (
  <div className={`
    bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 
    transition-all duration-300 ease-out
    ${hover ? 'hover:shadow-2xl hover:scale-[1.01] hover:bg-white/100' : ''}
    ${className}
  `}>
    {children}
  </div>
);

interface ModernTrayProps {
  children: React.ReactNode;
  className?: string;
}

const ModernTray: React.FC<ModernTrayProps> = ({ children, className = '' }) => (
  <div className={`
    bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-xl border border-slate-200/80
    backdrop-blur-sm transition-all duration-300
    ${className}
  `}>
    {children}
  </div>
);

// =========================
//    COMPONENTS
// =========================

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onRetry, onDismiss }) => (
  <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl flex justify-between items-center">
    <div className="flex items-center space-x-2">
      <Icons.Warning className="w-4 h-4" />
      <span>{message}</span>
    </div>
    <div className="flex space-x-2">
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Retry
        </button>
      )}
      <button onClick={onDismiss} className="text-red-700 hover:text-red-900 font-bold text-lg">
        ×
      </button>
    </div>
  </div>
);

interface SuccessAlertProps {
  message: string;
  onDismiss: () => void;
}

const SuccessAlert: React.FC<SuccessAlertProps> = ({ message, onDismiss }) => (
  <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-xl flex justify-between items-center">
    <div className="flex items-center space-x-2">
      <Icons.Save className="w-4 h-4" />
      <span>{message}</span>
    </div>
    <button onClick={onDismiss} className="text-green-700 hover:text-green-900 font-bold text-lg">
      ×
    </button>
  </div>
);

// =========================
//    DEFAULT HOURS EDITOR
// =========================

interface DefaultHoursEditorProps {
  defaultHours: DefaultHours;
  isEditing: boolean;
  onUpdate: (day: DayOfWeek, session: SessionType, field: keyof Session, value: string | boolean) => void;
  onAddLunch: (day: DayOfWeek, isNight: boolean) => void;
  onUpdateLunch: (day: DayOfWeek, lunchId: string, updates: Partial<LunchBreak>, isNight: boolean) => void;
  onRemoveLunch: (day: DayOfWeek, lunchId: string, isNight: boolean) => void;
}

const DefaultHoursEditor: React.FC<DefaultHoursEditorProps> = memo(({
  defaultHours,
  isEditing,
  onUpdate,
  onAddLunch,
  onUpdateLunch,
  onRemoveLunch
}) => {
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Check if defaultHours is empty or invalid
  if (!defaultHours || Object.keys(defaultHours).length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-yellow-600 bg-yellow-50 p-4 rounded-lg inline-flex items-center space-x-2">
          <Icons.Warning className="w-4 h-4" />
          <span>No default hours data available. Please check your connection or try refreshing.</span>
        </div>
      </div>
    );
  }

  const sessionConfigs = [
    { key: 'morning' as const, label: 'Morning', icon: <Icons.Sun className="w-4 h-4" /> },
    { key: 'afternoon' as const, label: 'Afternoon', icon: <Icons.Clock className="w-4 h-4" /> },
    { key: 'night' as const, label: 'Night', icon: <Icons.Moon className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {days.map(day => {
          const dayData = defaultHours[day];
          
          // Safe access with fallbacks
          const morning = dayData?.morning || { start: '', end: '', enabled: false };
          const afternoon = dayData?.afternoon || { start: '', end: '', enabled: false };
          const night = dayData?.night || { start: '', end: '', enabled: false };
          const lunches = dayData?.lunches || [];
          const nightLunches = dayData?.nightLunches || [];

          return (
            <ModernTray key={day} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-900 text-base capitalize flex items-center space-x-2">
                  <Icons.Calendar className="w-4 h-4" />
                  <span className="capitalize">{day}</span>
                </h4>
                {isEditing && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => onAddLunch(day, false)}
                      className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      title="Add Day Lunch"
                    >
                      <Icons.Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onAddLunch(day, true)}
                      className="p-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                      title="Add Night Lunch"
                    >
                      <Icons.Moon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Sessions */}
              <div className="space-y-3">
                {sessionConfigs.map(({ key, label, icon }) => {
                  const sessionData = key === 'morning' ? morning : 
                                   key === 'afternoon' ? afternoon : night;
                  
                  return (
                    <div key={key} className="p-3 bg-white/80 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800 text-sm capitalize flex items-center space-x-2">
                          {icon}
                          <span>{label}</span>
                        </span>
                        {isEditing && (
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={sessionData?.enabled || false}
                              onChange={(e) => onUpdate(day, key, 'enabled', e.target.checked)}
                              className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700 font-medium">Active</span>
                          </label>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="time"
                          value={sessionData?.start || ''}
                          onChange={(e) => onUpdate(day, key, 'start', e.target.value)}
                          disabled={!isEditing}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-medium text-sm"
                        />
                        <span className="self-center text-gray-500 text-xs font-semibold">to</span>
                        <input
                          type="time"
                          value={sessionData?.end || ''}
                          onChange={(e) => onUpdate(day, key, 'end', e.target.value)}
                          disabled={!isEditing}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-medium text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day Lunch Breaks */}
              <div className="mt-3 space-y-2">
                <h5 className="font-semibold text-gray-800 text-sm flex items-center space-x-2">
                  <Icons.Lunch className="w-4 h-4" />
                  <span>Day Lunch Breaks</span>
                </h5>
                {lunches.map((lunch: LunchBreak) => (
                  <div key={lunch.id} className="p-2 bg-orange-50/80 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-2 mb-1">
                      <input
                        type="time"
                        value={lunch.start || ''}
                        onChange={(e) => onUpdateLunch(day, lunch.id, { start: e.target.value }, false)}
                        disabled={!isEditing}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:opacity-50 text-xs"
                      />
                      <span className="text-gray-500 text-xs">to</span>
                      <input
                        type="time"
                        value={lunch.end || ''}
                        onChange={(e) => onUpdateLunch(day, lunch.id, { end: e.target.value }, false)}
                        disabled={!isEditing}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:opacity-50 text-xs"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <input
                        type="text"
                        value={lunch.reason || ''}
                        onChange={(e) => onUpdateLunch(day, lunch.id, { reason: e.target.value }, false)}
                        disabled={!isEditing}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:opacity-50 text-xs mr-2"
                        placeholder="Break reason"
                      />
                      {isEditing && (
                        <div className="flex space-x-1">
                          <label className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={lunch.enabled || false}
                              onChange={(e) => onUpdateLunch(day, lunch.id, { enabled: e.target.checked }, false)}
                              className="w-3 h-3 text-orange-600 rounded"
                            />
                          </label>
                          <button
                            onClick={() => onRemoveLunch(day, lunch.id, false)}
                            className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            <Icons.Trash className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {lunches.length === 0 && isEditing && (
                  <div className="text-center text-gray-500 text-xs py-2">
                    No lunch breaks added
                  </div>
                )}
              </div>

              {/* Night Lunch Breaks */}
              <div className="mt-3 space-y-2">
                <h5 className="font-semibold text-gray-800 text-sm flex items-center space-x-2">
                  <Icons.Moon className="w-4 h-4" />
                  <span>Night Lunch Breaks</span>
                </h5>
                {nightLunches.map((lunch: LunchBreak) => (
                  <div key={lunch.id} className="p-2 bg-indigo-50/80 rounded-lg border border-indigo-200">
                    <div className="flex items-center space-x-2 mb-1">
                      <input
                        type="time"
                        value={lunch.start || ''}
                        onChange={(e) => onUpdateLunch(day, lunch.id, { start: e.target.value }, true)}
                        disabled={!isEditing}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-xs"
                      />
                      <span className="text-gray-500 text-xs">to</span>
                      <input
                        type="time"
                        value={lunch.end || ''}
                        onChange={(e) => onUpdateLunch(day, lunch.id, { end: e.target.value }, true)}
                        disabled={!isEditing}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-xs"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <input
                        type="text"
                        value={lunch.reason || ''}
                        onChange={(e) => onUpdateLunch(day, lunch.id, { reason: e.target.value }, true)}
                        disabled={!isEditing}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-xs mr-2"
                        placeholder="Break reason"
                      />
                      {isEditing && (
                        <div className="flex space-x-1">
                          <label className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={lunch.enabled || false}
                              onChange={(e) => onUpdateLunch(day, lunch.id, { enabled: e.target.checked }, true)}
                              className="w-3 h-3 text-indigo-600 rounded"
                            />
                          </label>
                          <button
                            onClick={() => onRemoveLunch(day, lunch.id, true)}
                            className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            <Icons.Trash className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {nightLunches.length === 0 && isEditing && (
                  <div className="text-center text-gray-500 text-xs py-2">
                    No night lunch breaks added
                  </div>
                )}
              </div>
            </ModernTray>
          );
        })}
      </div>
    </div>
  );
});

DefaultHoursEditor.displayName = 'DefaultHoursEditor';

// =========================
//    SCHEDULE CREATION BUTTON
// =========================

interface ScheduleCreationButtonProps {
  onClick: () => void;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'purple';
  disabled?: boolean;
}

const ScheduleCreationButton: React.FC<ScheduleCreationButtonProps> = memo(({ 
  onClick, 
  title, 
  description, 
  color,
  disabled = false
}) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
  };

  const disabledColors = 'from-gray-400 to-gray-500 cursor-not-allowed';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-4 bg-gradient-to-r text-white rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl text-left ${
        disabled ? disabledColors : colors[color]
      } ${disabled ? 'opacity-60' : 'hover:scale-105'}`}
    >
      <div className="flex items-center space-x-2 mb-2">
        <div className="p-1.5 bg-white/20 rounded-lg">
          <Icons.Calendar className="w-4 h-4" />
        </div>
        <div className="font-bold text-lg">{title}</div>
      </div>
      <p className="text-white/90 text-xs leading-relaxed">{description}</p>
      {disabled && (
        <p className="text-white/70 text-xs mt-2 italic">Complete default hours setup first</p>
      )}
    </button>
  );
});

ScheduleCreationButton.displayName = 'ScheduleCreationButton';

// =========================
//    MAIN COMPONENT
// =========================

export default function DefaultOperationalHours() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  
  // Get state from Redux with proper typing
  const { defaultHours, defaultOperationalHours, loading, error, success } = useSelector(
    (state: RootState) => state.weeklySchedules
  );

  const [showDefaultHours, setShowDefaultHours] = useState(true);
  const [isEditingDefaultHours, setIsEditingDefaultHours] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  // Load default operational hours on component mount
  useEffect(() => {
    const loadDefaultHours = async () => {
      console.log('Loading default operational hours...');
      try {
        await dispatch(getDefaultOperationalHours()).unwrap();
        setHasAttemptedLoad(true);
      } catch (error) {
        console.error('Failed to load default hours:', error);
        setHasAttemptedLoad(true);
      }
    };

    loadDefaultHours();
  }, [dispatch]);

  // Clear notifications after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        dispatch(clearError());
        dispatch(clearSuccess());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success, dispatch]);

  // Handle saving default hours
  const handleSaveDefaultHours = useCallback(async () => {
    if (!defaultHours || Object.keys(defaultHours).length === 0) {
      dispatch(clearError());
      dispatch(clearSuccess());
      // Using proper action type
      dispatch({ 
        type: 'weeklySchedule/setError', 
        payload: 'No default hours data to save' 
      });
      return;
    }

    try {
      console.log('Saving default hours:', defaultHours);
      await dispatch(updateDefaultOperationalHours({ defaultHours })).unwrap();
      setIsEditingDefaultHours(false);
    } catch (error) {
      console.error('Failed to save default hours:', error);
      // Error is already handled by the slice
    }
  }, [dispatch, defaultHours]);

  // Handle reset to template
  const handleResetToTemplate = useCallback(async () => {
    if (confirm('Are you sure you want to reset all default hours to the template? This action cannot be undone.')) {
      try {
        await dispatch(resetDefaultOperationalHours()).unwrap();
      } catch (error) {
        console.error('Failed to reset default hours:', error);
      }
    }
  }, [dispatch]);

  // Handle retry loading
  const handleRetryLoad = useCallback(() => {
    dispatch(getDefaultOperationalHours());
  }, [dispatch]);

  // Handle manual initialization with template
  const handleInitializeWithTemplate = useCallback(() => {
    dispatch(initializeWithTemplate());
    setIsEditingDefaultHours(true);
  }, [dispatch]);

  // Handle create schedule navigation
  const handleCreateSchedule = useCallback(() => {
    router.push('/weekly-schedules/editingNextWeek');
  }, [router]);

  // Local state update handlers with proper typing
  const handleUpdateDefaultHours = useCallback((day: DayOfWeek, session: SessionType, field: keyof Session, value: string | boolean) => {
    dispatch(updateDefaultHours({ day, session, field, value }));
  }, [dispatch]);

  const handleAddLunchBreak = useCallback((day: DayOfWeek, isNight: boolean = false) => {
    dispatch(addLunchBreak({ day, isNight }));
  }, [dispatch]);

  const handleUpdateLunchBreak = useCallback((day: DayOfWeek, lunchId: string, updates: Partial<LunchBreak>, isNight: boolean = false) => {
    dispatch(updateLunchBreak({ day, lunchId, updates, isNight }));
  }, [dispatch]);

  const handleRemoveLunchBreak = useCallback((day: DayOfWeek, lunchId: string, isNight: boolean = false) => {
    dispatch(removeLunchBreak({ day, lunchId, isNight }));
  }, [dispatch]);

  // Check if we have valid default hours data
  const hasValidDefaultHours = defaultHours && Object.keys(defaultHours).length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <DoctorNav />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Notifications */}
        {error && (
          <ErrorAlert 
            message={error} 
            onRetry={error.includes('fetch') ? handleRetryLoad : undefined}
            onDismiss={() => dispatch(clearError())}
          />
        )}
        {success && (
          <SuccessAlert 
            message={success} 
            onDismiss={() => dispatch(clearSuccess())}
          />
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              Default Operational Hours
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Configure and manage your medical center  default working hours</p>
            
            {defaultOperationalHours ? (
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>Last updated: {new Date(defaultOperationalHours.updated_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>Slot duration: {defaultOperationalHours.slotDuration} minutes</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 mt-2 text-sm text-amber-600">
                <Icons.Warning className="w-4 h-4" />
                <span>No saved configuration found. Set up your default hours below.</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/mainPage"
              className="px-6 py-3 bg-white/90 backdrop-blur-xl border border-gray-300 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-gray-700 hover:bg-white font-semibold flex items-center space-x-3 text-base"
            >
              <Icons.Calendar className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            

            <button
              onClick={handleRetryLoad}
              disabled={loading}
              className="px-4 py-3 bg-blue-100 border border-blue-300 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-blue-700 hover:bg-blue-200 font-semibold flex items-center space-x-2 text-sm disabled:opacity-50"
            >
              <Icons.Refresh className="w-4 h-4" />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Default Operational Hours Panel */}
        <ModernCard className="p-6 mb-8" hover>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Default Working Hours</h3>
              <p className="text-gray-600 text-sm">
                {hasValidDefaultHours 
                  ? 'Set unique working hours for each day with multiple break options' 
                  : 'Initialize your default working hours to get started'
                }
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!hasValidDefaultHours && !loading && (
                <button
                  onClick={handleInitializeWithTemplate}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 text-sm"
                >
                  <Icons.Plus className="w-4 h-4" />
                  <span>Initialize with Template</span>
                </button>
              )}

              {hasValidDefaultHours && isEditingDefaultHours ? (
                <>
                  <button
                    onClick={handleSaveDefaultHours}
                    disabled={loading}
                    className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 text-sm disabled:opacity-50"
                  >
                    <Icons.Save className="w-4 h-4" />
                    <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                  <button
                    onClick={() => setIsEditingDefaultHours(false)}
                    disabled={loading}
                    className="px-4 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 text-sm disabled:opacity-50"
                  >
                    <span>Cancel</span>
                  </button>
                </>
              ) : hasValidDefaultHours && (
                <>
                  <button
                    onClick={() => setIsEditingDefaultHours(true)}
                    disabled={loading}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 text-sm disabled:opacity-50"
                  >
                    <Icons.Edit className="w-4 h-4" />
                    <span>Edit Default Hours</span>
                  </button>
                  <button
                    onClick={handleResetToTemplate}
                    disabled={loading}
                    className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 text-sm disabled:opacity-50"
                  >
                    <Icons.Reset className="w-4 h-4" />
                    <span>Reset to Template</span>
                  </button>
                </>
              )}
              
              {hasValidDefaultHours && (
                <button
                  onClick={() => setShowDefaultHours(!showDefaultHours)}
                  className="px-4 py-2.5 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 text-sm"
                >
                  <Icons.Clock className="w-4 h-4" />
                  <span>{showDefaultHours ? 'Hide Hours' : 'Show Hours'}</span>
                </button>
              )}
            </div>
          </div>

          {loading && <LoadingSpinner />}

          {showDefaultHours && hasValidDefaultHours && (
            <DefaultHoursEditor
              defaultHours={defaultHours}
              isEditing={isEditingDefaultHours}
              onUpdate={handleUpdateDefaultHours}
              onAddLunch={handleAddLunchBreak}
              onUpdateLunch={handleUpdateLunchBreak}
              onRemoveLunch={handleRemoveLunchBreak}
            />
          )}

          {!hasValidDefaultHours && !loading && hasAttemptedLoad && (
            <div className="text-center py-8">
              <div className="max-w-md mx-auto">
                <Icons.Warning className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Set up Default Hours if you did not yet</h4>
                <p className="text-gray-600 mb-4">
                 Set up your default operational hours to streamline schedule creation and management.
                </p>
                <button
                  onClick={handleInitializeWithTemplate}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Start with Template Hours
                </button>
              </div>
            </div>
          )}
        </ModernCard>

        {/* Schedule Generation */}
        <ModernCard className="p-6" hover>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Create New Weekly Schedules</h3>
              <p className="text-gray-600 text-sm">
                {defaultOperationalHours 
                  ? 'Plan schedules up to 3 weeks in advance using your default working hours' 
                  : 'Save your default operational hours first to create schedules'
                }
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ScheduleCreationButton
              onClick={() => router.push('/weekly-schedules/editingNextWeek')}
              title="Rolling Schedule Editor"
              description="Edit schedule for the next 21 days from today. System automatically maintains rolling window."
              color="blue"
              disabled={!defaultOperationalHours}
            />

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900">Auto-Rolling Window</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Always shows next 21 days from today. Past dates become historical and read-only.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Editable: Next 21 days</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-700">Read-only: Past dates</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900">Real Calendar Dates</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Based on actual calendar dates, not week numbers. All schedules include specific YYYY-MM-DD dates.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">Today: {new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-700">Window: Next 21 days</span>
                </div>
              </div>
            </div>
          </div>

          {!defaultOperationalHours && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-amber-100 text-amber-700 rounded-lg">
                <Icons.Warning className="w-4 h-4" />
                <span className="ml-2">Save your default operational hours first to enable schedule creation</span>
              </div>
            </div>
          )}
        </ModernCard>
      </main>
    </div>
  );
}