import { WebSocket } from 'ws';
import type { PlayerWebSocket } from './types/websocket';
import type { WebSocketMessage } from './types/messages';
import type { GameTable } from './models/GameTable'; // Import GameTable type

/**
 * Broadcasts a message to all connected clients in the game table, optionally excluding one.
 * @param {GameTable} gameTable - The game table instance containing players.
 * @param {WebSocketMessage} message - The message to broadcast.
 * @param {string} [excludePlayerId] - The ID of the player to exclude.
 */
export function broadcast(gameTable: GameTable, message: WebSocketMessage, excludePlayerId?: string) {
	const messageString = JSON.stringify(message);
	console.log(`Broadcasting (exclude ${excludePlayerId || 'none'}):`, messageString);

	gameTable.players.forEach((player) => {
		const playerWs = player.ws as PlayerWebSocket; // Use the ws property from the Player model
		if (
			playerWs && // Ensure connection exists
			playerWs.readyState === WebSocket.OPEN &&
			playerWs.playerId && // Use the playerId stored on the ws object
			playerWs.playerId !== excludePlayerId
		) {
			playerWs.send(messageString);
		} else if (playerWs) {
			// Add logging here to see why a client might be skipped
			console.log(`Skipping broadcast to client: State=${playerWs.readyState}, Has PlayerID=${!!playerWs.playerId}, PlayerID=${playerWs.playerId}, Excluded=${excludePlayerId}`);
		} else {
			console.log(`Skipping broadcast for player ${player.id}: No active WebSocket connection found.`);
		}
	});
}

/**
 * Sends the complete current game state to a specific client or broadcasts it.
 * @param {GameTable} gameTable - The game table instance.
 * @param {PlayerWebSocket} [targetWs] - The specific client to send to. If undefined, broadcasts to all.
 * @param {string} [messageText] - An optional text message to include in the payload.
 */
export function sendFullGameState(gameTable: GameTable, targetWs?: PlayerWebSocket, messageText?: string) {
	const payload = {
		gameState: gameTable.gameState,
		players: Array.from(gameTable.players.values())
			.filter(p => p.username) // Only include players with usernames
			.map(p => ({
				id: p.id,
				username: p.username,
				isHost: p.isHost,
				dannyBucks: p.dannyBucks // Include current balance
			})),
		dealerHand: gameTable.dealerHand.dealtCards ? { // Only send dealer hand if it exists
			revealed: gameTable.dealerHand.dealtCards,
			highHand: gameTable.dealerHand.highHand,
			lowHand: gameTable.dealerHand.lowHand,
			isAceHighPaiGow: gameTable.dealerHand.isAceHighPaiGow,
		} : null,
		message: messageText || undefined // Include optional message
	};

	const message: WebSocketMessage = { type: 'gameStateUpdate', payload };

	if (targetWs) {
		console.log(`Sending full game state to ${targetWs.playerId}`);
		if (targetWs.readyState === WebSocket.OPEN) {
			targetWs.send(JSON.stringify(message));
		}
	} else {
		console.log('Broadcasting full game state update.');
		broadcast(gameTable, message); // Pass gameTable to broadcast
	}
}