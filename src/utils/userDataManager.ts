import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { UserData } from '../types/userData';
import { getDataDir, ensureDataDirectories } from '../config/dataPath';
import { toZonedTime } from 'date-fns-tz';

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
export function getUserData(userId: string): UserData | null {
  const userData = loadUserData();
  return userData.get(userId) || null;
}

// Update user data
export function updateUserData(userId: string, data: UserData) {
  const userData = loadUserData();
  userData.set(userId, data);
  saveUserData(userData);
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
export function hasCheckedInToday(userId: string): boolean {
  const user = getUserData(userId);

  if (!user || !user.lastCheckIn) {
    return false;
  }

  // Get user's timezone and morning time
  const timezone = user.timezone || 'UTC';
  const morningTime = user.morningCheckInTime || '09:00';
  const [hour, minute] = morningTime.split(':').map(Number);

  const now = new Date();
  const lastCheckIn = new Date(user.lastCheckIn);

  // Convert times to user's timezone for comparison
  const nowInUserTz = toZonedTime(now, timezone);
  const lastCheckInInUserTz = toZonedTime(lastCheckIn, timezone);

  // Calculate today's scheduled morning check-in time in user's timezone
  const scheduledToday = new Date(nowInUserTz);
  scheduledToday.setHours(hour, minute, 0, 0);

  // If we haven't reached today's scheduled time yet, check against yesterday's
  const lastScheduledTime = nowInUserTz < scheduledToday
    ? new Date(scheduledToday.getTime() - 24 * 60 * 60 * 1000)
    : scheduledToday;

  // User has checked in if their last check-in is after the last scheduled time
  return lastCheckInInUserTz >= lastScheduledTime;
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
export function hasNightCheckInToday(userId: string): boolean {
  const user = getUserData(userId);

  if (!user || !user.lastNightCheckIn) {
    return false;
  }

  // Get user's timezone and night time
  const timezone = user.timezone || 'UTC';
  const nightTime = user.nightCheckInTime || '21:00';
  const [hour, minute] = nightTime.split(':').map(Number);

  const now = new Date();
  const lastNightCheckIn = new Date(user.lastNightCheckIn);

  // Convert times to user's timezone for comparison
  const nowInUserTz = toZonedTime(now, timezone);
  const lastNightCheckInInUserTz = toZonedTime(lastNightCheckIn, timezone);

  // Calculate today's scheduled night check-in time in user's timezone
  const scheduledToday = new Date(nowInUserTz);
  scheduledToday.setHours(hour, minute, 0, 0);

  // If we haven't reached today's scheduled time yet, check against yesterday's
  const lastScheduledTime = nowInUserTz < scheduledToday
    ? new Date(scheduledToday.getTime() - 24 * 60 * 60 * 1000)
    : scheduledToday;

  // User has checked in if their last check-in is after the last scheduled time
  return lastNightCheckInInUserTz >= lastScheduledTime;
}