import { GameTable } from './models/GameTable';

// Create a single instance of GameTable
const gameTable = new GameTable('main-table');
console.log(`Game table ${gameTable.id} created in GameManager.`);

/**
 * Provides access to the singleton GameTable instance.
 * @returns {GameTable} The single instance of the game table.
 */
export function getGameTable(): GameTable {
    return gameTable;
}

// Optional: Export the instance directly if preferred, but a getter function is often cleaner
// export const gameTableInstance = gameTable;