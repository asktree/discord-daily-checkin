import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { CheckInData, NightCheckInData } from '../types/userData';

const DATA_DIR = join(process.cwd(), 'data');
const CSV_DIR = join(DATA_DIR, 'check-ins');

// Ensure CSV directory exists
if (!existsSync(CSV_DIR)) {
  mkdirSync(CSV_DIR, { recursive: true });
}

// Get CSV file path for a user
function getUserCSVPath(userId: string): string {
  return join(CSV_DIR, `${userId}.csv`);
}

// Save check-in data to user's CSV file
export async function saveCheckInData(checkInData: CheckInData): Promise<void> {
  try {
    const csvPath = getUserCSVPath(checkInData.userId);
    const isNewFile = !existsSync(csvPath);

    // Format timestamp
    const timestamp = checkInData.timestamp.toISOString();
    const date = checkInData.timestamp.toLocaleDateString();
    const time = checkInData.timestamp.toLocaleTimeString();

    // Escape and join array values
    const gratefulForStr = checkInData.gratefulFor
      .map(item => `"${item.replace(/"/g, '""')}"`)
      .join('; ');

    const makeGreatStr = checkInData.makeGreat
      .map(item => `"${item.replace(/"/g, '""')}"`)
      .join('; ');

    // Escape free response
    const freeResponseStr = checkInData.freeResponse
      ? `"${checkInData.freeResponse.replace(/"/g, '""')}"`
      : '""';

    // Create CSV row
    const csvRow = `${timestamp},${date},${time},"${gratefulForStr}","${makeGreatStr}",${freeResponseStr}\n`;

    if (isNewFile) {
      // Write header if new file
      const header = 'Timestamp,Date,Time,Grateful For,What Would Make Today Great,Free Response\n';
      writeFileSync(csvPath, header + csvRow);
      console.log(`Created new CSV file for user ${checkInData.userId}`);
    } else {
      // Append to existing file
      appendFileSync(csvPath, csvRow);
      console.log(`Appended check-in data for user ${checkInData.userId}`);
    }

  } catch (error) {
    console.error(`Error saving check-in data for user ${checkInData.userId}:`, error);
    throw error;
  }
}

// Get path to user's CSV file (for export commands, future feature)
export function getUserCSVFilePath(userId: string): string | null {
  const csvPath = getUserCSVPath(userId);
  return existsSync(csvPath) ? csvPath : null;
}

// Check if user has any saved check-ins
export function userHasCheckIns(userId: string): boolean {
  const csvPath = getUserCSVPath(userId);
  return existsSync(csvPath);
}

// Get CSV file path for night check-ins
function getUserNightCSVPath(userId: string): string {
  return join(CSV_DIR, `${userId}_night.csv`);
}

// Save night check-in data to user's CSV file
export async function saveNightCheckInData(nightCheckInData: NightCheckInData): Promise<void> {
  try {
    const csvPath = getUserNightCSVPath(nightCheckInData.userId);
    const isNewFile = !existsSync(csvPath);

    // Format timestamp
    const timestamp = nightCheckInData.timestamp.toISOString();
    const date = nightCheckInData.timestamp.toLocaleDateString();
    const time = nightCheckInData.timestamp.toLocaleTimeString();

    // Escape and join array values
    const highlightsStr = nightCheckInData.highlights
      .map(item => `"${item.replace(/"/g, '""')}"`)
      .join('; ');

    const learnedStr = nightCheckInData.learned
      .map(item => `"${item.replace(/"/g, '""')}"`)
      .join('; ');

    // Escape free response
    const freeResponseStr = nightCheckInData.freeResponse
      ? `"${nightCheckInData.freeResponse.replace(/"/g, '""')}"`
      : '""';

    // Create CSV row
    const csvRow = `${timestamp},${date},${time},"${highlightsStr}","${learnedStr}",${freeResponseStr}\n`;

    if (isNewFile) {
      // Write header if new file
      const header = 'Timestamp,Date,Time,Highlights,What I Learned,Free Response\n';
      writeFileSync(csvPath, header + csvRow);
      console.log(`Created new night CSV file for user ${nightCheckInData.userId}`);
    } else {
      // Append to existing file
      appendFileSync(csvPath, csvRow);
      console.log(`Appended night check-in data for user ${nightCheckInData.userId}`);
    }

  } catch (error) {
    console.error(`Error saving night check-in data for user ${nightCheckInData.userId}:`, error);
    throw error;
  }
}