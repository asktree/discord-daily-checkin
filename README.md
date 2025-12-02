# Discord Daily Check-in Bot

A Discord bot that facilitates daily gratitude and goal-setting check-ins for users, with structured forms and CSV data tracking.

## Features

- **Daily Check-ins**: Structured forms for morning reflections
- **AI Emoji Blessings**: Claude generates 7 emojis as a summary/blessing for each check-in
- **Automated Reminders**: Morning pings and follow-up reminders
- **Individual Channels**: Each user gets their own dedicated check-in channel
- **Data Persistence**: Check-ins saved to individual CSV files
- **Privacy Options**: Users can opt-out of data storage
- **Interactive Setup**: Easy channel assignment via slash commands

## Prerequisites

- Node.js 16.9.0 or higher
- npm or yarn
- A Discord account and server
- Discord Developer Application

## Setup Instructions

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section in the left sidebar
4. Click "Add Bot"
5. Under "Privileged Gateway Intents", enable:
   - Server Members Intent
   - Message Content Intent
6. Copy the bot token (you'll need this for .env)

### 2. Get Your Bot's Client ID

1. In your Discord application, go to "General Information"
2. Copy the "Application ID" (this is your CLIENT_ID)

### 3. Invite the Bot to Your Server

1. Go to "OAuth2" > "URL Generator" in your Discord application
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Read Message History
   - Mention Everyone (for user pings)
   - View Channels
4. Copy the generated URL and open it to invite the bot

### 4. Configure the Bot

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd discord-daily-checkin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your credentials:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here  # Optional for development
   ANTHROPIC_API_KEY=your_anthropic_api_key  # Optional for emoji blessings
   ```

### 5. Run the Bot

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## Usage

### Admin Commands

#### `/setup` - Configure check-in for a user
- **Required Permission**: Manage Channels
- **Parameters**:
  - `user`: The user to set up check-in for
  - `channel`: The text channel for their check-ins
  - `save_to_csv`: Whether to save data (default: true)

Example:
```
/setup @username #daily-checkin save_to_csv:true
```

### User Commands

#### `/checkin` - Start your daily check-in
Opens an interactive form with:
- "Today I am grateful for..." (2-3 things)
- "What would make today great?" (2-3 things)

#### `/status` - Check your check-in status
Shows:
- Setup status and assigned channel
- Last check-in date
- CSV saving preference

### Daily Schedule

The bot automatically:
- Sends morning check-in reminders (default: 9 AM)
- Sends follow-up reminders if not completed (default: 1 PM)
- Resets daily flags at midnight

You can customize times in `.env`:
```env
MORNING_PING_TIME=0 9 * * *    # 9 AM
REMINDER_PING_TIME=0 13 * * *  # 1 PM
```

## Data Storage

- User configurations: `data/users.json`
- Check-in CSVs: `data/check-ins/{userId}.csv`

CSV Format:
```
Timestamp,Date,Time,Grateful For,What Would Make Today Great
```

## Development

### Project Structure
```
src/
├── commands/       # Slash command implementations
├── events/         # Discord event handlers
├── handlers/       # Core bot handlers
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

### Available Scripts

- `npm run dev` - Run with hot reload
- `npm run build` - Build TypeScript
- `npm start` - Run production build
- `npm run start:dev` - Run TypeScript directly

## Troubleshooting

### Bot doesn't respond to commands
1. Check bot has proper permissions in the channel
2. Verify .env configuration is correct
3. Check console for error messages
4. Ensure bot is online in Discord

### Commands not showing up
1. If using GUILD_ID, commands appear instantly
2. Without GUILD_ID, global commands can take up to 1 hour
3. Try kicking and re-inviting the bot

### Check-ins not saving
1. Verify `data/` directory has write permissions
2. Check user's save_to_csv setting with `/status`
3. Look for errors in console output

## Future Enhancements

- Evening reflection component
- Data export functionality
- Analytics and streak tracking
- Multi-language support
- Custom check-in questions

## License

ISC

## Contributing

Pull requests welcome! Please follow the existing code style and add tests for new features.