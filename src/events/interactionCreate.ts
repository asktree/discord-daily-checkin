import { Client, Events, type Interaction, MessageFlags } from "discord.js";
import { handleCheckInModal } from "../handlers/checkInHandler";
import { handleNightCheckInModal } from "../handlers/nightCheckInHandler";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: Client) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }

    // Handle button interactions
    if (interaction.isButton()) {
      if (interaction.customId === "start_checkin") {
        const { showCheckInModal } = await import("../utils/checkInForm");
        await showCheckInModal(interaction);
      } else if (interaction.customId === "start_night_checkin") {
        const { showNightCheckInModal } = await import("../utils/checkInForm");
        await showNightCheckInModal(interaction);
      }
    }

    // Handle select menus (0-100% ratings under the nightly habits message)
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("rating:")) {
      const { handleRatingSelect } = await import("../handlers/habitHandler");
      await handleRatingSelect(interaction).catch((error) => console.error("Rating select failed:", error));
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "checkin_modal") {
        await handleCheckInModal(interaction);
      } else if (interaction.customId === "night_checkin_modal") {
        await handleNightCheckInModal(interaction);
      } else if (interaction.customId === "timezone-times") {
        const { handleTimezoneTimesModal } = await import("../handlers/timezoneHandler");
        await handleTimezoneTimesModal(interaction);
      }
    }
  },
};
