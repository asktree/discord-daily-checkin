import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../types/command';
import { getUserData } from '../utils/userDataManager';

// Helper function to get the last scheduled check-in time
function getLastScheduledTime(cronPattern: string, now: Date): Date {
  // Parse the cron pattern (expecting format: "minute hour * * *")
  const parts = cronPattern.split(' ');

  // Validate we have at least 2 parts and they're numbers
  let minute = 0;
  let hour = 0;

  if (parts.length >= 2) {
    const parsedMinute = parseInt(parts[0]);
    const parsedHour = parseInt(parts[1]);

    // Validate ranges
    if (!isNaN(parsedMinute) && parsedMinute >= 0 && parsedMinute < 60) {
      minute = parsedMinute;
    }
    if (!isNaN(parsedHour) && parsedHour >= 0 && parsedHour < 24) {
      hour = parsedHour;
    }
  }

  // Create a date for today at the scheduled time
  const scheduledToday = new Date(now);
  scheduledToday.setHours(hour, minute, 0, 0);

  // If the scheduled time hasn't happened yet today, use yesterday's
  if (now < scheduledToday) {
    const scheduledYesterday = new Date(scheduledToday);
    scheduledYesterday.setDate(scheduledYesterday.getDate() - 1);
    return scheduledYesterday;
  }

  return scheduledToday;
}

// Check if check-in was completed since the last scheduled time
function isCompletedSinceLastSchedule(lastCheckIn: Date | undefined, cronPattern: string): boolean {
  if (!lastCheckIn) return false;

  const now = new Date();
  const lastScheduled = getLastScheduledTime(cronPattern, now);

  return new Date(lastCheckIn) >= lastScheduled;
}

const statusCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check your daily check-in status')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check status for (admin only)')
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Check if a specific user was mentioned (for admins)
      const targetUser = interaction.options.getUser('user') || interaction.user;

      // Only allow checking other users if the command user has manage channels permission
      if (targetUser.id !== interaction.user.id) {
        const member = interaction.guild?.members.cache.get(interaction.user.id);
        if (!member?.permissions.has('ManageChannels')) {
          await interaction.reply({
            content: '❌ You can only check your own status.',
            ephemeral: true,
          });
          return;
        }
      }

      const userData = await getUserData(targetUser.id);

      // Get cron schedules from environment or use defaults
      const morningCron = process.env.MORNING_PING_TIME || '0 9 * * *';
      const nightCron = process.env.NIGHT_PING_TIME || '0 0 * * *';

      const embed = new EmbedBuilder()
        .setColor(userData ? 0x00FF00 : 0xFF0000)
        .setTitle('Check-in Status')
        .setDescription(`Status for <@${targetUser.id}>`)
        .setTimestamp();

      if (userData && userData.channelId) {
        embed.addFields(
          { name: 'Setup Status', value: '✅ Configured', inline: true },
          { name: 'Check-in Channel', value: `<#${userData.channelId}>`, inline: true },
          { name: 'Save to CSV', value: userData.saveToCSV ? 'Yes' : 'No', inline: true }
        );

        // Morning check-in status
        const morningCompleted = isCompletedSinceLastSchedule(userData.lastCheckIn, morningCron);

        if (userData.lastCheckIn) {
          const lastCheckIn = new Date(userData.lastCheckIn);

          // Format time as HH:MM AM/PM
          const timeString = lastCheckIn.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          embed.addFields({
            name: 'Morning Check-in',
            value: morningCompleted
              ? `✅ Completed for current cycle at ${timeString}`
              : `❌ Not completed this cycle\nLast: ${lastCheckIn.toLocaleDateString()} at ${timeString}`,
            inline: true,
          });
        } else {
          embed.addFields({
            name: 'Morning Check-in',
            value: '❌ No morning check-ins yet',
            inline: true,
          });
        }

        // Night check-in status
        const nightCompleted = isCompletedSinceLastSchedule(userData.lastNightCheckIn, nightCron);

        if (userData.lastNightCheckIn) {
          const lastNightCheckIn = new Date(userData.lastNightCheckIn);

          // Format time as HH:MM AM/PM
          const timeString = lastNightCheckIn.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          embed.addFields({
            name: 'Night Reflection',
            value: nightCompleted
              ? `✅ Completed for current cycle at ${timeString}`
              : `❌ Not completed this cycle\nLast: ${lastNightCheckIn.toLocaleDateString()} at ${timeString}`,
            inline: true,
          });
        } else {
          embed.addFields({
            name: 'Night Reflection',
            value: '❌ No night reflections yet',
            inline: true,
          });
        }
      } else {
        embed.addFields({
          name: 'Setup Status',
          value: '❌ Not configured\nAsk an admin to use `/setup` to configure your check-in channel.',
          inline: false,
        });
      }

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });

    } catch (error) {
      console.error('Error in status command:', error);
      await interaction.reply({
        content: 'There was an error checking the status. Please try again.',
        ephemeral: true,
      });
    }
  },
};

export default statusCommand;