import { Client, TextChannel, DMChannel } from 'discord.js';

type SendableChannel = TextChannel | DMChannel;
import { formatInTimeZone } from 'date-fns-tz';
import {
  getUserData,
  hasCheckedInToday,
  hasNightCheckInToday,
  updateUserPing,
  updateUserNightPing,
  setReminderSent,
  setNightReminderSent,
} from './userDataManager';
import { createCheckInButton, createNightCheckInButton } from './checkInForm';

/**
 * Resolve the channel to send messages to for a user.
 * If useDM is true, opens a DM channel with the user.
 * Otherwise, fetches the configured guild channel.
 */
async function resolveChannel(client: Client, userId: string): Promise<SendableChannel | null> {
  const userData = getUserData(userId);
  if (!userData) return null;

  if (userData.useDM) {
    try {
      const user = await client.users.fetch(userId);
      const dmChannel = await user.createDM();
      return dmChannel;
    } catch (error) {
      console.error(`Failed to open DM channel for user ${userId}:`, error);
      return null;
    }
  }

  if (!userData.channelId) return null;

  try {
    const channel = await client.channels.fetch(userData.channelId);
    if (channel && channel.isTextBased() && 'send' in channel) {
      return channel as SendableChannel;
    }
  } catch (error) {
    console.error(`Failed to fetch channel ${userData.channelId}:`, error);
  }
  return null;
}

/**
 * Send morning check-in ping to a specific user
 */
export async function sendUserMorningPing(client: Client, userId: string) {
  try {
    const userData = getUserData(userId);
    if (!userData) return;
    if (!userData.useDM && !userData.channelId) return;

    // Check if already checked in today
    if (hasCheckedInToday(userId)) {
      console.log(`User ${userId} already checked in today, skipping morning ping`);
      return;
    }

    const channel = await resolveChannel(client, userId);
    if (!channel) return;

    const button = createCheckInButton();
    const timezone = userData.timezone || 'UTC';
    const timeStr = formatInTimeZone(new Date(), timezone, 'h:mm a zzz');

    await channel.send({
      content: `Good morning <@${userId}>! 🌅\n\nIt's time for your daily check-in. (${timeStr})`,
      components: [button],
    });

    await updateUserPing(userId);
    await setReminderSent(userId, false); // Reset reminder flag for new ping
    console.log(`Sent morning ping to user ${userId}`);
  } catch (error) {
    console.error(`Error sending morning ping to user ${userId}:`, error);
  }
}

/**
 * Send morning reminder to a specific user
 */
export async function sendUserMorningReminder(client: Client, userId: string) {
  try {
    const userData = getUserData(userId);
    if (!userData) return;
    if (!userData.useDM && !userData.channelId) return;

    // Skip if reminder already sent
    if (userData.reminderSent) {
      console.log(`Morning reminder already sent to user ${userId}, skipping`);
      return;
    }

    // Skip if user already checked in
    if (hasCheckedInToday(userId)) {
      console.log(`User ${userId} already checked in, skipping morning reminder`);
      return;
    }

    // Only send reminder if morning ping was sent today
    if (!userData.lastPing) {
      console.log(`No morning ping sent to user ${userId}, skipping reminder`);
      return;
    }

    const channel = await resolveChannel(client, userId);
    if (!channel) return;

    const button = createCheckInButton();

    await channel.send({
      content: `Hey <@${userId}>, this is a friendly reminder to complete your daily check-in! 📝\n\nTaking a few moments for reflection can help set a positive tone for your day.`,
      components: [button],
    });

    await setReminderSent(userId, true);
    console.log(`Sent morning reminder to user ${userId}`);
  } catch (error) {
    console.error(`Error sending morning reminder to user ${userId}:`, error);
  }
}

/**
 * Send night check-in ping to a specific user
 */
export async function sendUserNightPing(client: Client, userId: string) {
  try {
    const userData = getUserData(userId);
    if (!userData) return;
    if (!userData.useDM && !userData.channelId) return;

    // Check if already checked in tonight
    if (hasNightCheckInToday(userId)) {
      console.log(`User ${userId} already did night check-in, skipping night ping`);
      return;
    }

    const channel = await resolveChannel(client, userId);
    if (!channel) return;

    const button = createNightCheckInButton();
    const timezone = userData.timezone || 'UTC';
    const timeStr = formatInTimeZone(new Date(), timezone, 'h:mm a zzz');

    await channel.send({
      content: `Good evening <@${userId}>! 🌙\n\nIt's time for your nightly reflection ✨ (${timeStr})`,
      components: [button],
    });

    await updateUserNightPing(userId);
    await setNightReminderSent(userId, false); // Reset reminder flag for new ping
    console.log(`Sent night ping to user ${userId}`);
  } catch (error) {
    console.error(`Error sending night ping to user ${userId}:`, error);
  }
}

/**
 * Send night reminder to a specific user
 */
export async function sendUserNightReminder(client: Client, userId: string) {
  try {
    const userData = getUserData(userId);
    if (!userData) return;
    if (!userData.useDM && !userData.channelId) return;

    // Skip if reminder already sent
    if (userData.nightReminderSent) {
      console.log(`Night reminder already sent to user ${userId}, skipping`);
      return;
    }

    // Skip if user already checked in
    if (hasNightCheckInToday(userId)) {
      console.log(`User ${userId} already did night check-in, skipping night reminder`);
      return;
    }

    // Only send reminder if night ping was sent today
    if (!userData.lastNightPing) {
      console.log(`No night ping sent to user ${userId}, skipping reminder`);
      return;
    }

    const channel = await resolveChannel(client, userId);
    if (!channel) return;

    const button = createNightCheckInButton();

    await channel.send({
      content: `Hey <@${userId}>, this is a reminder to complete your nightly reflection! 🩷`,
      components: [button],
    });

    await setNightReminderSent(userId, true);
    console.log(`Sent night reminder to user ${userId}`);
  } catch (error) {
    console.error(`Error sending night reminder to user ${userId}:`, error);
  }
}
