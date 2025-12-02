import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { UserData } from '../types/userData';

const DATA_DIR = join(process.cwd(), 'data');
const USER_DATA_FILE = join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

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

  const userEntry: UserData = {
    userId,
    channelId,
    saveToCSV,
    lastCheckIn: userData.get(userId)?.lastCheckIn,
    lastPing: userData.get(userId)?.lastPing,
    reminderSent: false,
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

// Check if user has checked in today
export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const user = await getUserData(userId);

  if (!user || !user.lastCheckIn) {
    return false;
  }

  const lastCheckIn = new Date(user.lastCheckIn);
  const today = new Date();

  return lastCheckIn.toDateString() === today.toDateString();
}