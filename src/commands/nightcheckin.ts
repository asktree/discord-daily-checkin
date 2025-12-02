import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../types/command';
import { getUserData } from '../utils/userDataManager';
import { showNightCheckInModalFromCommand } from '../utils/checkInForm';

const nightcheckinCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('nightcheckin')
    .setDescription('Start your nightly reflection'),

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

      // Show night check-in modal directly
      await showNightCheckInModalFromCommand(interaction);

    } catch (error) {
      console.error('Error in nightcheckin command:', error);
      await interaction.reply({
        content: 'There was an error starting your nightly reflection. Please try again.',
        ephemeral: true,
      });
    }
  },
};

export default nightcheckinCommand;