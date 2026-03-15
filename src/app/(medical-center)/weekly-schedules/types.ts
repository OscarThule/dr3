// weekly-schedule/types.ts
export interface Session {
  start: string;
  end: string;
  enabled: boolean;
}

export interface LunchBreak {
  id: string;
  start: string;
  end: string;
  reason: string;
  duration: number;
  enabled: boolean;
  recurring: boolean;
  affectedStaff: string[];
}

export interface DayHours {
  morning: Session;
  afternoon: Session;
  night: Session;
  lunches: LunchBreak[];
  nightLunches: LunchBreak[];
}

export interface DefaultHours {
  [key: string]: DayHours;
}

export interface DefaultOperationalHours {
  _id: string;
  medical_center_id: string;
  defaultHours: DefaultHours;
  slotDuration: number;
  bufferTime: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  last_updated_by: string;
}

export type DayOfWeek = 
  | 'monday' 
  | 'tuesday' 
  | 'wednesday' 
  | 'thursday' 
  | 'friday' 
  | 'saturday' 
  | 'sunday';

export type SessionType = 'morning' | 'afternoon' | 'night';

export interface UpdateDefaultHoursPayload {
  day: DayOfWeek;
  session: SessionType;
  field: keyof Session;
  value: string | boolean;
}

export interface UpdateLunchBreakPayload {
  day: DayOfWeek;
  lunchId: string;
  updates: Partial<LunchBreak>;
  isNight: boolean;
}