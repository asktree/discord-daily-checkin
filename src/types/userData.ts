export interface UserData {
  userId: string;
  channelId: string;
  saveToCSV: boolean;
  lastCheckIn?: Date;
  lastPing?: Date;
  reminderSent?: boolean;
  lastNightCheckIn?: Date;
  lastNightPing?: Date;
  nightReminderSent?: boolean;
  // Timezone configuration
  timezone?: string; // IANA timezone (e.g., "America/New_York")
  morningCheckInTime?: string; // 24-hour format (e.g., "09:00")
  nightCheckInTime?: string; // 24-hour format (e.g., "21:00")
  reminderDelay?: number; // Hours after check-in time to send reminder (default 4)
}

export interface CheckInData {
  userId: string;
  timestamp: Date;
  gratefulFor: string[];
  makeGreat: string[];
  freeResponse?: string;
}

export interface NightCheckInData {
  userId: string;
  timestamp: Date;
  highlights: string[];
  learned: string[];
  freeResponse?: string;
}