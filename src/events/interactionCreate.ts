import { Client, Events, Interaction } from 'discord.js';
import { handleCheckInModal } from '../handlers/checkInHandler';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: Client) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: 'There was an error while executing this command!',
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
          });
        }
      }
    }

    // Handle button interactions
    if (interaction.isButton()) {
      if (interaction.customId === 'start_checkin') {
        const { showCheckInModal } = await import('../utils/checkInForm');
        await showCheckInModal(interaction);
      }
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'checkin_modal') {
        await handleCheckInModal(interaction);
      }
    }
  },
};