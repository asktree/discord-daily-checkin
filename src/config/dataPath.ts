import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Get the data directory path based on environment
 * - In production (Railway with Volume): Use the mounted volume path
 * - In development: Use local ./data directory
 */
export function getDataDir(): string {
  // Check if we're running in Railway with a volume mounted
  // Railway typically sets NODE_ENV=production
  const isProduction = process.env.NODE_ENV === 'production';

  // You can also use a custom env variable to specify the data path
  if (process.env.DATA_PATH) {
    return process.env.DATA_PATH;
  }

  // Default paths
  if (isProduction && existsSync('/data')) {
    // Railway Volume is typically mounted at /data
    return '/data';
  }

  // Fallback to local data directory (for development or if volume not mounted)
  return join(process.cwd(), 'data');
}

/**
 * Ensure the data directory and its subdirectories exist
 */
export function ensureDataDirectories(): void {
  const dataDir = getDataDir();
  const checkInsDir = join(dataDir, 'check-ins');

  // Create directories if they don't exist
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
  }

  if (!existsSync(checkInsDir)) {
    mkdirSync(checkInsDir, { recursive: true });
    console.log(`Created check-ins directory: ${checkInsDir}`);
  }

  console.log(`Data storage configured at: ${dataDir}`);
}