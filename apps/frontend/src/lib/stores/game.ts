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
	| 'PlayerTurn' // Player needs to set their hand
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

// --- Store Update Logic (Example - to be integrated into websocket.ts) ---
// This is illustrative; the actual updates will happen in the websocket service's onmessage handler.

/*
import { connectionStatus } from '$lib/services/websocket'; // Import from actual service

connectionStatus.subscribe(status => {
    if (status === 'closed') {
        gameStateStore.set('Disconnected');
        // Reset other stores as needed
        usernameStore.set(null);
        playersStore.set([]);
        // ... etc.
    } else if (status === 'error') {
        gameStateStore.set('Error');
    } else if (status === 'open' && !get(usernameStore)) {
         gameStateStore.set('NeedsUsername');
    }
});

export function handleWebSocketMessage(message: { type: string; payload: any }) {
    switch (message.type) {
        case 'usernameSuccess':
            usernameStore.set(message.payload.username);
            // Assuming initial state after username is waiting
            gameStateStore.set('WaitingForPlayers');
            // Backend should send initial DB balance too
            dannyBucksStore.set(message.payload.dannyBucks || 1000); // Example default
            break;
        case 'playerListUpdate': // Example message type
            playersStore.set(message.payload.players);
            break;
        case 'gameStateUpdate':
            gameStateStore.set(message.payload.state);
            // Potentially update other stores based on state transition
            if (message.payload.state === 'Betting') {
                lastResultStore.set(null); // Clear last result
                myHandStore.set(null); // Clear hand
                dealerHandStore.set(null); // Clear dealer hand
            }
            break;
        case 'dealHand':
            myHandStore.set(message.payload.hand);
            break;
        case 'dealerHandUpdate': // Example: Sent after dealer sets hand
             dealerHandStore.set({
                 revealed: message.payload.revealedCards,
                 highHand: message.payload.highHand,
                 lowHand: message.payload.lowHand,
                 isAceHighPaiGow: message.payload.isAceHighPaiGow
             });
             // Game state might also change here, e.g., to 'PlayerTurn' or 'AceHighPush'
             gameStateStore.set(message.payload.nextState);
            break;
        case 'roundResult':
            lastResultStore.set({
                outcome: message.payload.outcome,
                amount: message.payload.amount,
            });
            dannyBucksStore.update(balance => balance + message.payload.amount);
            // Game state likely changes to 'RoundOver' or 'Betting'
             gameStateStore.set(message.payload.nextState || 'Betting');
            break;
        // Add cases for other relevant messages like playerJoined, playerLeft, balanceUpdate etc.
    }
}
*/