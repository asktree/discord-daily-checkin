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