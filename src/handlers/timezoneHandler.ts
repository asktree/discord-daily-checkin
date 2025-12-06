import { ModalSubmitInteraction } from 'discord.js';
import { getUserData, updateUserData } from '../utils/userDataManager';

export async function handleTimezoneTimesModal(interaction: ModalSubmitInteraction) {
  try {
    const userId = interaction.user.id;
    const userData = getUserData(userId);

    if (!userData) {
      await interaction.reply({
        content: 'Error: User data not found. Please run `/setup` first.',
        ephemeral: true
      });
      return;
    }

    // Get the submitted values
    const morningTime = interaction.fields.getTextInputValue('morning-time');
    const nightTime = interaction.fields.getTextInputValue('night-time');
    const reminderDelay = interaction.fields.getTextInputValue('reminder-delay');

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(morningTime) || !timeRegex.test(nightTime)) {
      await interaction.reply({
        content: 'Invalid time format. Please use 24-hour format (HH:MM), e.g., 09:00 or 21:30',
        ephemeral: true
      });
      return;
    }

    // Validate reminder delay (1-12 hours)
    const reminderDelayNum = parseInt(reminderDelay, 10);
    if (isNaN(reminderDelayNum) || reminderDelayNum < 1 || reminderDelayNum > 12) {
      await interaction.reply({
        content: 'Reminder delay must be between 1 and 12 hours.',
        ephemeral: true
      });
      return;
    }

    // Update user data
    userData.morningCheckInTime = morningTime;
    userData.nightCheckInTime = nightTime;
    userData.reminderDelay = reminderDelayNum;
    updateUserData(userId, userData);

    // Send confirmation
    let message = `✅ Check-in times updated!\n\n`;
    message += `☀️ Morning check-in: **${morningTime}**\n`;
    message += `🌙 Night check-in: **${nightTime}**\n`;
    message += `⏰ Reminder after: **${reminderDelayNum} hours**\n`;

    if (userData.timezone) {
      message += `\nAll times are in your timezone: **${userData.timezone}**`;
    } else {
      message += `\n⚠️ You haven't set a timezone yet. Use \`/timing zone\` to configure it.`;
    }

    await interaction.reply({
      content: message,
      ephemeral: true
    });

  } catch (error) {
    console.error('Error handling timezone times modal:', error);

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'There was an error updating your check-in times. Please try again.',
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}