import { ModalSubmitInteraction } from 'discord.js';
import { createCheckInEmbed } from '../utils/checkInForm';
import { saveCheckInData } from '../utils/csvStorage';
import { getUserData, updateUserCheckIn } from '../utils/userDataManager';
import { CheckInData } from '../types/userData';
import { generateEmojiBlessing } from '../utils/emojiGenerator';

export async function handleCheckInModal(interaction: ModalSubmitInteraction) {
  try {
    // Get the submitted values
    const gratefulText = interaction.fields.getTextInputValue('grateful_input');
    const greatDayText = interaction.fields.getTextInputValue('great_day_input');

    // Get free response (it's optional, so use try-catch)
    let freeResponse = '';
    try {
      freeResponse = interaction.fields.getTextInputValue('free_response');
    } catch {
      // Field is optional, so it's okay if it's not filled
    }

    // Parse the input (split by new lines and filter empty lines)
    const gratefulList = gratefulText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const greatDayList = greatDayText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Create check-in data object
    const checkInData: CheckInData = {
      userId: interaction.user.id,
      timestamp: new Date(),
      gratefulFor: gratefulList,
      makeGreat: greatDayList,
      freeResponse: freeResponse.trim() || undefined,
    };

    // Get user data to check if we should save to CSV
    const userData = await getUserData(interaction.user.id);

    // Save to CSV if enabled (default is true unless user opts out)
    if (userData?.saveToCSV !== false) {
      await saveCheckInData(checkInData);
    }

    // Update user's last check-in time
    await updateUserCheckIn(interaction.user.id);

    // Create and send the embed immediately
    const embed = createCheckInEmbed(interaction.user.id, gratefulList, greatDayList, freeResponse);

    // Send initial reply without emojis
    await interaction.reply({
      embeds: [embed],
    });

    // Generate emoji blessing asynchronously (non-blocking)
    generateEmojiBlessing(gratefulList, greatDayList, freeResponse)
      .then(async (emojiBlessing) => {
        if (emojiBlessing) {
          // Edit the message to add emojis once they're ready
          try {
            await interaction.editReply({
              content: emojiBlessing,
              embeds: [embed],
            });
            console.log('Added emoji blessing to check-in');
          } catch (editError) {
            console.error('Error editing message with emojis:', editError);
          }
        }
      })
      .catch((error) => {
        console.error('Error generating emoji blessing:', error);
        // Don't need to do anything else, message is already sent
      });

  } catch (error) {
    console.error('Error handling check-in modal:', error);

    const errorMessage = 'There was an error processing your check-in. Please try again.';

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: errorMessage,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  }
}