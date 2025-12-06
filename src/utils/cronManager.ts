import * as cron from 'node-cron';
import { Client } from 'discord.js';
import { UserData } from '../types/userData';

// Map to store user-specific cron jobs
// Each user can have up to 4 jobs: morning ping, morning reminder, night ping, night reminder
type UserCronJobs = {
  morningPing?: cron.ScheduledTask;
  morningReminder?: cron.ScheduledTask;
  nightPing?: cron.ScheduledTask;
  nightReminder?: cron.ScheduledTask;
};

const userCronJobs = new Map<string, UserCronJobs>();

/**
 * Create cron expression for user's time in their timezone
 * node-cron supports timezone option, so we can use user's local time directly
 */
function createCronExpression(hour: number, minute: number): string {
  // Create cron expression (minute hour * * *)
  return `${minute} ${hour} * * *`;
}

/**
 * Schedule all cron jobs for a specific user
 */
export function scheduleUserCrons(userId: string, userData: UserData, client: Client) {
  // Clear existing cron jobs for this user
  clearUserCrons(userId);

  if (!userData.channelId) {
    console.log(`User ${userId} has no channel configured, skipping cron setup`);
    return;
  }

  const timezone = userData.timezone || 'UTC';
  const morningTime = userData.morningCheckInTime || '09:00';
  const nightTime = userData.nightCheckInTime || '21:00';
  const reminderDelay = userData.reminderDelay || 4;

  // Parse times
  const [morningHour, morningMinute] = morningTime.split(':').map(Number);
  const [nightHour, nightMinute] = nightTime.split(':').map(Number);

  // Calculate reminder times
  const morningReminderHour = (morningHour + reminderDelay) % 24;
  const nightReminderHour = (nightHour + reminderDelay) % 24;

  const jobs: UserCronJobs = {};

  // Schedule morning ping
  const morningCron = createCronExpression(morningHour, morningMinute);
  jobs.morningPing = cron.schedule(morningCron, async () => {
    const { sendUserMorningPing } = await import('./userPings');
    await sendUserMorningPing(client, userId);
  }, {
    timezone: timezone
  });

  // Schedule morning reminder
  const morningReminderCron = createCronExpression(morningReminderHour, morningMinute);
  jobs.morningReminder = cron.schedule(morningReminderCron, async () => {
    const { sendUserMorningReminder } = await import('./userPings');
    await sendUserMorningReminder(client, userId);
  }, {
    timezone: timezone
  });

  // Schedule night ping
  const nightCron = createCronExpression(nightHour, nightMinute);
  jobs.nightPing = cron.schedule(nightCron, async () => {
    const { sendUserNightPing } = await import('./userPings');
    await sendUserNightPing(client, userId);
  }, {
    timezone: timezone
  });

  // Schedule night reminder
  const nightReminderCron = createCronExpression(nightReminderHour, nightMinute);
  jobs.nightReminder = cron.schedule(nightReminderCron, async () => {
    const { sendUserNightReminder } = await import('./userPings');
    await sendUserNightReminder(client, userId);
  }, {
    timezone: timezone
  });

  userCronJobs.set(userId, jobs);

  console.log(`Scheduled cron jobs for user ${userId}:`);
  console.log(`  Morning: ${morningTime} ${timezone} -> cron: ${morningCron}`);
  console.log(`  Morning Reminder: +${reminderDelay}h -> cron: ${morningReminderCron}`);
  console.log(`  Night: ${nightTime} ${timezone} -> cron: ${nightCron}`);
  console.log(`  Night Reminder: +${reminderDelay}h -> cron: ${nightReminderCron}`);
}

/**
 * Clear all cron jobs for a specific user
 */
export function clearUserCrons(userId: string) {
  const jobs = userCronJobs.get(userId);
  if (jobs) {
    jobs.morningPing?.stop();
    jobs.morningReminder?.stop();
    jobs.nightPing?.stop();
    jobs.nightReminder?.stop();
    userCronJobs.delete(userId);
    console.log(`Cleared cron jobs for user ${userId}`);
  }
}

/**
 * Initialize cron jobs for all users
 */
export async function initializeAllUserCrons(client: Client) {
  const { getAllUserData } = await import('./userDataManager');
  const allUsers = await getAllUserData();

  console.log(`Initializing per-user cron schedules for ${allUsers.size} users...`);

  for (const [userId, userData] of allUsers) {
    scheduleUserCrons(userId, userData, client);
  }

  console.log(`Per-user cron schedules initialized`);
}

/**
 * Clear all user cron jobs (used on shutdown)
 */
export function clearAllUserCrons() {
  for (const userId of userCronJobs.keys()) {
    clearUserCrons(userId);
  }
  console.log('All user cron jobs cleared');
}