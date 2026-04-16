import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getDataDir } from '../config/dataPath';

const DM_USER_ID = '1037775205378048021';
const DISABLE_USER_ID = '178033489277485057';

/**
 * One-time migration: switch DM_USER to DM mode, disable pings for DISABLE_USER.
 * Safe to run multiple times — skips if already migrated.
 */
export function migrateUserDataToDM() {
  const dataFile = join(getDataDir(), 'users.json');
  if (!existsSync(dataFile)) return;

  try {
    const raw = readFileSync(dataFile, 'utf-8');
    const data = JSON.parse(raw);
    let changed = false;

    // Switch main user to DM mode
    if (data[DM_USER_ID] && !data[DM_USER_ID].useDM) {
      data[DM_USER_ID].useDM = true;
      data[DM_USER_ID].channelId = '';
      changed = true;
      console.log(`Migration: switched user ${DM_USER_ID} to DM mode`);
    }

    // Disable pings for other user
    if (data[DISABLE_USER_ID] && data[DISABLE_USER_ID].channelId) {
      data[DISABLE_USER_ID].channelId = '';
      changed = true;
      console.log(`Migration: disabled pings for user ${DISABLE_USER_ID}`);
    }

    if (changed) {
      writeFileSync(dataFile, JSON.stringify(data, null, 2));
      console.log('Migration: users.json updated');
    } else {
      console.log('Migration: already up to date, skipping');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
}
