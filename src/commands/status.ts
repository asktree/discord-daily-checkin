import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../types/command';
import { getUserData } from '../utils/userDataManager';

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

        if (userData.lastCheckIn) {
          const lastCheckIn = new Date(userData.lastCheckIn);
          const today = new Date();
          const isToday = lastCheckIn.toDateString() === today.toDateString();

          embed.addFields({
            name: 'Last Check-in',
            value: isToday ? '✅ Completed today' : `${lastCheckIn.toLocaleDateString()}`,
            inline: false,
          });
        } else {
          embed.addFields({
            name: 'Last Check-in',
            value: 'No check-ins yet',
            inline: false,
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