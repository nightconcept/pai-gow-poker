import { writable, type Writable, get } from 'svelte/store'; // Import get

// --- Type Definitions ---
interface WebSocketMessage {
	type: string;
	payload: unknown;
}

// --- Stores ---
export const connectionStatus: Writable<'connecting' | 'connected' | 'disconnected' | 'error'> =
	writable('disconnected');

// --- Module State ---
let socket: WebSocket | null = null;
let messageListeners: Map<string, Array<(payload: any) => void>> = new Map();
let connectionPromise: Promise<void> | null = null; // To handle concurrent connection attempts

// --- Constants ---
// TODO: Replace with environment variable VITE_WEBSOCKET_URL
const WS_URL = 'ws://localhost:8080'; // Default for local dev

// --- Core Functions ---

/**
 * Establishes a connection to the WebSocket server. Handles concurrent calls gracefully.
 * @returns {Promise<void>} A promise that resolves when the connection is open or rejects on error/existing connection.
 */
export function connectWebSocket(): Promise<void> {
	// 1. Already connected? Resolve immediately.
	if (socket && socket.readyState === WebSocket.OPEN) {
		console.log('WebSocket already connected.');
		return Promise.resolve();
	}

	// 2. Connection attempt already in progress? Return the existing promise.
	if (connectionPromise) {
		console.log('WebSocket connection attempt already in progress.');
		return connectionPromise;
	}

    // 3. Start a new connection attempt
	console.log(`Attempting to connect WebSocket to ${WS_URL}...`);
	connectionStatus.set('connecting'); // Set status synchronously

	connectionPromise = new Promise((resolve, reject) => {
		// Clear previous socket instance if necessary (e.g., after error/close)
		if (socket && (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING)) {
			socket = null;
		}

		try {
			socket = new WebSocket(WS_URL);
		} catch (error) {
			console.error('Failed to create WebSocket:', error);
			connectionStatus.set('error');
			socket = null;
			connectionPromise = null; // Clear the promise tracker
			reject(error);
			return;
		}

		// Assign handlers
		socket.onopen = () => {
			console.log('WebSocket connection established.');
			connectionStatus.set('connected');
			connectionPromise = null; // Clear promise tracker on success
			resolve();
		};

		socket.onmessage = (event) => {
			try {
				const message: WebSocketMessage = JSON.parse(event.data.toString());
				console.log('WebSocket message received:', message);

				// Notify specific listeners (iterate over copy)
				const listeners = messageListeners.get(message.type);
				if (listeners) {
					[...listeners].forEach((callback) => {
						try {
							callback(message.payload);
						} catch (err) {
							console.error(`Error in message listener for type "${message.type}":`, err);
						}
					});
				}

				// Notify generic listeners (iterate over copy)
				const genericListeners = messageListeners.get('*');
				if (genericListeners) {
					[...genericListeners].forEach((callback) => {
						try {
							callback(message);
						} catch (err) {
							console.error('Error in generic message listener:', err);
						}
					});
				}
			} catch (error) {
				console.error('Failed to parse WebSocket message or error in handler:', error);
				console.error('Received data:', event.data);
			}
		};

		socket.onerror = (errorEvent) => {
			console.error('WebSocket error:', errorEvent);
			// Always set status to error on onerror event
			connectionStatus.set('error');
			// Don't nullify socket here, let onclose handle it if it follows
			connectionPromise = null; // Clear promise tracker on error
			reject(new Error('WebSocket connection error')); // Reject with a generic error or the event itself
		};

		socket.onclose = (closeEvent) => {
			console.log('WebSocket connection closed:', closeEvent.code, closeEvent.reason);
			// Only update status if not already in 'error' state from onerror
			// Check the *current* status synchronously before setting
			const currentStatus = get(connectionStatus);
			if (currentStatus !== 'error') {
				connectionStatus.set('disconnected');
			}
			socket = null; // Clean up the socket instance
			connectionPromise = null; // Clear promise tracker on close
            // Do not automatically resolve/reject here, onerror or onopen handles the promise outcome
		};
	});

	return connectionPromise;
}

/**
 * Sends a JSON message to the WebSocket server.
 * @param {string} type - The message type identifier.
 * @param {unknown} payload - The data payload for the message.
 */
export function sendMessage(type: string, payload: unknown): void {
	// Check if socket exists and is actually OPEN. Prevent sending during CONNECTING, CLOSING, CLOSED.
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		console.error(`WebSocket not open (state: ${socket?.readyState ?? 'null'}). Cannot send message type "${type}".`); // Use 'null' when socket is null
		return;
	}

	const message: WebSocketMessage = { type, payload };
	try {
		const messageString = JSON.stringify(message);
		// console.log(`[sendMessage Diagnostics] Sending type "${type}". Socket state: ${socket?.readyState}`); // Removed diagnostic log
		console.log('Sending WebSocket message:', message);
		socket.send(messageString);
	} catch (error) {
		console.error('Failed to stringify or send WebSocket message:', error);
	}
}

/**
 * Closes the WebSocket connection if open or connecting.
 */
export function closeWebSocket(): void {
	if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
		console.log(`Closing WebSocket connection (current state: ${socket.readyState}).`);
		socket.close(1000, "Client initiated close"); // Use standard code
        // State change ('disconnected' or 'error') handled by onclose/onerror
        // connectionPromise might still exist if closing during connection, onclose/onerror will clear it.
	} else {
        console.log(`WebSocket not open or connecting (state: ${socket?.readyState}). No action taken by closeWebSocket.`);
        // Ensure state reflects reality if called when already closed/null
        if (!socket) {
            connectionStatus.set('disconnected');
            connectionPromise = null;
        }
    }
}

/**
 * Registers a callback function to listen for specific message types.
 * @param {string} messageType - The type of message to listen for (e.g., 'gameStateUpdate', '*' for all).
 * @param {(payload: any) => void} callback - The function to call when a message of the specified type is received.
 * @returns {() => void} A function to unregister the listener.
 */
export function addMessageListener(messageType: string, callback: (payload: any) => void): () => void {
	if (!messageListeners.has(messageType)) {
		messageListeners.set(messageType, []);
	}
	const listeners = messageListeners.get(messageType)!;
	listeners.push(callback);

	// Return an unsubscribe function
	return () => {
		const currentListeners = messageListeners.get(messageType);
		if (currentListeners) {
			const index = currentListeners.indexOf(callback);
			if (index > -1) {
				currentListeners.splice(index, 1);
			}
			// Clean up map entry if no listeners remain for this type
			if (currentListeners.length === 0) {
				messageListeners.delete(messageType);
			}
		}
	};
}

// --- Test Environment Only ---
/**
 * Resets the WebSocket service state for testing purposes.
 * WARNING: Should only be used in test environments.
 */
export function resetWebSocketState_TEST_ONLY(): void {
	// Guard against running outside test mode (Vite specific)
	if (import.meta.env && import.meta.env.MODE !== 'test' && process.env.NODE_ENV !== 'test') {
		console.error('resetWebSocketState_TEST_ONLY called outside of test environment!');
		return;
	}
	console.log('Resetting WebSocket state for testing...');
	if (socket) {
		// Do NOT close the socket here. Tests should handle closing.
		// Just remove handlers to prevent memory leaks or unexpected calls after reset.
		// if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
		// 	socket.close(1005, "Test Reset");
		// }
		socket.onopen = null;
		socket.onmessage = null;
		socket.onerror = null;
		socket.onclose = null;
	}
	socket = null; // Nullify the instance variable
	messageListeners = new Map(); // Reset listeners map
	connectionPromise = null; // Reset connection promise tracker
	connectionStatus.set('disconnected'); // Reset status store explicitly
}

// --- Browser Environment ---
// Ensure connection is closed when the app potentially closes
if (typeof window !== 'undefined') {
	window.addEventListener('beforeunload', () => {
		// Use a specific code indicating browser close if desired
		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.close(1001, 'Browser closing');
		}
	});
}