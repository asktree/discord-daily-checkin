import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';
import { Command } from '../types/command';
import { setUserChannel, getUserData } from '../utils/userDataManager';
import { scheduleUserCrons } from '../utils/cronManager';

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
        .setDescription('The channel for daily check-ins (omit for DMs)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addBooleanOption(option =>
      option
        .setName('save_to_csv')
        .setDescription('Whether to save check-ins to CSV (default: true)')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('use_dm')
        .setDescription('Send check-in pings via DM instead of a channel (default: false)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const user = interaction.options.getUser('user', true);
      const channel = interaction.options.getChannel('channel');
      const saveToCSV = interaction.options.getBoolean('save_to_csv') ?? true;
      const useDM = interaction.options.getBoolean('use_dm') ?? !channel;

      if (!useDM && !channel) {
        await interaction.reply({
          content: '❌ Please either specify a channel or set `use_dm` to true.',
          ephemeral: true,
        });
        return;
      }

      if (!useDM && channel && channel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: '❌ Please select a text channel for check-ins.',
          ephemeral: true,
        });
        return;
      }

      // Save user channel configuration
      await setUserChannel(user.id, channel?.id || '', saveToCSV, useDM);

      // Schedule cron jobs for the user
      const userData = getUserData(user.id);
      if (userData) {
        scheduleUserCrons(user.id, userData, interaction.client);
      }

      const destination = useDM
        ? 'via **DMs**'
        : `in <#${channel!.id}>`;

      await interaction.reply({
        content: `✅ Daily check-in has been set up for <@${user.id}> ${destination}\n` +
                 `CSV saving: ${saveToCSV ? 'Enabled' : 'Disabled'}\n` +
                 `📍 Default check-in times: 9:00 AM and 9:00 PM (UTC)\n` +
                 `💡 User can customize times and timezone with \`/timing zone\` and \`/timing set\``,
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
