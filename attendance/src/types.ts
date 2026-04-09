export type AttendanceStatus = 'absent' | 'half' | 'full' | 'holiday';

export interface AttendanceRecord {
  date: string; // ISO date string YYYY-MM-DD
  status: AttendanceStatus;
}

export interface AttendanceState {
  records: Record<string, AttendanceStatus>;
}
