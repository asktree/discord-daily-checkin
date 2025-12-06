import * as cron from "node-cron";
import { Client, TextChannel } from "discord.js";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import {
  getAllUserData,
  hasCheckedInToday,
  hasNightCheckInToday,
  updateUserPing,
  updateUserNightPing,
  setReminderSent,
  setNightReminderSent,
  getUserData,
} from "./userDataManager";
import { createCheckInButton, createNightCheckInButton } from "./checkInForm";

// Schedule tasks for daily pings with timezone support
export function initScheduler(client: Client) {
  console.log("Initializing timezone-aware scheduler...");

  // Run every 30 minutes to check for users who need pings
  cron.schedule("*/30 * * * *", async () => {
    console.log("Running timezone check for user pings...");
    await checkUserPings(client);
  });

  // Reset daily flags at 4 AM UTC (adjust as needed)
  cron.schedule("0 4 * * *", async () => {
    console.log("Resetting daily flags...");
    await resetDailyFlags();
  });

  console.log("Scheduler initialized with 30-minute checks for per-user timezones");
}

// Check all users for pings based on their timezone
async function checkUserPings(client: Client) {
  try {
    const allUsers = await getAllUserData();
    const now = new Date();

    for (const [userId, userData] of allUsers) {
      // Skip if user has no channel configured
      if (!userData.channelId) continue;

      // Get user's timezone (default to UTC if not set)
      const timezone = userData.timezone || "UTC";
      const morningTime = userData.morningCheckInTime || "09:00";
      const nightTime = userData.nightCheckInTime || "21:00";
      const reminderDelay = userData.reminderDelay || 4;

      // Get current time in user's timezone
      const userNow = toZonedTime(now, timezone);
      const currentHour = userNow.getHours();
      const currentMinute = userNow.getMinutes();

      // Parse user's check-in times
      const [morningHour, morningMinute] = morningTime.split(':').map(Number);
      const [nightHour, nightMinute] = nightTime.split(':').map(Number);

      // Check for morning ping
      if (shouldSendMorningPing(currentHour, currentMinute, morningHour, morningMinute, userData, userId)) {
        await sendMorningPing(client, userId, userData);
      }

      // Check for morning reminder
      if (shouldSendMorningReminder(currentHour, currentMinute, morningHour, morningMinute, reminderDelay, userData, userId)) {
        await sendMorningReminder(client, userId, userData);
      }

      // Check for night ping
      if (shouldSendNightPing(currentHour, currentMinute, nightHour, nightMinute, userData, userId)) {
        await sendNightPing(client, userId, userData);
      }

      // Check for night reminder
      if (shouldSendNightReminder(currentHour, currentMinute, nightHour, nightMinute, reminderDelay, userData, userId)) {
        await sendNightReminder(client, userId, userData);
      }
    }
  } catch (error) {
    console.error("Error in checkUserPings:", error);
  }
}

// Helper function to check if we're within 30 minutes of a target time
function isWithinTimeWindow(currentHour: number, currentMinute: number, targetHour: number, targetMinute: number): boolean {
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const targetTotalMinutes = targetHour * 60 + targetMinute;

  // Check if we're within 0-29 minutes after the target time
  const diff = currentTotalMinutes - targetTotalMinutes;
  return diff >= 0 && diff < 30;
}

function shouldSendMorningPing(currentHour: number, currentMinute: number, morningHour: number, morningMinute: number, userData: any, userId: string): boolean {
  // Check if it's time for morning ping
  if (!isWithinTimeWindow(currentHour, currentMinute, morningHour, morningMinute)) {
    return false;
  }

  // Check if already pinged today
  if (userData.lastPing) {
    const lastPingDate = new Date(userData.lastPing);
    const now = new Date();
    const timezone = userData.timezone || "UTC";

    // Convert both times to user's timezone for comparison
    const lastPingUserTz = formatInTimeZone(lastPingDate, timezone, 'yyyy-MM-dd');
    const nowUserTz = formatInTimeZone(now, timezone, 'yyyy-MM-dd');

    if (lastPingUserTz === nowUserTz) {
      return false; // Already pinged today
    }
  }

  // Check if already checked in today
  if (hasCheckedInToday(userId)) {
    return false;
  }

  return true;
}

function shouldSendMorningReminder(currentHour: number, currentMinute: number, morningHour: number, morningMinute: number, reminderDelay: number, userData: any, userId: string): boolean {
  // Calculate reminder time
  const reminderHour = (morningHour + reminderDelay) % 24;

  // Check if it's time for reminder
  if (!isWithinTimeWindow(currentHour, currentMinute, reminderHour, morningMinute)) {
    return false;
  }

  // Skip if reminder already sent
  if (userData.reminderSent) {
    return false;
  }

  // Skip if user already checked in
  if (hasCheckedInToday(userId)) {
    return false;
  }

  // Only send reminder if morning ping was sent
  if (!userData.lastPing) {
    return false;
  }

  return true;
}

function shouldSendNightPing(currentHour: number, currentMinute: number, nightHour: number, nightMinute: number, userData: any, userId: string): boolean {
  // Check if it's time for night ping
  if (!isWithinTimeWindow(currentHour, currentMinute, nightHour, nightMinute)) {
    return false;
  }

  // Check if already pinged tonight
  if (userData.lastNightPing) {
    const lastPingDate = new Date(userData.lastNightPing);
    const now = new Date();
    const timezone = userData.timezone || "UTC";

    // Convert both times to user's timezone for comparison
    const lastPingUserTz = formatInTimeZone(lastPingDate, timezone, 'yyyy-MM-dd');
    const nowUserTz = formatInTimeZone(now, timezone, 'yyyy-MM-dd');

    if (lastPingUserTz === nowUserTz) {
      return false; // Already pinged today
    }
  }

  // Check if already checked in tonight
  if (hasNightCheckInToday(userId)) {
    return false;
  }

  return true;
}

function shouldSendNightReminder(currentHour: number, currentMinute: number, nightHour: number, nightMinute: number, reminderDelay: number, userData: any, userId: string): boolean {
  // Calculate reminder time (handle day wrap-around)
  const reminderHour = (nightHour + reminderDelay) % 24;

  // Check if it's time for reminder
  if (!isWithinTimeWindow(currentHour, currentMinute, reminderHour, nightMinute)) {
    return false;
  }

  // Skip if reminder already sent
  if (userData.nightReminderSent) {
    return false;
  }

  // Skip if user already checked in
  if (hasNightCheckInToday(userId)) {
    return false;
  }

  // Only send reminder if night ping was sent
  if (!userData.lastNightPing) {
    return false;
  }

  return true;
}

// Send morning check-in ping to a specific user
async function sendMorningPing(client: Client, userId: string, userData: any) {
  try {
    const channel = await client.channels.fetch(userData.channelId);

    if (channel && channel.isTextBased()) {
      const button = createCheckInButton();
      const timezone = userData.timezone || "UTC";
      const timeStr = formatInTimeZone(new Date(), timezone, 'h:mm a zzz');

      await (channel as TextChannel).send({
        content: `Good morning <@${userId}>! 🌅\n\nIt's time for your daily check-in. (${timeStr})`,
        components: [button],
      });

      await updateUserPing(userId);
      console.log(`Sent morning ping to user ${userId} in timezone ${timezone}`);
    }
  } catch (error) {
    console.error(`Error sending morning ping to user ${userId}:`, error);
  }
}

// Send morning reminder to a specific user
async function sendMorningReminder(client: Client, userId: string, userData: any) {
  try {
    const channel = await client.channels.fetch(userData.channelId);

    if (channel && channel.isTextBased()) {
      const button = createCheckInButton();

      await (channel as TextChannel).send({
        content: `Hey <@${userId}>, this is a friendly reminder to complete your daily check-in! 📝\n\nTaking a few moments for reflection can help set a positive tone for your day.`,
        components: [button],
      });

      await setReminderSent(userId, true);
      console.log(`Sent morning reminder to user ${userId}`);
    }
  } catch (error) {
    console.error(`Error sending morning reminder to user ${userId}:`, error);
  }
}

// Send night check-in ping to a specific user
async function sendNightPing(client: Client, userId: string, userData: any) {
  try {
    const channel = await client.channels.fetch(userData.channelId);

    if (channel && channel.isTextBased()) {
      const button = createNightCheckInButton();
      const timezone = userData.timezone || "UTC";
      const timeStr = formatInTimeZone(new Date(), timezone, 'h:mm a zzz');

      await (channel as TextChannel).send({
        content: `Good evening <@${userId}>! 🌙\n\nIt's time for your nightly reflection ✨ (${timeStr})`,
        components: [button],
      });

      await updateUserNightPing(userId);
      console.log(`Sent night ping to user ${userId} in timezone ${timezone}`);
    }
  } catch (error) {
    console.error(`Error sending night ping to user ${userId}:`, error);
  }
}

// Send night reminder to a specific user
async function sendNightReminder(client: Client, userId: string, userData: any) {
  try {
    const channel = await client.channels.fetch(userData.channelId);

    if (channel && channel.isTextBased()) {
      const button = createNightCheckInButton();

      await (channel as TextChannel).send({
        content: `Hey <@${userId}>, this is a reminder to complete your nightly reflection! 🩷`,
        components: [button],
      });

      await setNightReminderSent(userId, true);
      console.log(`Sent night reminder to user ${userId}`);
    }
  } catch (error) {
    console.error(`Error sending night reminder to user ${userId}:`, error);
  }
}

// Reset daily flags
async function resetDailyFlags() {
  try {
    const allUsers = await getAllUserData();

    for (const [userId, userData] of allUsers) {
      // Only reset flags if they're in a new day (based on their timezone)
      const timezone = userData.timezone || "UTC";
      const now = new Date();

      // Check if it's a new day for this user
      if (userData.lastPing) {
        const lastPingDate = new Date(userData.lastPing);
        const lastPingUserTz = formatInTimeZone(lastPingDate, timezone, 'yyyy-MM-dd');
        const nowUserTz = formatInTimeZone(now, timezone, 'yyyy-MM-dd');

        if (lastPingUserTz !== nowUserTz) {
          await setReminderSent(userId, false);
        }
      }

      if (userData.lastNightPing) {
        const lastNightPingDate = new Date(userData.lastNightPing);
        const lastNightPingUserTz = formatInTimeZone(lastNightPingDate, timezone, 'yyyy-MM-dd');
        const nowUserTz = formatInTimeZone(now, timezone, 'yyyy-MM-dd');

        if (lastNightPingUserTz !== nowUserTz) {
          await setNightReminderSent(userId, false);
        }
      }
    }

    console.log("Daily flags reset successfully");
  } catch (error) {
    console.error("Error resetting daily flags:", error);
  }
}

// Manual trigger for testing (can be called from a command)
export async function triggerMorningPing(client: Client, userId?: string) {
  if (userId) {
    // Ping specific user
    const userData = getUserData(userId);

    if (userData && userData.channelId) {
      await sendMorningPing(client, userId, userData);
    }
  } else {
    // Ping all eligible users
    await checkUserPings(client);
  }
}