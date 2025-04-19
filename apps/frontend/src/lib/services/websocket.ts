/**
 * @module websocket
 * @description Manages the WebSocket connection and communication with the backend server.
 */

import { writable, get } from 'svelte/store';
import {
	usernameStore,
	playersStore,
	dannyBucksStore,
	myHandStore,
	dealerHandStore,
	gameStateStore,
	lastResultStore,
	type PlayerInfo,
	type Card,
	type DealerHand,
	type GameState,
	type RoundResult,
playerIdStore, // ADDED: Import playerIdStore
} from '$lib/stores/game';

export interface WebSocketMessage {
	type: string;
	payload: any;
}

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error';

export const connectionStatus = writable<ConnectionStatus>('closed');
export const connectionError = writable<string | null>(null);

let socket: WebSocket | null = null;
let messageQueue: WebSocketMessage[] = [];
let lastUsedUrl: string | null = null; // Store the last successfully used URL

// --- State Synchronization ---
connectionStatus.subscribe((status) => {
	console.log(`Connection status changed to: ${status}`); // Added logging
	if (status === 'closed' || status === 'error') {
		if (status === 'closed') gameStateStore.set('Disconnected');
		if (status === 'error') gameStateStore.set('Error');

		// Reset state
		usernameStore.set(null);
		playersStore.set([]);
		myHandStore.set(null);
		dealerHandStore.set(null);
		lastResultStore.set(null);
		dannyBucksStore.set(0);
		messageQueue = []; // Clear queue on close/error
		// Ensure socket variable is cleared if status becomes closed/error externally
		if (socket && (status === 'closed' || status === 'error')) {
			// Avoid calling close on an already closed/closing socket if possible
			if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
				try {
					socket.close();
				} catch (e) { /* Ignore potential errors closing already closed socket */ }
			}
			socket = null;
		}

	} else if (status === 'open' && !get(usernameStore)) {
		gameStateStore.set('NeedsUsername');
	} else if (status === 'connecting') {
		gameStateStore.set('Connecting');
	}
});


/**
 * Establishes a WebSocket connection. If url is omitted, attempts to use the last known URL.
 */
export function connectWebSocket(url?: string): void {
	const targetUrl = url ?? lastUsedUrl; // Use provided URL or fallback to last used

	if (!targetUrl) {
		console.error('connectWebSocket: Cannot connect without a URL.');
		connectionError.set('WebSocket URL not provided.');
		// Optionally set status to error, though it might already be closed/error
		if (get(connectionStatus) !== 'error') {
			connectionStatus.set('error');
		}
		return;
	}

	console.log(`connectWebSocket called for ${targetUrl}. Current socket state: ${socket?.readyState}, Status store: ${get(connectionStatus)}`); // Added logging

	// Prevent multiple connections more robustly
	if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
		console.warn(`WebSocket connection attempt ignored. State: ${socket.readyState}, Status: ${get(connectionStatus)}`);
		return;
	}

	// If socket is closing, wait for it to close fully before reconnecting?
	// For now, we allow attempting connection even if closing.

	console.log(`Attempting to connect WebSocket to ${targetUrl}...`);
	connectionStatus.set('connecting');
	connectionError.set(null);
	messageQueue = []; // Clear queue for new attempt

	try {
		const newSocket = new WebSocket(targetUrl);
		// Assign immediately for potential early closeWebSocket calls
		socket = newSocket;
		lastUsedUrl = targetUrl; // Store the URL on successful creation attempt

		newSocket.onopen = () => {
			console.log('WebSocket onopen triggered.');
			// Verify this is still the active socket attempt
			if (socket !== newSocket || get(connectionStatus) !== 'connecting') {
				console.warn('onopen: Stale connection attempt or unexpected state. Closing new socket.');
				newSocket.close();
				// If the active socket is different, don't change its state
				if (socket !== newSocket) return;
			}

			connectionStatus.set('open'); // Set status *before* sending queue

			// Send queued messages
			console.log(`onopen: Sending ${messageQueue.length} queued messages.`);
			const currentQueue = [...messageQueue]; // Copy queue before clearing
			messageQueue = []; // Clear queue immediately
			currentQueue.forEach((msg) => {
				// Use sendWebSocketMessage to handle state checks during send
				sendWebSocketMessage(msg);
			});
		};

		newSocket.onmessage = (event) => {
			if (socket !== newSocket) {
				console.warn("onmessage: Received message for non-active socket.");
				return;
			}
			try {
				const message: WebSocketMessage = JSON.parse(event.data);
				console.log('WebSocket message received:', message);
				handleWebSocketMessage(message);
			} catch (error) {
				console.error('Failed to parse WebSocket message:', event.data, error);
				connectionError.set('Failed to parse incoming message.');
				connectionStatus.set('error'); // Trigger error state
			}
		};

		newSocket.onerror = (event) => {
			console.error('WebSocket onerror triggered:', event);
			// Update state only if this error belongs to the active connection attempt
			if (get(connectionStatus) === 'connecting' || socket === newSocket) {
				connectionError.set('WebSocket connection error occurred.');
				connectionStatus.set('error'); // This will trigger cleanup via subscription
				// socket = null; // Cleanup is handled by subscription now
			} else {
				console.warn("onerror: Received error for an old connection attempt.");
			}
		};

		newSocket.onclose = (event) => {
			console.log(`WebSocket onclose triggered. Code: ${event.code}, Reason: ${event.reason}`);
			if (socket !== newSocket) {
				console.warn("onclose: Received close event for non-active socket.");
				return; // Ignore close events for non-active sockets
			}
			connectionError.set(null); // Clear error on close
			connectionStatus.set('closed'); // This will trigger cleanup via subscription
			// socket = null; // Cleanup is handled by subscription now
		};

	} catch (error) {
		console.error('Failed to create WebSocket:', error);
		connectionError.set('Failed to initialize WebSocket connection.');
		connectionStatus.set('error'); // This triggers cleanup
		socket = null; // Explicitly nullify socket here too
	}
}

/**
 * Handles incoming WebSocket messages and updates the Svelte stores.
 * @param {WebSocketMessage} message - The parsed message from the server.
 */
function handleWebSocketMessage(message: WebSocketMessage): void {
	console.log(`Handling message type: ${message.type}`, message.payload);
	switch (message.type) {
		case 'usernameSuccess':
			usernameStore.set(message.payload.username);
			dannyBucksStore.set(message.payload.dannyBucks ?? 0); // Expect balance with success
			// Process initial player list if provided
			if (Array.isArray(message.payload.players)) {
				playersStore.set(message.payload.players as PlayerInfo[]);
			}
			// Process initial game state and dealer hand if provided (now sent by backend)
			if (message.payload.gameState) {
				gameStateStore.set(message.payload.gameState as GameState);
			}
			if (message.payload.dealerHand) {
				const dealerData = message.payload.dealerHand;
				if (dealerData.revealed && dealerData.highHand && dealerData.lowHand) {
					dealerHandStore.set({
						revealed: dealerData.revealed as Card[],
						highHand: dealerData.highHand as Card[],
						lowHand: dealerData.lowHand as Card[],
						isAceHighPaiGow: dealerData.isAceHighPaiGow as boolean,
					});
				}
			}
			playerIdStore.set(message.payload.playerId ?? null); // Store the player ID
			break;
		case 'usernameFailure':
			// UI should handle showing this error based on the store value
			connectionError.set(message.payload.message || 'Username is already taken.');
			// Keep state as NeedsUsername for user to retry
			gameStateStore.set('NeedsUsername');
			break;
		case 'betSuccess': // ADDED: Handle bet success
			if (typeof message.payload.dannyBucks === 'number') {
				dannyBucksStore.set(message.payload.dannyBucks);
				console.log(`Bet success. Updated DB store to: ${message.payload.dannyBucks}`); // Added logging
			} else {
				console.warn('Received betSuccess message without valid dannyBucks payload.');
			}
			break;
		case 'playerListUpdate':
			// Assuming payload is { players: [{ username: string }, ...] }
			playersStore.set(message.payload.players as PlayerInfo[]);
			break;
		case 'gameStateUpdate':
			// Assuming payload is { state: GameState, dealerHand?: DealerHand, dannyBucks?: number, ... }
			const receivedPayload = message.payload; // Store payload first
			console.log('Received gameStateUpdate payload:', receivedPayload); // Log raw payload
			const newState = receivedPayload.gameState as GameState; // Assign state - FIX TYPO: gameState not state
			console.log('Extracted newState:', newState); // Log extracted state *before* setting store
			gameStateStore.set(newState); // Set the store

			// Update dealer hand if included in the payload
			if (message.payload.dealerHand) {
				// Ensure the structure matches DealerHand type (especially 'revealed')
				const dealerData = message.payload.dealerHand;
				if (dealerData.revealed && dealerData.highHand && dealerData.lowHand) {
					dealerHandStore.set({
						revealed: dealerData.revealed as Card[],
						highHand: dealerData.highHand as Card[],
						lowHand: dealerData.lowHand as Card[],
						isAceHighPaiGow: dealerData.isAceHighPaiGow as boolean,
					});
				} else {
					console.warn('Received gameStateUpdate with incomplete dealerHand data:', dealerData);
				}
			}
			// Update player list if included in the payload
			if (Array.isArray(message.payload.players)) {
				playersStore.set(message.payload.players as PlayerInfo[]);
			}

			// Reset stores based on state transitions
			if (newState === 'Betting') {
				lastResultStore.set(null);
				myHandStore.set(null);
				// Clear dealer hand when starting a new betting round
				dealerHandStore.set(null);
			}
			// Update balance if included with state update (redundant if players list is sent, but harmless)
			if (typeof message.payload.dannyBucks === 'number') {
				// Maybe only update if players list *isn't* present? For now, allow override.
				// dannyBucksStore.set(message.payload.dannyBucks);
			}
			break;
		case 'dealHand':
			// Assuming payload is { hand: Card[] }
			myHandStore.set(message.payload.hand as Card[]);
			// Game state likely changes after dealing, expect gameStateUpdate msg
			break;
		case 'dealerHandUpdate':
			// Assuming payload matches DealerHand structure + nextState
			dealerHandStore.set({
				revealed: message.payload.revealed as Card[],
				highHand: message.payload.highHand as Card[],
				lowHand: message.payload.lowHand as Card[],
				isAceHighPaiGow: message.payload.isAceHighPaiGow as boolean,
			});
			// Update game state based on dealer's hand (e.g., AceHighPush or PlayerTurn)
			if (message.payload.nextState) {
				gameStateStore.set(message.payload.nextState as GameState);
			} else {
				// Fallback if nextState isn't provided (should be)
				gameStateStore.set(message.payload.isAceHighPaiGow ? 'AceHighPush' : 'PlayerAction'); // Use PlayerAction
			}
			break;
		case 'roundResult':
			// Assuming payload contains { results: [{ playerId, username, outcome, betAmount, winnings, newBalance, ... }], ... }
			const resultsArray = message.payload.results as any[]; // Cast for easier access
			const currentPlayerId = get(playerIdStore); // Get the current player's ID

			if (currentPlayerId && Array.isArray(resultsArray)) {
				const playerResult = resultsArray.find(result => result.playerId === currentPlayerId);
				if (playerResult) {
					// Update Balance
					if (typeof playerResult.newBalance === 'number') {
						dannyBucksStore.set(playerResult.newBalance);
						console.log(`Round result processed. Updated DB store to: ${playerResult.newBalance}`); // Added logging
					} else {
						console.warn('newBalance missing or invalid in playerResult for roundResult message.');
					}

					// Update lastResultStore (use winnings for amount display)
					lastResultStore.set({
						outcome: playerResult.outcome,
						amount: playerResult.winnings ?? 0, // Use winnings, default to 0 if missing
					} as RoundResult);

				} else {
					console.warn('Could not find result for current player in roundResult message.');
					// Clear last result if not found for this player? Or leave it? Let's clear it.
					lastResultStore.set(null);
				}
			} else {
				console.error('Could not get current player ID or results array missing/invalid in roundResult message.');
				// Clear last result on error
				lastResultStore.set(null);
			}

			// Let gameStateUpdate messages handle state transitions, as the backend sends 'RoundOver' after results.
			// gameStateStore.set(message.payload.nextState || 'RoundOver');
			break;
		case 'balanceUpdate': // Specific message just for balance changes
			if (typeof message.payload.dannyBucks === 'number') {
				dannyBucksStore.set(message.payload.dannyBucks);
			}
			break;
		case 'error': // Generic error message from backend
			connectionError.set(message.payload.message || 'An unknown error occurred.');
			gameStateStore.set('Error');
			break;
		// Add cases for other messages like 'playerJoined', 'playerLeft'
		case 'playerJoined':
			console.log(`Player joined: ${message.payload.username}`);
			// Requesting full list is more robust than trying to patch locally
			sendWebSocketMessage({ type: 'requestPlayerList', payload: {} });
			break;
		case 'playerLeft':
			console.log(`Player left: ${message.payload.username}`);
			// Requesting full list is more robust
			sendWebSocketMessage({ type: 'requestPlayerList', payload: {} });
			break;
		default:
			console.warn(`Unhandled WebSocket message type: ${message.type}`);
	}
}

/**
 * Sends a JSON message or queues it if not connected/connecting.
 */
export function sendWebSocketMessage(message: WebSocketMessage): void {
	const status = get(connectionStatus);
	console.log(`sendWebSocketMessage called. Status: ${status}, Socket state: ${socket?.readyState}`); // Added logging

	if (status === 'open' && socket && socket.readyState === WebSocket.OPEN) {
		try {
			console.log('Sending WebSocket message:', message);
			socket.send(JSON.stringify(message));
		} catch (error) {
			console.error('Failed to send WebSocket message:', error);
			connectionError.set('Failed to send message.');
			connectionStatus.set('error'); // Trigger error state on send failure
		}
	} else if (status === 'connecting' || status === 'closed') {
		// Queue only if connecting or closed (implying a connection attempt might follow)
		console.warn(`WebSocket not ready (Status: ${status}). Queuing message:`, message);
		messageQueue.push(message);
	} else {
		// Error state or unexpected state
		console.error(`WebSocket is in status ${status}. Cannot send or queue message:`, message);
		connectionError.set(`Cannot send message while status is ${status}.`);
	}
}

/**
 * Closes the WebSocket connection and resets state immediately.
 */
export function closeWebSocket(): void {
	console.log(`closeWebSocket called. Current socket state: ${socket?.readyState}, Status store: ${get(connectionStatus)}`); // Added logging
	const currentSocket = socket;
	socket = null; // Prevent further actions immediately
	messageQueue = []; // Clear queue immediately

	if (currentSocket && currentSocket.readyState !== WebSocket.CLOSED && currentSocket.readyState !== WebSocket.CLOSING) {
		console.log('Closing active WebSocket connection.');
		try {
			currentSocket.close(1000, 'Client initiated disconnect');
		} catch (e) {
			console.warn("Error closing socket, likely already closed/closing:", e);
		}
	} else {
		console.log('No active WebSocket connection to close or already closing/closed.');
	}

	// Force state update immediately, regardless of whether onclose fires
	if (get(connectionStatus) !== 'closed') {
		console.log("Forcing connection status to 'closed'.");
		connectionStatus.set('closed'); // Triggers cleanup via subscription
	}
	// Clear error state as well
	if (get(connectionError) !== null) {
		connectionError.set(null);
	}
}