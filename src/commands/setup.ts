import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';
import { Command } from '../types/command';
import { setUserChannel } from '../utils/userDataManager';

const setupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up daily check-in for a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to set up check-in for')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel for daily check-ins')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addBooleanOption(option =>
      option
        .setName('save_to_csv')
        .setDescription('Whether to save check-ins to CSV (default: true)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const user = interaction.options.getUser('user', true);
      const channel = interaction.options.getChannel('channel', true);
      const saveToCSV = interaction.options.getBoolean('save_to_csv') ?? true;

      // Validate that the channel is a text channel
      if (channel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: 'Please select a text channel for check-ins.',
          ephemeral: true,
        });
        return;
      }

      // Save user channel configuration
      await setUserChannel(user.id, channel.id, saveToCSV);

      await interaction.reply({
        content: `✅ Daily check-in has been set up for <@${user.id}> in <#${channel.id}>\n` +
                 `CSV saving: ${saveToCSV ? 'Enabled' : 'Disabled'}`,
        ephemeral: true,
      });

    } catch (error) {
      console.error('Error in setup command:', error);
      await interaction.reply({
        content: 'There was an error setting up the check-in. Please try again.',
        ephemeral: true,
      });
    }
  },
};

export default setupCommand;