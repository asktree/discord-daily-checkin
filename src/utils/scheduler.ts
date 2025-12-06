import { Client } from "discord.js";
import { initializeAllUserCrons } from "./cronManager";

// Initialize the per-user cron scheduler
export function initScheduler(client: Client) {
  console.log("Initializing per-user cron scheduler...");

  // Initialize cron jobs for all existing users
  initializeAllUserCrons(client);

  console.log("Per-user cron scheduler initialized");
}

// Export for backwards compatibility
export async function triggerMorningPing(client: Client, userId?: string) {
  if (userId) {
    const { sendUserMorningPing } = await import('./userPings');
    await sendUserMorningPing(client, userId);
  }
}