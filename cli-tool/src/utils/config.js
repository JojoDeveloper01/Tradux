import { logger } from './logger.js';
import { fileManager } from '../core/file-manager.js';

export async function loadConfig() {
    try {
        const config = await fileManager.loadConfig();

        if (!config) {
            return null; // Return null instead of exiting
        }

        return config;
    } catch (e) {
        logger.error(`Error loading config: ${e.message}`);
        process.exit(1);
    }
}