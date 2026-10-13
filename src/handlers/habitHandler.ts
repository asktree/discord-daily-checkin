import {
  ActionRowBuilder,
  MessageFlags,
  ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import { reflectionDay } from '../utils/crm';
import { RATINGS, habitsEnabledFor, recordHabits, recordRating } from '../utils/habits';
import { getUserData } from '../utils/userDataManager';

/** After a nightly reflection: log each habit as yes or no in the Ledger and update its KPI. */
export async function handleHabitAnswers(interaction: ModalSubmitInteraction): Promise<void> {
  if (!habitsEnabledFor(interaction.user.id)) return;
  let picked: readonly string[];
  try {
    picked = interaction.fields.getStringSelectValues('habits_input');
  } catch {
    return; // the modal had no such field
  }

  const timezone = getUserData(interaction.user.id)?.timezone || 'UTC';
  const day = reflectionDay(new Date(), timezone);
  const results = await recordHabits(interaction.user.id, day, new Set(picked));

  const lines = [`✨ Habits for ${day}:`];
  for (const r of results) {
    const goal = r.habit.target ? ` (goal ${r.habit.target})` : '';
    const progress = r.habit.kpiMode === 'count7'
      ? `${r.last7} of the last 7 nights${goal}`
      : `${r.streak} ${r.streak === 1 ? 'night' : 'nights'} in a row${goal}`;
    lines.push(`${r.done ? '✅' : '▫️'} ${r.habit.label}: ${progress}`);
    if (r.error) lines.push(`⚠️ Not saved in the Ledger: ${r.error}`);
  }

  // One 0-100% select per rating; the answer is recorded when picked (handleRatingSelect)
  const components = RATINGS.map(rating =>
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`rating:${rating.id}:${day}`)
        .setPlaceholder(rating.question.slice(0, 150))
        .addOptions(Array.from({ length: 11 }, (_, i) => ({ label: `${i * 10}%`, value: String(i * 10) })))
    )
  );
  await interaction.followUp({ content: lines.join('\n').slice(0, 2000), components, flags: MessageFlags.Ephemeral });
}

/** A 0-100% rating picked under the habits message: save it and set the 7-answer mean KPI. */
export async function handleRatingSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const [, ratingId, day] = interaction.customId.split(':');
  const value = Number(interaction.values[0]);
  if (!habitsEnabledFor(interaction.user.id) || !day || !Number.isFinite(value)) {
    await interaction.reply({ content: 'This rating is not active.', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferUpdate();
  const result = await recordRating(interaction.user.id, ratingId, day, value);
  if (!result) {
    await interaction.followUp({ content: 'This rating is not active.', flags: MessageFlags.Ephemeral });
    return;
  }

  const goal = result.rating.target !== undefined ? ` (goal ${result.rating.target}%)` : '';
  let line = `🎙️ ${result.rating.question} ${value}%. Mean of the last ${result.answers}: ${result.mean}%${goal}.`;
  if (result.error) line += `\n⚠️ Not saved in the Ledger: ${result.error}`;

  // Keep the other rating selects; drop the one just answered
  const content = `${interaction.message.content}\n${line}`.slice(0, 2000);
  const components = interaction.message.components
    .filter(row => !('components' in row) || !row.components.some(c => (c as { customId?: string }).customId === interaction.customId))
    .map(row => row.toJSON());
  await interaction.editReply({ content, components: components as any });
}
