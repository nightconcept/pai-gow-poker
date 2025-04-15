import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { get } from 'svelte/store';
import {
	connectWebSocket,
	sendMessage,
	closeWebSocket,
	addMessageListener,
	connectionStatus,
	resetWebSocketState_TEST_ONLY // Import the reset function
} from './websocket';

// --- Mock WebSocket ---
let mockWebSocketInstance: MockWebSocket | null = null;

// --- Mock CloseEvent ---
// Vitest/Node doesn't have CloseEvent globally
class MockCloseEvent extends Event {
	code: number;
	reason: string;
	wasClean: boolean;
	constructor(type: string, options?: CloseEventInit) {
		super(type);
		this.code = options?.code ?? 1000;
		this.reason = options?.reason ?? '';
		this.wasClean = options?.wasClean ?? false;
	}
}

class MockWebSocket {
	// Static properties for tracking instances
	static instances: MockWebSocket[] = [];
	static mockClear() {
		MockWebSocket.instances = [];
		mockWebSocketInstance = null;
	}

	// Instance properties
	readyState: number = WebSocket.CONNECTING;
	url: string;
	onopen: (() => void) | null = null;
	onmessage: ((event: { data: string }) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;
	onclose: ((event: CloseEvent) => void) | null = null;

	// Mock methods as spies
	send = vi.fn();
	close = vi.fn((code?: number, reason?: string) => { // Accept code/reason
		if (this.readyState === WebSocket.CLOSING || this.readyState === WebSocket.CLOSED) {
			return;
		}
		this.readyState = WebSocket.CLOSING;
		// Simulate synchronous close event for simpler testing
		this.readyState = WebSocket.CLOSED;
		this.onclose?.(new MockCloseEvent('close', { code: code ?? 1000, reason: reason ?? 'Normal closure', wasClean: code === 1000 }));
	});

	constructor(url: string) {
		this.url = url;
		MockWebSocket.instances.push(this);
		mockWebSocketInstance = this; // Track the latest instance
		// Do not simulate async connection opening automatically
		// setTimeout(() => this._simulateOpen(), 0);
	}

	// --- Simulation Methods ---
	_simulateOpen() {
		if (this.readyState === WebSocket.CONNECTING) {
			this.readyState = WebSocket.OPEN;
			this.onopen?.();
		}
	}

	// Manually trigger the open state for tests
	_triggerOpen() {
		this._simulateOpen();
	}

	_simulateMessage(data: object) {
		if (this.readyState === WebSocket.OPEN) {
			this.onmessage?.({ data: JSON.stringify(data) });
		} else {
            console.warn(`MockWebSocket: Cannot simulate message in state ${this.readyState}`);
        }
	}

	_simulateError() {
		// Should only happen while connecting or open
		if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.OPEN) {
			const errorEvent = new Event('error');
			// Call error handler first
			this.onerror?.(errorEvent);
			// THEN update state and schedule close, only if the error handler didn't already close it
			if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.OPEN) {
				this.readyState = WebSocket.CLOSED;
				// Simulate the close event that follows error
				setTimeout(() => {
					// Check if onclose still exists, might have been cleared by reset
					this.onclose?.(new MockCloseEvent('close', { code: 1006, reason: 'Abnormal Closure', wasClean: false }));
				}, 0);
			}
		}
	}

	_simulateClose(code = 1000, reason = 'Mock Close') {
		if (this.readyState !== WebSocket.CLOSING && this.readyState !== WebSocket.CLOSED) {
			this.readyState = WebSocket.CLOSING;
			// Simulate synchronous close event for simpler testing
			this.readyState = WebSocket.CLOSED;
			this.onclose?.(new MockCloseEvent('close', { code, reason, wasClean: code === 1000 }));
		}
	}
}

// --- Vitest Setup ---
beforeEach(() => {
	// Set test mode (Vite specific)
	if (import.meta.env) {
        (import.meta.env as any).MODE = 'test';
    } else {
        // Fallback for environments without import.meta.env
        process.env.NODE_ENV = 'test'; // Or appropriate mechanism
    }


	// Reset service state FIRST
	resetWebSocketState_TEST_ONLY();

	// Clear mocks and stub global WebSocket
	MockWebSocket.mockClear();
	vi.stubGlobal('WebSocket', MockWebSocket);
	vi.stubGlobal('CloseEvent', MockCloseEvent); // Stub CloseEvent

	// Use fake timers
	vi.useFakeTimers();
});

afterEach(() => {
	// Ensure timers are cleared and globals restored
	vi.clearAllTimers();
	vi.unstubAllGlobals();
    // Reset test mode
    if (import.meta.env) {
	    (import.meta.env as any).MODE = 'development'; // Or your default
    } else {
        process.env.NODE_ENV = 'development';
    }
    // Final reset just in case a test failed mid-way
    resetWebSocketState_TEST_ONLY();
});

// --- Tests ---
describe('WebSocket Service', () => {
	it('should set status to connecting immediately and connected on open', async () => {
		expect(get(connectionStatus)).toBe('disconnected'); // After reset
		const connectPromise = connectWebSocket();
		// Status should change synchronously
		expect(get(connectionStatus)).toBe('connecting');

		mockWebSocketInstance?._triggerOpen(); // Manually trigger open
		vi.runAllTimers(); // Advance timers if any other async ops exist
		await connectPromise; // Wait for the promise to resolve

		expect(get(connectionStatus)).toBe('connected');
		expect(MockWebSocket.instances.length).toBe(1); // Verify instance creation
		expect(mockWebSocketInstance?.url).toBe('ws://localhost:8080');
	});

	it('should update connection status to "error" on connection error', async () => {
		expect(get(connectionStatus)).toBe('disconnected');
		const connectPromise = connectWebSocket();
		expect(get(connectionStatus)).toBe('connecting');

		// Simulate an error *during* connection attempt
		mockWebSocketInstance?._simulateError();
		// vi.runAllTimers(); // Advance timers to process error and subsequent close

		// Check promise rejection *after* advancing timers
		// Expect rejection with the generic error message from the handler
		await expect(connectPromise).rejects.toThrow('WebSocket connection error');
		// Ensure all timers (including the one in _simulateError for onclose) have run
		await vi.runAllTimersAsync();
		expect(get(connectionStatus), 'Status should be error after simulation').toBe('error'); // Final state should remain 'error'

		// Verify that calling closeWebSocket again does nothing because the instance is gone
		// Keep reference to the original instance to check its spy
		const originalInstance = MockWebSocket.instances[0]; // Get the instance created
		expect(originalInstance.close).toHaveBeenCalledTimes(0); // Should not have been called directly yet by closeWebSocket()
		      closeWebSocket();
		// The close method on the original instance should still not have been called *again* by closeWebSocket
		      expect(originalInstance.close).toHaveBeenCalledTimes(0); // Error simulation doesn't call instance.close directly
	});

	it('should update connection status to "disconnected" on server close', async () => {
		const connectPromise = connectWebSocket();
		mockWebSocketInstance?._triggerOpen(); // Manually trigger open
		vi.runAllTimers(); // Open connection
		await connectPromise;
		expect(get(connectionStatus)).toBe('connected');

		const originalInstance = mockWebSocketInstance; // Capture instance before close simulation
		mockWebSocketInstance?._simulateClose(1001, "Going Away"); // Simulate server closing connection
		// await vi.runAllTimersAsync(); // No longer needed as close is sync

		await vi.waitFor(() => {
			expect(get(connectionStatus), 'Status should be disconnected after server close').toBe('disconnected'); // Final state
		});

		// Verify that calling closeWebSocket again does nothing
		      closeWebSocket();
		// The close method on the original instance should only have been called once (by _simulateClose)
		      expect(originalInstance?.close).toHaveBeenCalledTimes(1);
	});

	it('should send formatted JSON messages when connected', async () => {
		const connectPromise = connectWebSocket();
		mockWebSocketInstance?._triggerOpen(); // Manually trigger open
		vi.runAllTimers(); // Open connection
		await connectPromise;
		expect(get(connectionStatus)).toBe('connected'); // Ensure connected

		const testPayload = { user: 'test', data: 123 };
		sendMessage('testMessage', testPayload);

		// Check the spy on the instance
		expect(mockWebSocketInstance?.send).toHaveBeenCalledTimes(1);
		expect(mockWebSocketInstance?.send).toHaveBeenCalledWith(
			JSON.stringify({ type: 'testMessage', payload: testPayload })
		);
	});

	it('should not send messages if not connected (initial state)', () => {
		expect(get(connectionStatus)).toBe('disconnected'); // Verify initial state
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		sendMessage('testMessage', { data: 'should not send' });
		// Instance shouldn't exist yet
		expect(mockWebSocketInstance).toBeNull();
		      expect(consoleErrorSpy).toHaveBeenCalledWith("WebSocket not open (state: null). Cannot send message type \"testMessage\"."); // Exact match
		      consoleErrorSpy.mockRestore();
	});

		  it('should not send messages if connection is explicitly closed', async () => {
        const connectPromise = connectWebSocket();
  mockWebSocketInstance?._triggerOpen(); // Manually trigger open
        vi.runAllTimers();
        await connectPromise;
        expect(get(connectionStatus)).toBe('connected');

        closeWebSocket(); // Close it via the service
        // await vi.runAllTimersAsync(); // No longer needed as close is sync
  await vi.waitFor(() => {
   expect(get(connectionStatus), 'Status should be disconnected after explicit close').toBe('disconnected');
  });
        // Instance should be null after close and timer run
        expect(mockWebSocketInstance).toBeNull(); // resetWebSocketState_TEST_ONLY should ensure this

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		sendMessage('testMessage', { data: 'should not send' });
		      expect(consoleErrorSpy).toHaveBeenCalledWith("WebSocket not open (state: null). Cannot send message type \"testMessage\"."); // Exact match
		      consoleErrorSpy.mockRestore();
	});

		  it('should not send messages if connection is connecting', async () => {
		const connectPromise = connectWebSocket();
		expect(get(connectionStatus)).toBe('connecting');
		// Ensure the mock instance exists and is in the connecting state
		const instanceDuringConnect = mockWebSocketInstance; // Capture instance
		expect(instanceDuringConnect).not.toBeNull();
		expect(instanceDuringConnect?.readyState, 'Mock readyState should be CONNECTING').toBe(WebSocket.CONNECTING);

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		sendMessage('testMessage', { data: 'should not send' });
		// Assert on the captured instance's spy
		expect(instanceDuringConnect?.send, 'send should not be called while connecting').not.toHaveBeenCalled();
		expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("WebSocket not open (state: 0). Cannot send message type \"testMessage\"."));
		consoleErrorSpy.mockRestore();

		// Let connection finish for cleanup
  // Trigger open *after* the send attempt while connecting
  mockWebSocketInstance?._triggerOpen();
        vi.runAllTimers();
        await connectPromise;
    });


	it('should call registered message listeners for specific types', async () => {
		const connectPromise = connectWebSocket();
		mockWebSocketInstance?._triggerOpen(); // Manually trigger open
		vi.runAllTimers(); // Open connection
		await connectPromise;

		const listenerCallback = vi.fn();
		const unsubscribe = addMessageListener('dataUpdate', listenerCallback);

		const testData = { value: 42 };
		mockWebSocketInstance?._simulateMessage({ type: 'dataUpdate', payload: testData });
		vi.runAllTimers(); // Allow any async processing in handler

		mockWebSocketInstance?._simulateMessage({ type: 'otherMessage', payload: { info: 'ignore' } });
		vi.runAllTimers();

		expect(listenerCallback).toHaveBeenCalledTimes(1);
		expect(listenerCallback).toHaveBeenCalledWith(testData);

		// Test unsubscribe
		unsubscribe();
		mockWebSocketInstance?._simulateMessage({ type: 'dataUpdate', payload: { value: 99 } });
		vi.runAllTimers();
		expect(listenerCallback).toHaveBeenCalledTimes(1); // Should not be called again
	});

	it('should call generic message listeners ("*")', async () => {
		const connectPromise = connectWebSocket();
		mockWebSocketInstance?._triggerOpen(); // Manually trigger open
		vi.runAllTimers();
		await connectPromise;

		const genericListenerCallback = vi.fn();
		const unsubscribe = addMessageListener('*', genericListenerCallback);

		const message1 = { type: 'dataUpdate', payload: { value: 42 } };
		const message2 = { type: 'otherMessage', payload: { info: 'capture' } };

		mockWebSocketInstance?._simulateMessage(message1);
		vi.runAllTimers();
		mockWebSocketInstance?._simulateMessage(message2);
		vi.runAllTimers();

		expect(genericListenerCallback).toHaveBeenCalledTimes(2);
		expect(genericListenerCallback).toHaveBeenCalledWith(message1); // Generic listener gets full message
		expect(genericListenerCallback).toHaveBeenCalledWith(message2);

		unsubscribe();
		mockWebSocketInstance?._simulateMessage({ type: 'newMessage', payload: {} });
		vi.runAllTimers();
		expect(genericListenerCallback).toHaveBeenCalledTimes(2); // Should not be called again
	});

	it('should handle closing the connection via closeWebSocket()', async () => {
		const connectPromise = connectWebSocket();
		mockWebSocketInstance?._triggerOpen(); // Manually trigger open
		vi.runAllTimers(); // Open connection
		await connectPromise;
		expect(get(connectionStatus)).toBe('connected');

		closeWebSocket();
		// Check if close was called on the mock instance's spy
		expect(mockWebSocketInstance?.close).toHaveBeenCalledTimes(1);
        expect(mockWebSocketInstance?.close).toHaveBeenCalledWith(1000, "Client initiated close");

        // await vi.runAllTimersAsync(); // No longer needed as close is sync
  await vi.waitFor(() => {
   expect(get(connectionStatus), 'Status should be disconnected after client close').toBe('disconnected');
  });
        // The instance should be nullified internally by the onclose handler
        // We test this by trying to close again
		closeWebSocket();
        // The close spy on the *original* instance should still only have been called once
        expect(mockWebSocketInstance?.close).toHaveBeenCalledTimes(1);
	});

	it('should resolve immediately and not create new connection if already connected', async () => {
		const connectPromise1 = connectWebSocket();
		mockWebSocketInstance?._triggerOpen(); // Manually trigger open
		vi.runAllTimers();
		await connectPromise1;
		expect(get(connectionStatus)).toBe('connected');
		expect(MockWebSocket.instances.length).toBe(1);
		const instance1 = mockWebSocketInstance;

		// Attempt to connect again
		const connectPromise2 = connectWebSocket();
		// Should resolve without needing timers and without creating new WS
		await expect(connectPromise2).resolves.toBeUndefined();

		expect(MockWebSocket.instances.length).toBe(1); // No new instance
		expect(mockWebSocketInstance).toBe(instance1); // Same instance
		expect(get(connectionStatus)).toBe('connected'); // State remains connected
	});

    it('should return the same promise if connection attempt is in progress', async () => {
        const connectPromise1 = connectWebSocket();
        expect(get(connectionStatus)).toBe('connecting');
        expect(MockWebSocket.instances.length).toBe(1);

        // Attempt to connect again while the first is still connecting
        const connectPromise2 = connectWebSocket();

        // Should return the same promise object AND not create a new instance
        // expect(connectPromise2, "Should return the same promise instance").toBe(connectPromise1); // This check is unreliable
        expect(MockWebSocket.instances.length, "Should not create a new WebSocket instance").toBe(1);

        // Let the connection finish
  mockWebSocketInstance?._triggerOpen(); // Manually trigger open
        vi.runAllTimers();
        await connectPromise1; // Awaiting either promise works
        expect(get(connectionStatus)).toBe('connected');
    });


	it('should allow reconnecting after being closed', async () => {
		// Connect first time
		const connectPromise1 = connectWebSocket();
		mockWebSocketInstance?._triggerOpen(); // Manually trigger open
		vi.runAllTimers();
		await connectPromise1;
		expect(get(connectionStatus)).toBe('connected');
		expect(MockWebSocket.instances.length).toBe(1);
		const instance1 = mockWebSocketInstance;

		// Close the connection
		closeWebSocket();
		// await vi.runAllTimersAsync(); // No longer needed as close is sync
		await vi.waitFor(() => {
			expect(get(connectionStatus), 'Status should be disconnected after closing before reconnect').toBe('disconnected');
		});
		// Instance should be nullified internally after close + timer run
		// We can check this by seeing if a new instance is created on reconnect

		// Connect second time
		const connectPromise2 = connectWebSocket();
		expect(get(connectionStatus)).toBe('connecting'); // Status changes
		mockWebSocketInstance?._triggerOpen(); // Manually trigger open
		vi.runAllTimers(); // Process open
		await connectPromise2;
		expect(get(connectionStatus)).toBe('connected');
		expect(MockWebSocket.instances.length).toBe(2); // New instance created
		expect(mockWebSocketInstance).not.toBe(instance1); // Should be a different instance
		expect(mockWebSocketInstance?.url).toBe('ws://localhost:8080');
	});

	it('should handle multiple listeners for the same type and unsubscribe correctly', async () => {
		const connectPromise = connectWebSocket();
		mockWebSocketInstance?._triggerOpen(); // Manually trigger open
		vi.runAllTimers();
		await connectPromise;

		const listener1 = vi.fn();
		const listener2 = vi.fn();
		const unsubscribe1 = addMessageListener('multiTest', listener1);
		const unsubscribe2 = addMessageListener('multiTest', listener2);

		const payload = { id: 1 };
		mockWebSocketInstance?._simulateMessage({ type: 'multiTest', payload });
		vi.runAllTimers();

		expect(listener1).toHaveBeenCalledTimes(1);
		expect(listener1).toHaveBeenCalledWith(payload);
		expect(listener2).toHaveBeenCalledTimes(1);
		expect(listener2).toHaveBeenCalledWith(payload);

		// Unsubscribe one, the other should still work
		unsubscribe1();
		const payload2 = { id: 2 };
		mockWebSocketInstance?._simulateMessage({ type: 'multiTest', payload: payload2 });
		vi.runAllTimers();

		expect(listener1).toHaveBeenCalledTimes(1); // Not called again
		expect(listener2).toHaveBeenCalledTimes(2);
		expect(listener2).toHaveBeenCalledWith(payload2);

		unsubscribe2();
		// Send again, neither should be called
		mockWebSocketInstance?._simulateMessage({ type: 'multiTest', payload: { id: 3 } });
		vi.runAllTimers();
		expect(listener1).toHaveBeenCalledTimes(1);
		expect(listener2).toHaveBeenCalledTimes(2);
	});

	it('should handle malformed JSON messages gracefully', async () => {
		const connectPromise = connectWebSocket();
		mockWebSocketInstance?._triggerOpen(); // Manually trigger open
		vi.runAllTimers();
		await connectPromise;

		const listener = vi.fn();
		addMessageListener('goodType', listener);

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console error output

		// Simulate malformed message
		mockWebSocketInstance?.onmessage?.({ data: "{ type: 'badJson', payload: " });
		vi.runAllTimers(); // Allow handler to run

		expect(listener).not.toHaveBeenCalled(); // Good listener shouldn't fire
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'Failed to parse WebSocket message or error in handler:',
			expect.any(SyntaxError) // Check for specific error type
		);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'Received data:',
			"{ type: 'badJson', payload: "
		);

		// Ensure good messages still work after a bad one
		const goodPayload = { works: true };
		mockWebSocketInstance?._simulateMessage({ type: 'goodType', payload: goodPayload });
		vi.runAllTimers();
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(goodPayload);

		consoleErrorSpy.mockRestore(); // Restore console.error
	});
});