import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonInteraction,
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageActionRowComponentBuilder
} from 'discord.js';

function createCheckInModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId('checkin_modal')
    .setTitle('Daily Check-in');

  // Grateful for input
  const gratefulInput = new TextInputBuilder()
    .setCustomId('grateful_input')
    .setLabel('Today I am grateful for... (2-3 things)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter 2-3 things you are grateful for, one per line')
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(1024);

  // What would make today great input
  const greatDayInput = new TextInputBuilder()
    .setCustomId('great_day_input')
    .setLabel('What would make today great? (2-3 things)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter 2-3 things that would make today great, one per line')
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(1024);

  // Free response input
  const freeResponseInput = new TextInputBuilder()
    .setCustomId('free_response')
    .setLabel('Free response (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Anything else you want to share?')
    .setRequired(false)
    .setMinLength(1)
    .setMaxLength(4000);

  // Create action rows
  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(gratefulInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(greatDayInput);
  const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(freeResponseInput);

  // Add rows to modal
  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  return modal;
}

function createNightCheckInModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId('night_checkin_modal')
    .setTitle('Nightly Reflection');

  // Highlights of the day
  const highlightsInput = new TextInputBuilder()
    .setCustomId('highlights_input')
    .setLabel('Highlights of the day (2-3 things)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter 2-3 highlights from your day, one per line')
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(1024);

  // What I learned today
  const learnedInput = new TextInputBuilder()
    .setCustomId('learned_input')
    .setLabel('What I learned from today (2-3 things)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter 2-3 things you learned today, one per line')
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(1024);

  // Free response input
  const freeResponseInput = new TextInputBuilder()
    .setCustomId('free_response_night')
    .setLabel('Free response (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Anything else you want to share?')
    .setRequired(false)
    .setMinLength(1)
    .setMaxLength(4000);

  // Create action rows
  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(highlightsInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(learnedInput);
  const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(freeResponseInput);

  // Add rows to modal
  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  return modal;
}

export async function showCheckInModal(interaction: ButtonInteraction) {
  const modal = createCheckInModal();
  await interaction.showModal(modal);
}

export async function showCheckInModalFromCommand(interaction: ChatInputCommandInteraction) {
  const modal = createCheckInModal();
  await interaction.showModal(modal);
}

export async function showNightCheckInModal(interaction: ButtonInteraction) {
  const modal = createNightCheckInModal();
  await interaction.showModal(modal);
}

export async function showNightCheckInModalFromCommand(interaction: ChatInputCommandInteraction) {
  const modal = createNightCheckInModal();
  await interaction.showModal(modal);
}

export function createCheckInButton(): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const button = new ButtonBuilder()
    .setCustomId('start_checkin')
    .setLabel('Start Daily Check-in')
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(button);
}

export function createNightCheckInButton(): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const button = new ButtonBuilder()
    .setCustomId('start_night_checkin')
    .setLabel('Start Nightly Reflection')
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(button);
}

export function createCheckInEmbed(
  userId: string,
  gratefulList: string[],
  greatDayList: string[],
  freeResponse?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('Daily Check-in Complete!')
    .setDescription(`<@${userId}>'s check-in for today`)
    .addFields(
      {
        name: 'Today I am grateful for...',
        value: gratefulList.map((item, i) => `${i + 1}. ${item}`).join('\n') || 'No response',
        inline: false,
      },
      {
        name: 'What would make today great?',
        value: greatDayList.map((item, i) => `${i + 1}. ${item}`).join('\n') || 'No response',
        inline: false,
      }
    );

  // Add free response field(s) if provided
  if (freeResponse && freeResponse.trim()) {
    const maxFieldLength = 1024;
    const response = freeResponse.trim();

    if (response.length <= maxFieldLength) {
      embed.addFields({
        name: 'Free response',
        value: response,
        inline: false,
      });
    } else {
      // Split into multiple fields for long responses
      const chunks: string[] = [];
      let remaining = response;
      while (remaining.length > 0) {
        if (remaining.length <= maxFieldLength) {
          chunks.push(remaining);
          break;
        }
        // Try to split at a newline or space near the limit
        let splitIndex = remaining.lastIndexOf('\n', maxFieldLength);
        if (splitIndex === -1 || splitIndex < maxFieldLength / 2) {
          splitIndex = remaining.lastIndexOf(' ', maxFieldLength);
        }
        if (splitIndex === -1 || splitIndex < maxFieldLength / 2) {
          splitIndex = maxFieldLength;
        }
        chunks.push(remaining.slice(0, splitIndex));
        remaining = remaining.slice(splitIndex).trimStart();
      }

      chunks.forEach((chunk, index) => {
        const name = chunks.length === 1
          ? 'Free response'
          : `Free response (${index + 1}/${chunks.length})`;
        embed.addFields({ name, value: chunk, inline: false });
      });
    }
  }

  embed.setTimestamp().setFooter({ text: 'Daily Check-in' });

  return embed;
}

export function createNightCheckInEmbed(
  userId: string,
  highlightsList: string[],
  learnedList: string[],
  freeResponse?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x1E293B) // Dark blue for night
    .setTitle('Nightly Reflection Complete!')
    .setDescription(`<@${userId}>'s reflection for today`)
    .addFields(
      {
        name: 'Highlights of the day',
        value: highlightsList.map((item, i) => `${i + 1}. ${item}`).join('\n') || 'No response',
        inline: false,
      },
      {
        name: 'What I learned from today',
        value: learnedList.map((item, i) => `${i + 1}. ${item}`).join('\n') || 'No response',
        inline: false,
      }
    );

  // Add free response field(s) if provided
  if (freeResponse && freeResponse.trim()) {
    const maxFieldLength = 1024;
    const response = freeResponse.trim();

    if (response.length <= maxFieldLength) {
      embed.addFields({
        name: 'Free response',
        value: response,
        inline: false,
      });
    } else {
      // Split into multiple fields for long responses
      const chunks: string[] = [];
      let remaining = response;
      while (remaining.length > 0) {
        if (remaining.length <= maxFieldLength) {
          chunks.push(remaining);
          break;
        }
        // Try to split at a newline or space near the limit
        let splitIndex = remaining.lastIndexOf('\n', maxFieldLength);
        if (splitIndex === -1 || splitIndex < maxFieldLength / 2) {
          splitIndex = remaining.lastIndexOf(' ', maxFieldLength);
        }
        if (splitIndex === -1 || splitIndex < maxFieldLength / 2) {
          splitIndex = maxFieldLength;
        }
        chunks.push(remaining.slice(0, splitIndex));
        remaining = remaining.slice(splitIndex).trimStart();
      }

      chunks.forEach((chunk, index) => {
        const name = chunks.length === 1
          ? 'Free response'
          : `Free response (${index + 1}/${chunks.length})`;
        embed.addFields({ name, value: chunk, inline: false });
      });
    }
  }

  embed.setTimestamp().setFooter({ text: 'Nightly Reflection' });

  return embed;
}