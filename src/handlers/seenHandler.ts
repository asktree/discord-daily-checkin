import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  MessageActionRowComponentBuilder,
  MessageFlags,
  ModalSubmitInteraction,
} from 'discord.js';
import { addPerson, CrmHttpError, crmEnabledFor, logHangout, parseNames, recordSeen, reflectionDay } from '../utils/crm';
import { getUserData } from '../utils/userDataManager';

const ADD_PREFIX = 'crm_add|';

/** After a nightly reflection: log who the user saw in the CRM and offer to add unknown names. */
export async function handleSeenAnswer(interaction: ModalSubmitInteraction): Promise<void> {
  if (!crmEnabledFor(interaction.user.id)) return;
  let text = '';
  try {
    text = interaction.fields.getTextInputValue('seen_input');
  } catch {
    return; // the modal had no such field
  }
  const names = parseNames(text);
  if (!names.length) return;

  const timezone = getUserData(interaction.user.id)?.timezone || 'UTC';
  const day = reflectionDay(new Date(), timezone);
  const result = await recordSeen(names, day);

  const lines: string[] = [];
  if (result.error) lines.push(`⚠️ Could not reach the CRM, so nothing was logged: ${result.error}`);
  if (result.logged.length) lines.push(`📇 Logged a hangout on ${day} with: ${result.logged.join(', ')}.`);
  const addable = result.unmatched.filter(n => (ADD_PREFIX + day + '|' + n).length <= 100).slice(0, 25);
  if (result.unmatched.length) {
    lines.push(`Not in the CRM: ${result.unmatched.join(', ')}.` + (addable.length ? ' Tap a name to add them and log today. Ignore the buttons to skip.' : ''));
  }
  if (!lines.length) return;

  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
  if (!result.error) {
    for (let i = 0; i < addable.length; i += 5) {
      rows.push(new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        addable.slice(i, i + 5).map(n =>
          new ButtonBuilder().setCustomId(ADD_PREFIX + day + '|' + n).setLabel(`Add ${n}`.slice(0, 80)).setStyle(ButtonStyle.Secondary)
        )
      ));
    }
  }
  // Ephemeral: CRM names stay private even when the check-in channel is shared
  await interaction.followUp({ content: lines.join('\n'), components: rows, flags: MessageFlags.Ephemeral });
}

/** "Add <name>" button: create the person in the CRM, then log the hangout on that day. */
export async function handleAddButton(interaction: ButtonInteraction): Promise<void> {
  if (!crmEnabledFor(interaction.user.id)) {
    await interaction.reply({ content: 'Only the owner of this check-in can add people.', flags: MessageFlags.Ephemeral });
    return;
  }
  const [, day, ...rest] = interaction.customId.split('|');
  const name = rest.join('|');
  await interaction.deferUpdate();
  let note: string;
  try {
    const person = await addPerson(name);
    await logHangout([person.id], day);
    note = `✅ Added ${person.name} to the CRM and logged ${day}.`;
  } catch (e) {
    note = e instanceof CrmHttpError && e.status === 409
      ? `⚠️ ${name} looks like someone already in the CRM. Nothing was added. Fix it in the CRM.`
      : `⚠️ Could not add ${name}: ${e instanceof Error ? e.message : String(e)}`;
  }
  // Remove the clicked button so it can't be pressed twice
  const rows = interaction.message.components
    .map(row => {
      const buttons = ('components' in row ? row.components : [])
        .filter((c: any) => c.customId && c.customId !== interaction.customId)
        .map((c: any) => ButtonBuilder.from(c));
      return buttons.length ? new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons) : null;
    })
    .filter((r): r is ActionRowBuilder<MessageActionRowComponentBuilder> => r !== null);
  await interaction.editReply({ content: `${interaction.message.content}\n${note}`.slice(0, 2000), components: rows });
}
