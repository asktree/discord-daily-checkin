import { MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { crmEnabledFor, parseEngagements, recordEngagements, reflectionDay } from '../utils/crm';
import { getUserData } from '../utils/userDataManager';

/** After a nightly reflection: log each "who did you engage" line in the CRM. New people are added. */
export async function handleSeenAnswer(interaction: ModalSubmitInteraction): Promise<void> {
  if (!crmEnabledFor(interaction.user.id)) return;
  let text = '';
  try {
    text = interaction.fields.getTextInputValue('seen_input');
  } catch {
    return; // the modal had no such field
  }
  if (!text.trim()) return;

  const timezone = getUserData(interaction.user.id)?.timezone || 'UTC';
  const day = reflectionDay(new Date(), timezone);
  const items = await parseEngagements(text);
  if (!items.length) return;
  const result = await recordEngagements(items, day);

  const lines: string[] = [];
  if (result.logged.length) {
    lines.push(`📇 Logged in the CRM for ${day}:`);
    for (const l of result.logged) lines.push(`• ${l.line} (${l.people.join(', ')})`);
  }
  if (result.added.length) lines.push(`New in the CRM: ${result.added.join(', ')}.`);
  if (result.failed.length) lines.push(`⚠️ Could not tell who these are, so they were not logged: ${result.failed.join(', ')}. Log them in the CRM.`);
  if (result.skipped.length) lines.push(`No person found in: ${result.skipped.join('; ')}.`);
  if (result.error) lines.push(`⚠️ The CRM stopped with an error, so the rest was not logged: ${result.error}`);
  if (!lines.length) return;

  // Ephemeral: CRM names stay private even when the check-in channel is shared
  await interaction.followUp({ content: lines.join('\n').slice(0, 2000), flags: MessageFlags.Ephemeral });
}
