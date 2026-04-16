import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import * as dotenv from 'dotenv';
import { registerEvents } from './handlers/eventHandler';
import { registerCommands } from './handlers/commandHandler';
import { initScheduler } from './utils/scheduler';
import { Command } from './types/command';
import { migrateUserDataToDM } from './utils/migrate';

// Load environment variables
dotenv.config();

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel, // Required to receive DM interactions
  ],
});

// Create commands collection
client.commands = new Collection<string, Command>();

// Initialize bot
async function init() {
  try {
    // One-time data migration for DM support
    migrateUserDataToDM();

    // Register event handlers
    await registerEvents(client);

    // Register slash commands
    await registerCommands(client);

    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);

    // Initialize scheduler after login
    initScheduler(client);

    console.log('Bot is running!');
  } catch (error) {
    console.error('Error initializing bot:', error);
    process.exit(1);
  }
}

// Start the bot
init();

// Handle process termination
process.on('SIGINT', () => {
  console.log('Bot shutting down...');
  client.destroy();
  process.exit(0);
});

// Extend Discord.js Client type
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}