import type { WebSocket } from 'ws';
import type { Card } from './Card';

/**
 * Represents a player connected to the game server.
 */
export class Player {
	id: string; // Unique identifier for the player (e.g., generated UUID)
	username: string | null; // Player's chosen name, null until set
	dannyBucks: number; // Current chip balance
	currentHand: Card[] | null; // Player's 7 dealt cards
	currentBet: number | null; // Amount bet for the current round
	isHost: boolean; // Is this player the host? (Simplified for MVP)
	ws: WebSocket; // Reference to the player's WebSocket connection

	/**
	 * Creates a new Player instance.
	 * @param {string} id - The unique ID for the player.
	 * @param {WebSocket} ws - The WebSocket connection associated with the player.
	 */
	constructor(id: string, ws: WebSocket) {
		this.id = id;
		this.ws = ws;
		this.username = null; // Username is set later via message
		this.dannyBucks = 0; // Initial balance set later (e.g., in GameTable or on username set)
		this.currentHand = null;
		this.currentBet = null;
		this.isHost = false; // Host status determined later
	}
}