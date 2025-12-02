export interface UserData {
  userId: string;
  channelId: string;
  saveToCSV: boolean;
  lastCheckIn?: Date;
  lastPing?: Date;
  reminderSent?: boolean;
}

export interface CheckInData {
  userId: string;
  timestamp: Date;
  gratefulFor: string[];
  makeGreat: string[];
  freeResponse?: string;
}