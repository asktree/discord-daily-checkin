import { MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { reflectionDay } from '../utils/crm';
import { habitsEnabledFor, recordHabits } from '../utils/habits';
import { getUserData } from '../utils/userDataManager';

/** After a nightly reflection: log each habit as yes or no in the Ledger and update its streak. */
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
    const nights = r.streak === 1 ? 'night' : 'nights';
    lines.push(`${r.done ? '✅' : '▫️'} ${r.habit.label}: ${r.streak} ${nights} in a row${r.habit.target ? ` (goal ${r.habit.target})` : ''}`);
    if (r.error) lines.push(`⚠️ Not saved in the Ledger: ${r.error}`);
  }
  await interaction.followUp({ content: lines.join('\n').slice(0, 2000), flags: MessageFlags.Ephemeral });
}
