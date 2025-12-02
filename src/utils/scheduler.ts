import * as cron from "node-cron";
import { Client, TextChannel } from "discord.js";
import {
  getAllUserData,
  hasCheckedInToday,
  hasNightCheckInToday,
  updateUserPing,
  updateUserNightPing,
  setReminderSent,
  setNightReminderSent,
} from "./userDataManager";
import { createCheckInButton, createNightCheckInButton } from "./checkInForm";

// Schedule tasks for daily pings
export function initScheduler(client: Client) {
  console.log("Initializing scheduler...");

  // Morning check-in ping (default: 9 AM every day)
  const morningTime = process.env.MORNING_PING_TIME || "0 9 * * *";
  cron.schedule(morningTime, async () => {
    console.log("Running morning check-in pings...");
    await sendDailyPings(client);
  });

  // Reminder ping (default: 1 PM every day - 4 hours after morning)
  const reminderTime = process.env.REMINDER_PING_TIME || "0 13 * * *";
  cron.schedule(reminderTime, async () => {
    console.log("Running reminder pings...");
    await sendReminderPings(client);
  });

  // Night check-in ping (midnight)
  const nightTime = process.env.NIGHT_PING_TIME || "0 0 * * *";
  cron.schedule(nightTime, async () => {
    console.log("Running night check-in pings...");
    await sendNightPings(client);
  });

  // Night reminder ping (2 AM - 2 hours after midnight)
  const nightReminderTime = process.env.NIGHT_REMINDER_TIME || "0 2 * * *";
  cron.schedule(nightReminderTime, async () => {
    console.log("Running night reminder pings...");
    await sendNightReminderPings(client);
  });

  // Reset reminder flags at 4 AM (after all check-ins are done)
  cron.schedule("0 4 * * *", async () => {
    console.log("Resetting daily flags...");
    await resetDailyFlags();
  });

  console.log("Scheduler initialized with:");
  console.log(`  Morning ping: ${morningTime}`);
  console.log(`  Reminder ping: ${reminderTime}`);
  console.log(`  Night ping: ${nightTime}`);
  console.log(`  Night reminder: ${nightReminderTime}`);
}

// Send morning check-in pings to all users
async function sendDailyPings(client: Client) {
  try {
    const allUsers = await getAllUserData();

    for (const [userId, userData] of allUsers) {
      // Skip if user has no channel configured
      if (!userData.channelId) continue;

      // Skip if user already checked in today
      if (await hasCheckedInToday(userId)) {
        console.log(`User ${userId} already checked in today, skipping ping`);
        continue;
      }

      try {
        const channel = await client.channels.fetch(userData.channelId);

        if (channel && channel.isTextBased()) {
          const button = createCheckInButton();

          await (channel as TextChannel).send({
            content: `Good morning <@${userId}>! 🌅\n\nIt's time for your daily check-in.`,
            components: [button],
          });

          await updateUserPing(userId);
          console.log(`Sent morning ping to user ${userId}`);
        }
      } catch (error) {
        console.error(`Error sending ping to user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in sendDailyPings:", error);
  }
}

// Send reminder pings to users who haven't checked in
async function sendReminderPings(client: Client) {
  try {
    const allUsers = await getAllUserData();

    for (const [userId, userData] of allUsers) {
      // Skip if user has no channel configured
      if (!userData.channelId) continue;

      // Skip if reminder already sent
      if (userData.reminderSent) continue;

      // Skip if user already checked in today
      if (await hasCheckedInToday(userId)) {
        console.log(
          `User ${userId} checked in after morning ping, skipping reminder`
        );
        continue;
      }

      try {
        const channel = await client.channels.fetch(userData.channelId);

        if (channel && channel.isTextBased()) {
          const button = createCheckInButton();

          await (channel as TextChannel).send({
            content: `Hey <@${userId}>, this is a friendly reminder to complete your daily check-in! 📝\n\nTaking a few moments for reflection can help set a positive tone for your day.`,
            components: [button],
          });

          await setReminderSent(userId, true);
          console.log(`Sent reminder ping to user ${userId}`);
        }
      } catch (error) {
        console.error(`Error sending reminder to user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in sendReminderPings:", error);
  }
}

// Send night check-in pings to all users
async function sendNightPings(client: Client) {
  try {
    const allUsers = await getAllUserData();

    for (const [userId, userData] of allUsers) {
      // Skip if user has no channel configured
      if (!userData.channelId) continue;

      // Skip if user already did night check-in today
      if (await hasNightCheckInToday(userId)) {
        console.log(`User ${userId} already did night check-in, skipping ping`);
        continue;
      }

      try {
        const channel = await client.channels.fetch(userData.channelId);

        if (channel && channel.isTextBased()) {
          const button = createNightCheckInButton();

          await (channel as TextChannel).send({
            content: `Good evening <@${userId}>! 🌙\n\nIt's time for your nightly reflection ✨`,
            components: [button],
          });

          await updateUserNightPing(userId);
          console.log(`Sent night ping to user ${userId}`);
        }
      } catch (error) {
        console.error(`Error sending night ping to user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in sendNightPings:", error);
  }
}

// Send night reminder pings to users who haven't done night check-in
async function sendNightReminderPings(client: Client) {
  try {
    const allUsers = await getAllUserData();

    for (const [userId, userData] of allUsers) {
      // Skip if user has no channel configured
      if (!userData.channelId) continue;

      // Skip if reminder already sent
      if (userData.nightReminderSent) continue;

      // Skip if user already did night check-in today
      if (await hasNightCheckInToday(userId)) {
        console.log(
          `User ${userId} completed night check-in after initial ping, skipping reminder`
        );
        continue;
      }

      try {
        const channel = await client.channels.fetch(userData.channelId);

        if (channel && channel.isTextBased()) {
          const button = createNightCheckInButton();

          await (channel as TextChannel).send({
            content: `Hey <@${userId}>, this is a reminder to complete your nightly reflection! 🩷`,
            components: [button],
          });

          await setNightReminderSent(userId, true);
          console.log(`Sent night reminder ping to user ${userId}`);
        }
      } catch (error) {
        console.error(`Error sending night reminder to user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in sendNightReminderPings:", error);
  }
}

// Reset daily flags
async function resetDailyFlags() {
  try {
    const allUsers = await getAllUserData();

    for (const [userId] of allUsers) {
      await setReminderSent(userId, false);
      await setNightReminderSent(userId, false);
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
    const userData = await getAllUserData();
    const user = userData.get(userId);

    if (user && user.channelId) {
      const channel = await client.channels.fetch(user.channelId);

      if (channel && channel.isTextBased()) {
        const button = createCheckInButton();

        await (channel as TextChannel).send({
          content: `Good morning <@${userId}>! 🌅\n\nIt's time for your daily check-in.\n\n*(Manual trigger for testing)*`,
          components: [button],
        });

        await updateUserPing(userId);
      }
    }
  } else {
    // Ping all users
    await sendDailyPings(client);
  }
}
