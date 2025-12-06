import { ChatInputCommandInteraction, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { getUserData, updateUserData } from '../utils/userDataManager';
import { formatInTimeZone } from 'date-fns-tz';
import { scheduleUserCrons } from '../utils/cronManager';

// Common timezones grouped by region
const TIMEZONE_OPTIONS = {
  'US & Canada': [
    { label: 'Eastern (New York)', value: 'America/New_York', description: 'EST/EDT' },
    { label: 'Central (Chicago)', value: 'America/Chicago', description: 'CST/CDT' },
    { label: 'Mountain (Denver)', value: 'America/Denver', description: 'MST/MDT' },
    { label: 'Pacific (Los Angeles)', value: 'America/Los_Angeles', description: 'PST/PDT' },
    { label: 'Alaska', value: 'America/Anchorage', description: 'AKST/AKDT' },
    { label: 'Hawaii', value: 'Pacific/Honolulu', description: 'HST' },
  ],
  'Europe': [
    { label: 'London', value: 'Europe/London', description: 'GMT/BST' },
    { label: 'Paris/Berlin', value: 'Europe/Paris', description: 'CET/CEST' },
    { label: 'Moscow', value: 'Europe/Moscow', description: 'MSK' },
    { label: 'Athens', value: 'Europe/Athens', description: 'EET/EEST' },
  ],
  'Asia': [
    { label: 'Tokyo', value: 'Asia/Tokyo', description: 'JST' },
    { label: 'Shanghai/Beijing', value: 'Asia/Shanghai', description: 'CST' },
    { label: 'Delhi', value: 'Asia/Kolkata', description: 'IST' },
    { label: 'Dubai', value: 'Asia/Dubai', description: 'GST' },
    { label: 'Singapore', value: 'Asia/Singapore', description: 'SGT' },
  ],
  'Other': [
    { label: 'Sydney', value: 'Australia/Sydney', description: 'AEDT/AEST' },
    { label: 'Auckland', value: 'Pacific/Auckland', description: 'NZDT/NZST' },
    { label: 'São Paulo', value: 'America/Sao_Paulo', description: 'BRT' },
    { label: 'UTC', value: 'UTC', description: 'Universal Time' },
  ]
};

const data = new SlashCommandBuilder()
  .setName('timing')
  .setDescription('Configure your timezone and check-in timing')
  .addSubcommand(subcommand =>
    subcommand
      .setName('zone')
      .setDescription('Set your timezone')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('set')
      .setDescription('Set your check-in times and reminder delays')
  );

async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  if (subcommand === 'zone') {
    await handleTimezoneSet(interaction, userId);
  } else if (subcommand === 'set') {
    await handleCheckInTimes(interaction, userId);
  }
}

async function handleTimezoneSet(interaction: ChatInputCommandInteraction, userId: string) {
  // Create select menu for timezone region
  const regionMenu = new StringSelectMenuBuilder()
    .setCustomId('timezone-region')
    .setPlaceholder('Select your region')
    .addOptions([
      { label: '🇺🇸 US & Canada', value: 'US & Canada' },
      { label: '🇪🇺 Europe', value: 'Europe' },
      { label: '🌏 Asia', value: 'Asia' },
      { label: '🌍 Other', value: 'Other' }
    ]);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(regionMenu);

  await interaction.reply({
    content: 'Please select your region:',
    components: [row],
    ephemeral: true
  });

  // Wait for region selection
  const regionCollector = interaction.channel?.createMessageComponentCollector({
    filter: i => i.user.id === userId && i.customId === 'timezone-region',
    time: 60000,
    max: 1
  });

  regionCollector?.on('collect', async regionInteraction => {
    if (!regionInteraction.isStringSelectMenu()) return;

    const region = regionInteraction.values[0];
    const timezones = TIMEZONE_OPTIONS[region as keyof typeof TIMEZONE_OPTIONS];

    // Create timezone select menu
    const timezoneMenu = new StringSelectMenuBuilder()
      .setCustomId('timezone-select')
      .setPlaceholder('Select your timezone')
      .addOptions(timezones);

    const timezoneRow = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(timezoneMenu);

    await regionInteraction.update({
      content: `Select your timezone from ${region}:`,
      components: [timezoneRow]
    });

    // Wait for timezone selection
    const timezoneCollector = interaction.channel?.createMessageComponentCollector({
      filter: i => i.user.id === userId && i.customId === 'timezone-select',
      time: 60000,
      max: 1
    });

    timezoneCollector?.on('collect', async timezoneInteraction => {
      if (!timezoneInteraction.isStringSelectMenu()) return;

      const timezone = timezoneInteraction.values[0];
      const userData = getUserData(userId);

      if (!userData) {
        await timezoneInteraction.update({
          content: 'You need to set up your check-in channel first! Use `/setup` command.',
          components: []
        });
        return;
      }

      // Update user's timezone
      userData.timezone = timezone;
      updateUserData(userId, userData);

      // Reschedule user's cron jobs with new timezone
      scheduleUserCrons(userId, userData, interaction.client!);

      // Show current time in their timezone
      const currentTime = formatInTimeZone(new Date(), timezone, 'h:mm a zzz');

      await timezoneInteraction.update({
        content: `✅ Timezone updated to **${timezone}**\nCurrent time in your timezone: **${currentTime}**\n\nUse \`/timing set\` to configure your check-in times.`,
        components: []
      });
    });
  });
}

async function handleCheckInTimes(interaction: ChatInputCommandInteraction, userId: string) {
  const userData = getUserData(userId);

  if (!userData) {
    await interaction.reply({
      content: 'You need to set up your check-in channel first! Use `/setup` command.',
      ephemeral: true
    });
    return;
  }

  if (!userData.timezone) {
    await interaction.reply({
      content: 'Please set your timezone first using `/timing zone`',
      ephemeral: true
    });
    return;
  }

  // Create modal for time configuration
  const modal = new ModalBuilder()
    .setCustomId('timezone-times')
    .setTitle('Set Your Daily Check-in Times');

  const morningInput = new TextInputBuilder()
    .setCustomId('morning-time')
    .setLabel('Morning check-in time (24-hour format)')
    .setPlaceholder('09:00')
    .setValue(userData.morningCheckInTime || '09:00')
    .setRequired(true)
    .setMaxLength(5)
    .setMinLength(5)
    .setStyle(TextInputStyle.Short);

  const nightInput = new TextInputBuilder()
    .setCustomId('night-time')
    .setLabel('Night check-in time (24-hour format)')
    .setPlaceholder('21:00')
    .setValue(userData.nightCheckInTime || '21:00')
    .setRequired(true)
    .setMaxLength(5)
    .setMinLength(5)
    .setStyle(TextInputStyle.Short);

  const reminderInput = new TextInputBuilder()
    .setCustomId('reminder-delay')
    .setLabel('Hours before reminder (1-12)')
    .setPlaceholder('4')
    .setValue((userData.reminderDelay || 4).toString())
    .setRequired(true)
    .setMaxLength(2)
    .setStyle(TextInputStyle.Short);

  const rows = [morningInput, nightInput, reminderInput].map(input =>
    new ActionRowBuilder<TextInputBuilder>().addComponents(input)
  );

  modal.addComponents(...rows);

  if (interaction.isCommand()) {
    await interaction.showModal(modal);
  }
}

export default { data, execute };