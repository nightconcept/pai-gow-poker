// apps/frontend/src/lib/stores/game.ts
import { writable } from 'svelte/store';
import type { ConnectionStatus } from '$lib/services/websocket'; // Assuming websocket service exports this

// --- Type Definitions ---

/** Represents a standard playing card. */
export interface Card {
	rank: string; // '2', '3', ..., 'K', 'A', 'JOKER'
	suit: string; // 'Spades', 'Hearts', 'Diamonds', 'Clubs', '' for Joker
}

/** Simplified representation of other players at the table. */
export interface PlayerInfo {
	username: string;
	// Add other displayable info later if needed (e.g., dannyBucks)
}

/** Structure for the dealer's hand information. */
export interface DealerHand {
	revealed: Card[]; // The full 7 cards dealt face-up
	highHand: Card[]; // The set 5-card hand
	lowHand: Card[]; // The set 2-card hand
	isAceHighPaiGow: boolean; // Was it an Ace-High Pai Gow?
}

/** Possible states of the game relevant to the UI. */
export type GameState =
	| 'Connecting' // Initial state before WebSocket connects
	| 'NeedsUsername' // WebSocket connected, waiting for user to provide username
	| 'WaitingForPlayers' // Username set, waiting for enough players or host action
	| 'Betting' // Time for players to place bets
	| 'Dealing' // Cards are being dealt (brief state)
	| 'DealerHandVisible' // Dealer's hand is set and visible
	| 'AceHighPush' // Dealer had Ace-High Pai Gow, round is a push
	| 'PlayerAction' // Player needs to set their hand (Matches backend log)
	| 'WaitingForOthers' // Player has set hand, waiting for other players
	| 'Showdown' // All hands set, results being determined/shown
	| 'RoundOver' // Round finished, preparing for next betting phase
	| 'Error' // An error occurred
	| 'Disconnected'; // WebSocket disconnected

/** Structure for the result of a round for the current player. */
export interface RoundResult {
	outcome: 'Win' | 'Loss' | 'Push' | 'Foul';
	amount: number; // Amount won (positive) or lost (negative), 0 for push/foul
	// Optionally add player/dealer hands for display during results
	// playerHighHand?: Card[];
	// playerLowHand?: Card[];
	// dealerHighHand?: Card[];
	// dealerLowHand?: Card[];
}

// --- Svelte Stores ---

/** Stores the current player's username, null if not set. */
export const usernameStore = writable<string | null>(null);

/** Stores information about other players at the table. */
export const playersStore = writable<PlayerInfo[]>([]);

/** Stores the current player's DannyBucks balance. */
export const dannyBucksStore = writable<number>(0);

/** Stores the current player's 7 dealt cards, null if no hand dealt. */
export const myHandStore = writable<Card[] | null>(null);

/** Stores the dealer's hand information, null if not dealt or revealed yet. */
export const dealerHandStore = writable<DealerHand | null>(null);

/** Stores the current phase/state of the game. */
export const gameStateStore = writable<GameState>('Connecting');

/** Stores the result of the last completed round for the player, null otherwise. */
export const lastResultStore = writable<RoundResult | null>(null);
