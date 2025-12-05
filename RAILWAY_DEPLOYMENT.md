# Railway Deployment Guide with Persistent Storage

## Setting Up Persistent Storage with Railway Volumes

Your bot is now configured to work with Railway Volumes for persistent file storage. Here's how to set it up:

### 1. Create a Railway Volume

1. Go to your Railway project dashboard
2. Click on your service (discord bot)
3. Navigate to the "Settings" tab
4. Scroll down to the "Volumes" section
5. Click "Add Volume"
6. Configure the volume:
   - **Mount Path**: `/data`
   - **Size**: 1GB (more than enough for CSV files)

### 2. Environment Variables in Railway

Make sure you have these environment variables set in Railway:

```bash
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here  # Optional, for faster command updates
NODE_ENV=production           # Railway usually sets this automatically

# Optional: Custom data path (if not using /data)
# DATA_PATH=/custom/path
```

### 3. How the Storage Works

The bot now uses a smart data path configuration:

- **In Production (Railway)**: Uses `/data` (the mounted volume)
- **In Development**: Uses `./data` (local directory)
- **Custom Path**: Set `DATA_PATH` environment variable to override

### 4. Data Structure

Your persistent data will be organized as:

```
/data/
├── users.json           # User configuration and metadata
└── check-ins/
    ├── userId1.csv      # Morning check-ins for user 1
    ├── userId1_night.csv # Night check-ins for user 1
    ├── userId2.csv      # Morning check-ins for user 2
    └── ...
```

### 5. Deployment Steps

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add Railway Volume support for persistent storage"
   git push
   ```

2. Railway will automatically deploy the new version

3. The volume will persist data across:
   - Deployments
   - Restarts
   - Updates

### 6. Verifying Persistent Storage

After deployment, your bot will log:
```
Data storage configured at: /data
```

This confirms that the volume is properly mounted and being used.

### 7. Backup Considerations

Railway Volumes are persistent but consider:
- Regularly backing up your data (you can access via Railway CLI)
- Consider implementing an export command for users to download their data
- For critical data, consider also using a database service

### 8. Alternative: Railway PostgreSQL

If you prefer a database approach instead of files:
1. Add PostgreSQL from Railway dashboard
2. Railway will automatically set `DATABASE_URL`
3. You would need to refactor the code to use a database ORM like Prisma

## Troubleshooting

### Volume Not Persisting Data
- Ensure the volume is mounted at `/data`
- Check that `NODE_ENV=production` is set
- Verify in logs that data is being written to `/data`

### Permission Issues
- Railway volumes should have proper permissions by default
- If issues occur, the code will fall back to `./data`

### Data Migration
If you have existing data to migrate:
1. Export your local data
2. Use Railway CLI to upload to the volume
3. Or create a temporary migration endpoint

## Code Changes Made

1. **New file**: `src/config/dataPath.ts` - Centralized data path configuration
2. **Updated**: `src/utils/csvStorage.ts` - Uses centralized data path
3. **Updated**: `src/utils/userDataManager.ts` - Uses centralized data path
4. **Updated**: `.env.example` - Added DATA_PATH documentation

The bot will now automatically use the Railway Volume when deployed, ensuring all user data and check-ins persist across deployments!