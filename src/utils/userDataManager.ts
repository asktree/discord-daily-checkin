import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { UserData } from '../types/userData';
import { getDataDir, ensureDataDirectories } from '../config/dataPath';

// Initialize directories on module load
ensureDataDirectories();

const DATA_DIR = getDataDir();
const USER_DATA_FILE = join(DATA_DIR, 'users.json');

// Load all user data from file
function loadUserData(): Map<string, UserData> {
  if (!existsSync(USER_DATA_FILE)) {
    return new Map();
  }

  try {
    const data = readFileSync(USER_DATA_FILE, 'utf-8');
    const jsonData = JSON.parse(data);
    return new Map(Object.entries(jsonData));
  } catch (error) {
    console.error('Error loading user data:', error);
    return new Map();
  }
}

// Save all user data to file
function saveUserData(userData: Map<string, UserData>) {
  try {
    const jsonData = Object.fromEntries(userData);
    writeFileSync(USER_DATA_FILE, JSON.stringify(jsonData, null, 2));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

// Get data for a specific user
export async function getUserData(userId: string): Promise<UserData | null> {
  const userData = loadUserData();
  return userData.get(userId) || null;
}

// Get all users data
export async function getAllUserData(): Promise<Map<string, UserData>> {
  return loadUserData();
}

// Set user's channel configuration
export async function setUserChannel(userId: string, channelId: string, saveToCSV: boolean = true) {
  const userData = loadUserData();
  const existingUser = userData.get(userId);

  const userEntry: UserData = {
    userId,
    channelId,
    saveToCSV,
    lastCheckIn: existingUser?.lastCheckIn,
    lastPing: existingUser?.lastPing,
    reminderSent: false,
    lastNightCheckIn: existingUser?.lastNightCheckIn,
    lastNightPing: existingUser?.lastNightPing,
    nightReminderSent: false,
  };

  userData.set(userId, userEntry);
  saveUserData(userData);
}

// Update user's last check-in time
export async function updateUserCheckIn(userId: string) {
  const userData = loadUserData();
  const user = userData.get(userId);

  if (user) {
    user.lastCheckIn = new Date();
    user.reminderSent = false; // Reset reminder flag
    userData.set(userId, user);
    saveUserData(userData);
  }
}

// Update user's last ping time
export async function updateUserPing(userId: string) {
  const userData = loadUserData();
  const user = userData.get(userId);

  if (user) {
    user.lastPing = new Date();
    userData.set(userId, user);
    saveUserData(userData);
  }
}

// Set reminder sent flag
export async function setReminderSent(userId: string, sent: boolean) {
  const userData = loadUserData();
  const user = userData.get(userId);

  if (user) {
    user.reminderSent = sent;
    userData.set(userId, user);
    saveUserData(userData);
  }
}

// Check if user has checked in for the current morning cycle
export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const user = await getUserData(userId);

  if (!user || !user.lastCheckIn) {
    return false;
  }

  // Get morning schedule from environment or use default
  const morningCron = process.env.MORNING_PING_TIME || '0 9 * * *';
  const parts = morningCron.split(' ');

  let minute = 0;
  let hour = 9; // default to 9 AM

  if (parts.length >= 2) {
    const parsedMinute = parseInt(parts[0]);
    const parsedHour = parseInt(parts[1]);

    if (!isNaN(parsedMinute) && parsedMinute >= 0 && parsedMinute < 60) {
      minute = parsedMinute;
    }
    if (!isNaN(parsedHour) && parsedHour >= 0 && parsedHour < 24) {
      hour = parsedHour;
    }
  }

  const now = new Date();
  const lastCheckIn = new Date(user.lastCheckIn);

  // Calculate the last scheduled morning check-in time
  const scheduledToday = new Date(now);
  scheduledToday.setHours(hour, minute, 0, 0);

  // If we haven't reached today's scheduled time yet, check against yesterday's
  const lastScheduledTime = now < scheduledToday
    ? new Date(scheduledToday.getTime() - 24 * 60 * 60 * 1000)
    : scheduledToday;

  // User has checked in if their last check-in is after the last scheduled time
  return lastCheckIn >= lastScheduledTime;
}

// Update user's last night check-in time
export async function updateUserNightCheckIn(userId: string) {
  const userData = loadUserData();
  const user = userData.get(userId);

  if (user) {
    user.lastNightCheckIn = new Date();
    user.nightReminderSent = false; // Reset reminder flag
    userData.set(userId, user);
    saveUserData(userData);
  }
}

// Update user's last night ping time
export async function updateUserNightPing(userId: string) {
  const userData = loadUserData();
  const user = userData.get(userId);

  if (user) {
    user.lastNightPing = new Date();
    userData.set(userId, user);
    saveUserData(userData);
  }
}

// Set night reminder sent flag
export async function setNightReminderSent(userId: string, sent: boolean) {
  const userData = loadUserData();
  const user = userData.get(userId);

  if (user) {
    user.nightReminderSent = sent;
    userData.set(userId, user);
    saveUserData(userData);
  }
}

// Check if user has done night check-in for the current night cycle
export async function hasNightCheckInToday(userId: string): Promise<boolean> {
  const user = await getUserData(userId);

  if (!user || !user.lastNightCheckIn) {
    return false;
  }

  // Get night schedule from environment or use default
  const nightCron = process.env.NIGHT_PING_TIME || '0 0 * * *';
  const parts = nightCron.split(' ');

  let minute = 0;
  let hour = 0; // default to midnight

  if (parts.length >= 2) {
    const parsedMinute = parseInt(parts[0]);
    const parsedHour = parseInt(parts[1]);

    if (!isNaN(parsedMinute) && parsedMinute >= 0 && parsedMinute < 60) {
      minute = parsedMinute;
    }
    if (!isNaN(parsedHour) && parsedHour >= 0 && parsedHour < 24) {
      hour = parsedHour;
    }
  }

  const now = new Date();
  const lastNightCheckIn = new Date(user.lastNightCheckIn);

  // Calculate the last scheduled night check-in time
  const scheduledToday = new Date(now);
  scheduledToday.setHours(hour, minute, 0, 0);

  // If we haven't reached today's scheduled time yet, check against yesterday's
  const lastScheduledTime = now < scheduledToday
    ? new Date(scheduledToday.getTime() - 24 * 60 * 60 * 1000)
    : scheduledToday;

  // User has checked in if their last check-in is after the last scheduled time
  return lastNightCheckIn >= lastScheduledTime;
}