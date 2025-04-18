import { writable } from 'svelte/store';

// Define types for store values (adjust as needed)
export type PlayerInfo = {
	id: string;
	username: string;
	dannyBucks?: number; // Optional, as not always present
	// Add other relevant player info here
};

export type Card = {
	rank: string;
	suit: string;
};

export type DealerHand = {
	revealed: Card[] | null;
	highHand: Card[] | null;
	lowHand: Card[] | null;
	isAceHighPaiGow: boolean;
};

export type GameState =
	| 'Connecting'
	| 'NeedsUsername'
	| 'WaitingForPlayers'
	| 'Betting'
	| 'Dealing'
	| 'PlayerAction'
	| 'Showdown'
	| 'RoundOver'
	| 'Disconnected'
	| 'Error'
	| 'AceHighPush';

export type RoundResult = {
	outcome: string; // 'Win', 'Loss', 'Push', 'Error'
	amount: number;
	// Optionally add hand details if needed for display
};


// --- Svelte Writable Stores ---

export const usernameStore = writable<string | null>(null);
export const playersStore = writable<PlayerInfo[]>([]);
export const dannyBucksStore = writable<number>(0);
export const myHandStore = writable<Card[] | null>(null);
export const dealerHandStore = writable<DealerHand | null>(null);
export const gameStateStore = writable<GameState>('Disconnected'); // Initial state
export const lastResultStore = writable<RoundResult | null>(null);
export const playerIdStore = writable<string | null>(null); // ADDED: Player ID Store
