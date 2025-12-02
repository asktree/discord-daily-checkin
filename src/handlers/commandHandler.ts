import { Client, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Command } from '../types/command';

export async function registerCommands(client: Client) {
  const commands = [];
  const commandsPath = join(__dirname, '..', 'commands');
  const commandFiles = readdirSync(commandsPath).filter(file =>
    file.endsWith('.ts') || file.endsWith('.js')
  );

  for (const file of commandFiles) {
    const command = await import(join(commandsPath, file));
    const cmd = command.default as Command;

    if (cmd && cmd.data) {
      client.commands.set(cmd.data.name, cmd);
      commands.push(cmd.data.toJSON());
      console.log(`Loaded command: ${cmd.data.name}`);
    }
  }

  // Register commands with Discord
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

  try {
    console.log('Refreshing application (/) commands...');

    if (process.env.GUILD_ID) {
      // Guild-specific commands (faster for development)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID),
        { body: commands },
      );
    } else {
      // Global commands
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID!),
        { body: commands },
      );
    }

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}