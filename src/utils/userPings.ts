import { Client, TextChannel } from 'discord.js';
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
 * Send morning check-in ping to a specific user
 */
export async function sendUserMorningPing(client: Client, userId: string) {
  try {
    const userData = getUserData(userId);
    if (!userData || !userData.channelId) return;

    // Check if already checked in today
    if (hasCheckedInToday(userId)) {
      console.log(`User ${userId} already checked in today, skipping morning ping`);
      return;
    }

    const channel = await client.channels.fetch(userData.channelId);
    if (channel && channel.isTextBased()) {
      const button = createCheckInButton();
      const timezone = userData.timezone || 'UTC';
      const timeStr = formatInTimeZone(new Date(), timezone, 'h:mm a zzz');

      await (channel as TextChannel).send({
        content: `Good morning <@${userId}>! 🌅\n\nIt's time for your daily check-in. (${timeStr})`,
        components: [button],
      });

      await updateUserPing(userId);
      await setReminderSent(userId, false); // Reset reminder flag for new ping
      console.log(`Sent morning ping to user ${userId}`);
    }
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
    if (!userData || !userData.channelId) return;

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

/**
 * Send night check-in ping to a specific user
 */
export async function sendUserNightPing(client: Client, userId: string) {
  try {
    const userData = getUserData(userId);
    if (!userData || !userData.channelId) return;

    // Check if already checked in tonight
    if (hasNightCheckInToday(userId)) {
      console.log(`User ${userId} already did night check-in, skipping night ping`);
      return;
    }

    const channel = await client.channels.fetch(userData.channelId);
    if (channel && channel.isTextBased()) {
      const button = createNightCheckInButton();
      const timezone = userData.timezone || 'UTC';
      const timeStr = formatInTimeZone(new Date(), timezone, 'h:mm a zzz');

      await (channel as TextChannel).send({
        content: `Good evening <@${userId}>! 🌙\n\nIt's time for your nightly reflection ✨ (${timeStr})`,
        components: [button],
      });

      await updateUserNightPing(userId);
      await setNightReminderSent(userId, false); // Reset reminder flag for new ping
      console.log(`Sent night ping to user ${userId}`);
    }
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
    if (!userData || !userData.channelId) return;

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