import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { createNightCheckInEmbed } from '../utils/checkInForm';
import { saveNightCheckInData } from '../utils/csvStorage';
import { getUserData, updateUserNightCheckIn } from '../utils/userDataManager';
import { NightCheckInData } from '../types/userData';
import { generateEmojiBlessing } from '../utils/emojiGenerator';

export async function handleNightCheckInModal(interaction: ModalSubmitInteraction) {
  try {
    // Defer the reply immediately to avoid timeout
    await interaction.deferReply();

    // Get the submitted values
    const highlightsText = interaction.fields.getTextInputValue('highlights_input');
    const learnedText = interaction.fields.getTextInputValue('learned_input');

    // Get free response (it's optional, so use try-catch)
    let freeResponse = '';
    try {
      freeResponse = interaction.fields.getTextInputValue('free_response_night');
    } catch {
      // Field is optional, so it's okay if it's not filled
    }

    // Parse the input (split by new lines and filter empty lines)
    const highlightsList = highlightsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const learnedList = learnedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Create night check-in data object
    const nightCheckInData: NightCheckInData = {
      userId: interaction.user.id,
      timestamp: new Date(),
      highlights: highlightsList,
      learned: learnedList,
      freeResponse: freeResponse.trim() || undefined,
    };

    // Get user data to check if we should save to CSV
    const userData = await getUserData(interaction.user.id);

    // Save to CSV if enabled (default is true unless user opts out)
    if (userData?.saveToCSV !== false) {
      await saveNightCheckInData(nightCheckInData);
    }

    // Update user's last night check-in time
    await updateUserNightCheckIn(interaction.user.id);

    // Create and send the embed immediately
    const embed = createNightCheckInEmbed(interaction.user.id, highlightsList, learnedList, freeResponse);

    // Edit the deferred reply with the embed
    await interaction.editReply({
      embeds: [embed],
    });

    // Generate emoji blessing asynchronously (non-blocking)
    // Use highlights and learned for context instead of grateful/makeGreat
    generateEmojiBlessing(highlightsList, learnedList, freeResponse)
      .then(async (emojiBlessing) => {
        if (emojiBlessing) {
          // Edit the message to add emojis once they're ready
          try {
            await interaction.editReply({
              content: emojiBlessing,
              embeds: [embed],
            });
            console.log('Added emoji blessing to night check-in');
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
    console.error('Error handling night check-in modal:', error);

    const errorMessage = 'There was an error processing your nightly reflection. Please try again.';

    try {
      // Since we always defer at the start, use editReply for errors
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({
          content: errorMessage,
        });
      } else if (interaction.replied) {
        await interaction.followUp({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}