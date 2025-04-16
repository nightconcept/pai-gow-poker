import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	connectWebSocket,
	sendWebSocketMessage,
	closeWebSocket,
	connectionStatus,
	connectionError,
	type WebSocketMessage,
	type ConnectionStatus,
} from './websocket';
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
} from '$lib/stores/game';

// --- Mock WebSocket ---
let mockWebSocketInstance: MockWebSocket | null = null;

interface MockCloseEventData { code: number; reason: string; wasClean: boolean; }

class MockWebSocket {
	static instances: MockWebSocket[] = [];
	static mockClear() {
		MockWebSocket.instances = [];
		mockWebSocketInstance = null;
	}

	readyState: number = WebSocket.CONNECTING;
	url: string;
	onopen: (() => void) | null = null;
	onmessage: ((event: { data: string }) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;
	onclose: ((event: MockCloseEventData) => void) | null = null;
	sentMessages: string[] = [];

	constructor(url: string) {
		this.url = url;
		MockWebSocket.instances.push(this);
		mockWebSocketInstance = this;
		// console.log(`MockWebSocket created for ${url}`);
	}

	send(data: string) {
		// console.log(`MockWebSocket send: ${data}`);
		if (this.readyState !== WebSocket.OPEN) {
			// Simulate browser error more closely
			throw new Error(`InvalidStateError: Failed to execute 'send' on 'WebSocket': Still in state ${this.readyState === WebSocket.CONNECTING ? 'CONNECTING' : 'CLOSING/CLOSED'}`);
		}
		this.sentMessages.push(data);
	}

	// Make close synchronous for easier testing of immediate effects
	close(code?: number, reason?: string) {
		// console.log(`MockWebSocket close called with code ${code}, reason ${reason}`);
		if (this.readyState === WebSocket.CLOSING || this.readyState === WebSocket.CLOSED) {
			return;
		}
		const previousState = this.readyState;
		this.readyState = WebSocket.CLOSING; // State changes immediately
		this.readyState = WebSocket.CLOSED; // State changes immediately

		// Trigger onclose callback synchronously
		// Only trigger if it wasn't already closed/closing when called
		if (previousState !== WebSocket.CLOSED && previousState !== WebSocket.CLOSING && this.onclose) {
			this.onclose({
				code: code ?? 1000,
				reason: reason ?? '',
				wasClean: code === 1000 || code === undefined, // Assume clean unless specific code given
			});
		}
		if (mockWebSocketInstance === this) {
			mockWebSocketInstance = null;
		}
	}

	// --- Test Simulation Methods ---
	simulateOpen() {
		// console.log('MockWebSocket simulating open');
		if (this.readyState !== WebSocket.CONNECTING) return; // Can only open if connecting
		this.readyState = WebSocket.OPEN;
		if (this.onopen) this.onopen();
	}

	simulateMessage(message: WebSocketMessage) {
		// console.log('MockWebSocket simulating message', message);
		if (this.readyState !== WebSocket.OPEN) return; // Can only receive if open
		if (this.onmessage) this.onmessage({ data: JSON.stringify(message) });
	}

	simulateError() {
		// console.log('MockWebSocket simulating error');
		const wasConnectingOrOpen = this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.OPEN;
		this.readyState = WebSocket.CLOSED; // Error usually leads to closed state
		if (this.onerror) this.onerror(new Event('error'));
		// Trigger close synchronously after error
		if (wasConnectingOrOpen && this.onclose) {
			this.onclose({ code: 1006, reason: 'Simulated error', wasClean: false });
		}
		if (mockWebSocketInstance === this) mockWebSocketInstance = null;
	}

	simulateServerClose(code = 1005, reason = 'Server shutdown') {
		// console.log(`MockWebSocket simulating server close (${code}: ${reason})`);
		if (this.readyState === WebSocket.CLOSED || this.readyState === WebSocket.CLOSING) return; // Already closed/closing

		const wasClean = code === 1000;
		this.readyState = WebSocket.CLOSED;
		if (this.onclose) {
			this.onclose({ code: code, reason: reason, wasClean: wasClean });
		}
		if (mockWebSocketInstance === this) mockWebSocketInstance = null;
	}
}

// --- Vitest Setup ---
beforeEach(() => {
	vi.stubGlobal('WebSocket', MockWebSocket);
	// Reset stores
	connectionStatus.set('closed');
	connectionError.set(null);
	usernameStore.set(null);
	playersStore.set([]);
	dannyBucksStore.set(0);
	myHandStore.set(null);
	dealerHandStore.set(null);
	// gameStateStore is set by subscription, start connectionStatus closed
	// gameStateStore.set('Connecting'); // Let subscription handle initial state
	lastResultStore.set(null);

	MockWebSocket.mockClear();
	// Suppress console logs during tests unless needed for debugging
	// vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	closeWebSocket(); // Ensure state is reset
	vi.unstubAllGlobals();
	vi.restoreAllMocks(); // Use restoreAllMocks to clean up spies
});

// --- Test Suites ---
describe('websocket service', () => {
	const testUrl = 'ws://localhost:8080';

	it('should initialize with closed status and disconnected game state', () => {
		// Initial state before connectWebSocket is called
		expect(get(connectionStatus)).toBe('closed');
		expect(get(gameStateStore)).toBe('Disconnected'); // Set by subscription to 'closed'
		expect(get(connectionError)).toBeNull();
	});

	describe('connectWebSocket', () => {
		it('should set status to connecting and game state to Connecting', () => {
			connectWebSocket(testUrl);
			expect(get(connectionStatus)).toBe('connecting');
			expect(get(gameStateStore)).toBe('Connecting'); // Set by subscription
			expect(get(connectionError)).toBeNull();
			expect(MockWebSocket.instances.length).toBe(1);
			expect(MockWebSocket.instances[0].url).toBe(testUrl);
		});

		it('should set status to open and game state to NeedsUsername when connection succeeds', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			expect(get(connectionStatus)).toBe('open');
			expect(get(gameStateStore)).toBe('NeedsUsername'); // Set by subscription
			expect(get(connectionError)).toBeNull();
		});

		it('should set status to error and game state to Error on connection error', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateError(); // Triggers onerror AND onclose synchronously
			expect(get(connectionStatus)).toBe('error'); // Set by onerror handler
			expect(get(gameStateStore)).toBe('Error'); // Set by subscription
			expect(get(connectionError)).toBe('WebSocket connection error occurred.');
		});

		it('should set status to closed and game state to Disconnected when connection closes cleanly', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			expect(get(connectionStatus)).toBe('open');
			mockWebSocketInstance?.simulateServerClose(1000, 'Normal close'); // Triggers onclose synchronously
			expect(get(connectionStatus)).toBe('closed'); // Set by onclose handler
			expect(get(gameStateStore)).toBe('Disconnected'); // Set by subscription
			expect(get(connectionError)).toBeNull(); // Error cleared on close
		});

		it('should set status to closed and game state to Disconnected when connection closes uncleanly', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			expect(get(connectionStatus)).toBe('open');
			mockWebSocketInstance?.simulateServerClose(1006, 'Abnormal close'); // Triggers onclose synchronously
			expect(get(connectionStatus)).toBe('closed'); // Set by onclose handler
			expect(get(gameStateStore)).toBe('Disconnected'); // Set by subscription
			expect(get(connectionError)).toBeNull(); // Error still cleared on close
		});


		// --- Message Handler Tests ---
		it('should update stores on "usernameSuccess" message', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			mockWebSocketInstance?.simulateMessage({ type: 'usernameSuccess', payload: { username: 'TestUser', dannyBucks: 500 } });
			expect(get(usernameStore)).toBe('TestUser');
			expect(get(dannyBucksStore)).toBe(500);
		});

		it('should update stores on "usernameFailure" message', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			mockWebSocketInstance?.simulateMessage({ type: 'usernameFailure', payload: { message: 'Name taken' } });
			expect(get(usernameStore)).toBeNull();
			expect(get(connectionError)).toBe('Name taken');
			expect(get(gameStateStore)).toBe('NeedsUsername');
		});

		it('should update stores on "playerListUpdate" message', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			const players = [{ username: 'P1' }];
			mockWebSocketInstance?.simulateMessage({ type: 'playerListUpdate', payload: { players } });
			expect(get(playersStore)).toEqual(players);
		});

		it('should update stores on "gameStateUpdate" message (Betting)', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			lastResultStore.set({ outcome: 'Win', amount: 10 }); // Pre-set state
			mockWebSocketInstance?.simulateMessage({ type: 'gameStateUpdate', payload: { state: 'Betting', dannyBucks: 990 } });
			expect(get(gameStateStore)).toBe('Betting');
			expect(get(dannyBucksStore)).toBe(990);
			expect(get(lastResultStore)).toBeNull(); // Check reset
		});

		it('should update stores on "dealHand" message', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			const hand = [{ rank: 'K', suit: 'C' }];
			mockWebSocketInstance?.simulateMessage({ type: 'dealHand', payload: { hand } });
			expect(get(myHandStore)).toEqual(hand);
		});

		it('should update stores on "dealerHandUpdate" message', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			const dealerData = { revealed: [], highHand: [], lowHand: [], isAceHighPaiGow: false };
			mockWebSocketInstance?.simulateMessage({ type: 'dealerHandUpdate', payload: { ...dealerData, nextState: 'PlayerTurn' } });
			expect(get(dealerHandStore)).toEqual(dealerData);
			expect(get(gameStateStore)).toBe('PlayerTurn');
		});

		it('should update stores on "roundResult" message', () => {
			dannyBucksStore.set(1000);
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			const resultData = { outcome: 'Loss', amount: -50 };
			mockWebSocketInstance?.simulateMessage({ type: 'roundResult', payload: { ...resultData, dannyBucks: 950, nextState: 'Betting' } });
			expect(get(lastResultStore)).toEqual(resultData);
			expect(get(dannyBucksStore)).toBe(950);
			expect(get(gameStateStore)).toBe('Betting');
		});

		it('should handle invalid JSON messages gracefully and set Error state', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			expect(get(connectionStatus)).toBe('open');
			// Simulate invalid message
			mockWebSocketInstance?.onmessage?.({ data: 'this is not json' });
			expect(get(connectionStatus)).toBe('error'); // Status changes via handler
			expect(get(connectionError)).toBe('Failed to parse incoming message.');
			expect(get(gameStateStore)).toBe('Error'); // Game state changes via subscription
		});

		it('should warn if connection already exists and is open', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn');
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			expect(get(connectionStatus)).toBe('open');

			connectWebSocket(testUrl); // Attempt second connection
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('WebSocket connection attempt ignored.'), // Check new warning message
			);
			expect(MockWebSocket.instances.length).toBe(1); // Still only one instance
		});
	});

	describe('sendWebSocketMessage', () => {
		it('should send message if connection is open', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			const message: WebSocketMessage = { type: 'action', payload: 'do something' };
			sendWebSocketMessage(message);
			expect(mockWebSocketInstance?.sentMessages.length).toBe(1); // Sent
			expect(mockWebSocketInstance?.sentMessages[0]).toBe(JSON.stringify(message));
		});

		it('should queue message if connection is connecting, then send on open', () => {
			connectWebSocket(testUrl);
			expect(get(connectionStatus)).toBe('connecting');
			const message: WebSocketMessage = { type: 'action', payload: 'connecting msg' };
			sendWebSocketMessage(message); // Should queue
			expect(mockWebSocketInstance?.sentMessages.length).toBe(0);

			mockWebSocketInstance?.simulateOpen(); // Open -> sends queue via sendWebSocketMessage
			expect(mockWebSocketInstance?.sentMessages.length).toBe(1); // Should be sent now
			expect(mockWebSocketInstance?.sentMessages[0]).toBe(JSON.stringify(message));
		});

		it('should queue message if called before connectWebSocket, then send on open', () => {
			const message: WebSocketMessage = { type: 'action', payload: 'early msg' };
			sendWebSocketMessage(message); // Queue before connect

			connectWebSocket(testUrl);
			expect(mockWebSocketInstance?.sentMessages.length).toBe(0);

			mockWebSocketInstance?.simulateOpen(); // Open -> sends queue via sendWebSocketMessage
			expect(mockWebSocketInstance?.sentMessages.length).toBe(1); // Should be sent now
			expect(mockWebSocketInstance?.sentMessages[0]).toBe(JSON.stringify(message));
		});

		it('should queue message if connection is closed, then send on next open', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			mockWebSocketInstance?.simulateServerClose(); // Close it
			expect(get(connectionStatus)).toBe('closed');

			const message: WebSocketMessage = { type: 'action', payload: 'late msg' };
			sendWebSocketMessage(message); // Should queue

			connectWebSocket(testUrl); // Reconnect
			expect(get(connectionStatus)).toBe('connecting');
			const newMockInstance = mockWebSocketInstance;
			expect(newMockInstance).not.toBeNull();
			expect(newMockInstance?.sentMessages.length).toBe(0);

			newMockInstance?.simulateOpen(); // Open -> sends queue via sendWebSocketMessage
			expect(newMockInstance?.sentMessages.length).toBe(1);
			expect(newMockInstance?.sentMessages[0]).toBe(JSON.stringify(message));
		});

		it('should report error if trying to send while in error state', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateError(); // Put in error state
			expect(get(connectionStatus)).toBe('error');

			const message: WebSocketMessage = { type: 'action', payload: 'error msg' };
			sendWebSocketMessage(message);

			expect(get(connectionError)).toBe('Cannot send message while status is error.');
			expect(mockWebSocketInstance).toBeNull(); // Instance should be cleared by error simulation
		});

		it('should trigger error state if send fails when open', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			expect(get(connectionStatus)).toBe('open');
			// Mock the send method to throw an error
			const sendSpy = vi.spyOn(mockWebSocketInstance!, 'send').mockImplementation(() => {
				throw new Error("Send failed");
			});

			const message: WebSocketMessage = { type: 'action', payload: 'fail send' };
			sendWebSocketMessage(message);

			expect(sendSpy).toHaveBeenCalled();
			expect(get(connectionStatus)).toBe('error'); // Should transition to error
			expect(get(connectionError)).toBe('Failed to send message.');
		});
	});

	describe('closeWebSocket', () => {
		it('should call close on the WebSocket instance if open and set status to closed', () => {
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			expect(get(connectionStatus)).toBe('open');
			const currentMock = mockWebSocketInstance;
			expect(currentMock).not.toBeNull();
			const closeSpy = vi.spyOn(currentMock!, 'close');

			closeWebSocket(); // Calls mock close synchronously now

			expect(closeSpy).toHaveBeenCalledWith(1000, 'Client initiated disconnect');
			// Mock close triggers service onclose, which sets status
			expect(get(connectionStatus)).toBe('closed');
			expect(get(gameStateStore)).toBe('Disconnected');
			expect(mockWebSocketInstance).toBeNull(); // Mock instance cleared by mock close
		});

		it('should set status to closed immediately if socket not open but connecting', () => {
			connectWebSocket(testUrl);
			expect(get(connectionStatus)).toBe('connecting');
			const currentMock = mockWebSocketInstance; // Capture instance

			closeWebSocket(); // Call close while connecting

			expect(get(connectionStatus)).toBe('closed'); // Should be forced closed by closeWebSocket
			expect(get(gameStateStore)).toBe('Disconnected'); // Updated by subscription
			expect(currentMock?.readyState).toBe(WebSocket.CONNECTING); // Mock socket wasn't told to close

			// Verify service's internal socket is null by attempting another connection
			MockWebSocket.mockClear(); // Clear previous instance tracking
			connectWebSocket(testUrl); // Should succeed
			expect(get(connectionStatus)).toBe('connecting');
			expect(MockWebSocket.instances.length).toBe(1); // New instance created
		});
it('should set status to closed immediately if socket is null', () => {
	connectionStatus.set('open'); // Set dummy state
	gameStateStore.set('PlayerAction'); // Use PlayerAction
	connectionError.set('some error');


			closeWebSocket(); // Call close when socket is null

			expect(get(connectionStatus)).toBe('closed');
			expect(get(gameStateStore)).toBe('Disconnected');
			expect(get(connectionError)).toBeNull(); // Error should be cleared
		});

		it('should clear message queue when closing', () => {
			sendWebSocketMessage({ type: 'queued', payload: 1 }); // Queue before connect
			connectWebSocket(testUrl); // Connects, queue remains
			expect(get(connectionStatus)).toBe('connecting');
			// Manually check internal queue state before close (if possible/needed)
			// For this test, we assume sendWebSocketMessage queued correctly

			closeWebSocket(); // Close while connecting

			expect(get(connectionStatus)).toBe('closed');
			// Verify queue is empty by connecting again and checking sent messages
			MockWebSocket.mockClear();
			connectWebSocket(testUrl);
			mockWebSocketInstance?.simulateOpen();
			expect(mockWebSocketInstance?.sentMessages.length).toBe(0); // No messages sent on open
		});
	});
});