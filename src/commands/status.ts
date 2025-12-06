import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../types/command';
import { getUserData, hasCheckedInToday, hasNightCheckInToday } from '../utils/userDataManager';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

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

      const userData = getUserData(targetUser.id);

      const embed = new EmbedBuilder()
        .setColor(userData ? 0x00FF00 : 0xFF0000)
        .setTitle('Check-in Status')
        .setDescription(`Status for <@${targetUser.id}>`)
        .setTimestamp();

      if (userData && userData.channelId) {
        // Add basic configuration info
        embed.addFields(
          { name: 'Setup Status', value: '✅ Configured', inline: true },
          { name: 'Check-in Channel', value: `<#${userData.channelId}>`, inline: true },
          { name: 'Save to CSV', value: userData.saveToCSV ? 'Yes' : 'No', inline: true }
        );

        // Add timezone configuration
        const timezone = userData.timezone || 'UTC';
        const morningTime = userData.morningCheckInTime || '09:00';
        const nightTime = userData.nightCheckInTime || '21:00';
        const reminderDelay = userData.reminderDelay || 4;
        const currentTime = formatInTimeZone(new Date(), timezone, 'h:mm a zzz');

        embed.addFields({
          name: '🌍 Timezone Settings',
          value: `Timezone: **${timezone}**\nCurrent time: ${currentTime}\nMorning: ${morningTime} | Night: ${nightTime}\nReminder delay: ${reminderDelay} hours`,
          inline: false
        });

        // Morning check-in status
        const morningCompleted = hasCheckedInToday(targetUser.id);

        if (userData.lastCheckIn) {
          const lastCheckIn = new Date(userData.lastCheckIn);
          const timeString = formatInTimeZone(lastCheckIn, timezone, 'h:mm a');
          const dateString = formatInTimeZone(lastCheckIn, timezone, 'MMM d, yyyy');

          embed.addFields({
            name: '☀️ Morning Check-in',
            value: morningCompleted
              ? `✅ Completed for current cycle\nLast: ${dateString} at ${timeString}`
              : `❌ Not completed this cycle\nLast: ${dateString} at ${timeString}`,
            inline: true,
          });
        } else {
          embed.addFields({
            name: '☀️ Morning Check-in',
            value: '❌ No morning check-ins yet',
            inline: true,
          });
        }

        // Night check-in status
        const nightCompleted = hasNightCheckInToday(targetUser.id);

        if (userData.lastNightCheckIn) {
          const lastNightCheckIn = new Date(userData.lastNightCheckIn);
          const timeString = formatInTimeZone(lastNightCheckIn, timezone, 'h:mm a');
          const dateString = formatInTimeZone(lastNightCheckIn, timezone, 'MMM d, yyyy');

          embed.addFields({
            name: '🌙 Night Reflection',
            value: nightCompleted
              ? `✅ Completed for current cycle\nLast: ${dateString} at ${timeString}`
              : `❌ Not completed this cycle\nLast: ${dateString} at ${timeString}`,
            inline: true,
          });
        } else {
          embed.addFields({
            name: '🌙 Night Reflection',
            value: '❌ No night reflections yet',
            inline: true,
          });
        }

        // Calculate next check-in times
        const now = new Date();
        const nowInUserTz = toZonedTime(now, timezone);
        const currentHour = nowInUserTz.getHours();
        const currentMinute = nowInUserTz.getMinutes();

        const [morningHour, morningMinute] = morningTime.split(':').map(Number);
        const [nightHour, nightMinute] = nightTime.split(':').map(Number);

        let nextCheckIn = '';
        const currentMinutes = currentHour * 60 + currentMinute;
        const morningMinutes = morningHour * 60 + morningMinute;
        const nightMinutes = nightHour * 60 + nightMinute;

        if (!morningCompleted && currentMinutes < morningMinutes) {
          nextCheckIn = `Morning check-in at ${morningTime}`;
        } else if (!nightCompleted && currentMinutes < nightMinutes) {
          nextCheckIn = `Night reflection at ${nightTime}`;
        } else {
          nextCheckIn = `Morning check-in tomorrow at ${morningTime}`;
        }

        embed.addFields({
          name: '⏰ Next Check-in',
          value: nextCheckIn,
          inline: false
        });

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