import { Client } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';

export async function registerEvents(client: Client) {
  const eventsPath = join(__dirname, '..', 'events');
  const eventFiles = readdirSync(eventsPath).filter(file =>
    (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts')
  );

  for (const file of eventFiles) {
    const event = await import(join(eventsPath, file));

    if (event.default.once) {
      client.once(event.default.name, (...args) => event.default.execute(...args, client));
    } else {
      client.on(event.default.name, (...args) => event.default.execute(...args, client));
    }

    console.log(`Loaded event: ${event.default.name}`);
  }
}