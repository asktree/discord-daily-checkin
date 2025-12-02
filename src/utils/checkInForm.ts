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
    .setMaxLength(500);

  // What would make today great input
  const greatDayInput = new TextInputBuilder()
    .setCustomId('great_day_input')
    .setLabel('What would make today great? (2-3 things)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter 2-3 things that would make today great, one per line')
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(500);

  // Free response input
  const freeResponseInput = new TextInputBuilder()
    .setCustomId('free_response')
    .setLabel('Free response (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Anything else you want to share?')
    .setRequired(false)
    .setMinLength(1)
    .setMaxLength(1000);

  // Create action rows
  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(gratefulInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(greatDayInput);
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

export function createCheckInButton(): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const button = new ButtonBuilder()
    .setCustomId('start_checkin')
    .setLabel('Start Daily Check-in')
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
        value: gratefulList.join('\n') || 'No response',
        inline: false,
      },
      {
        name: 'What would make today great?',
        value: greatDayList.join('\n') || 'No response',
        inline: false,
      }
    );

  // Add free response field if provided
  if (freeResponse && freeResponse.trim()) {
    embed.addFields({
      name: 'Free response',
      value: freeResponse,
      inline: false,
    });
  }

  embed.setTimestamp().setFooter({ text: 'Daily Check-in' });

  return embed;
}