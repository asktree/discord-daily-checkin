import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../types/command';
import { getUserData } from '../utils/userDataManager';
import { showCheckInModalFromCommand } from '../utils/checkInForm';

const checkinCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('checkin')
    .setDescription('Start your daily check-in'),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Check if user has a channel set up
      const userData = await getUserData(interaction.user.id);

      if (!userData || !userData.channelId) {
        await interaction.reply({
          content: '❌ You don\'t have a check-in channel set up yet. Ask an admin to use `/setup` to configure one for you.',
          ephemeral: true,
        });
        return;
      }

      // Show check-in modal directly
      await showCheckInModalFromCommand(interaction);

    } catch (error) {
      console.error('Error in checkin command:', error);
      await interaction.reply({
        content: 'There was an error starting your check-in. Please try again.',
        ephemeral: true,
      });
    }
  },
};

export default checkinCommand;