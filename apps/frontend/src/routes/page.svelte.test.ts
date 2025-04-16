import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { type Writable, writable, get } from 'svelte/store'; // Import get
import type { SvelteComponent } from 'svelte'; // Import SvelteComponent type

// Import types directly for use in mocks
import type {
	GameState,
	PlayerInfo,
	Card,
	DealerHand,
	RoundResult
} from '$lib/stores/game';
import type { ConnectionStatus } from '$lib/services/websocket';

// --- Mock Stores ---
// Create mock stores outside the vi.mock factory to ensure types are resolved correctly
const mockUsernameStore = writable<string | null>(null);
const mockGameStateStore = writable<GameState>('Connecting');
const mockPlayersStore = writable<PlayerInfo[]>([]);
const mockDannyBucksStore = writable<number>(0);
const mockMyHandStore = writable<Card[] | null>(null);
const mockDealerHandStore = writable<DealerHand | null>(null);
const mockLastResultStore = writable<RoundResult | null>(null);
const mockConnectionStatusStore = writable<ConnectionStatus>('closed');
const mockConnectionErrorStore = writable<string | null>(null);

// --- Mock Modules ---
vi.mock('$lib/stores/game', async () => {
	return {
		usernameStore: mockUsernameStore,
		gameStateStore: mockGameStateStore,
		playersStore: mockPlayersStore,
		dannyBucksStore: mockDannyBucksStore,
		myHandStore: mockMyHandStore,
		dealerHandStore: mockDealerHandStore,
		lastResultStore: mockLastResultStore,
	};
});

vi.mock('$lib/services/websocket', async () => {
	return {
		connectWebSocket: vi.fn(),
		sendWebSocketMessage: vi.fn(),
		closeWebSocket: vi.fn(),
		connectionStatus: mockConnectionStatusStore,
		connectionError: mockConnectionErrorStore,
	};
});


// Import the component *after* mocks are set up
import Page from './+page.svelte';
// Import the *mocked* stores and functions
import { usernameStore, gameStateStore } from '$lib/stores/game';
import {
	connectWebSocket,
	sendWebSocketMessage,
	closeWebSocket,
	connectionStatus,
	connectionError
} from '$lib/services/websocket';


// Helper to reset stores between tests
async function resetStores() {
	// Reset stores using the imported mocked versions
	usernameStore.set(null);
	gameStateStore.set('Connecting');
	connectionStatus.set('closed');
	connectionError.set(null);
	mockPlayersStore.set([]);
	mockDannyBucksStore.set(0);
	mockMyHandStore.set(null);
	mockDealerHandStore.set(null);
	mockLastResultStore.set(null);


	// Reset mocks for functions
	vi.clearAllMocks();

	// Re-apply default implementation for connectWebSocket for most tests
	vi.mocked(connectWebSocket).mockImplementation(() => {
		connectionStatus.set('connecting');
		setTimeout(() => {
			connectionStatus.update(current => current === 'connecting' ? 'open' : current);
			if (get(connectionStatus) === 'open') {
				gameStateStore.set('NeedsUsername');
			}
		}, 10);
	});
}

describe('+page.svelte', () => {
	beforeEach(async () => {
		await resetStores();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// --- Tests ---

	it('renders connecting state initially and attempts connection', () => {
		connectionStatus.set('closed');
		gameStateStore.set('Connecting');
		vi.clearAllMocks();

		// Cast Page to Component type for render
		render(Page as typeof SvelteComponent);

		expect(screen.getByText(/Connecting to server.../i)).toBeInTheDocument();
		expect(connectWebSocket).toHaveBeenCalledTimes(1);
		expect(connectWebSocket).toHaveBeenCalledWith('ws://localhost:8080');
	});

	it('renders disconnected state and allows reconnect', async () => {
		connectionStatus.set('closed');
		render(Page as typeof SvelteComponent);

		expect(screen.getByText(/Disconnected from server./i)).toBeInTheDocument();
		const reconnectButton = screen.getByRole('button', { name: /Reconnect?/i });
		expect(reconnectButton).toBeInTheDocument();

		vi.clearAllMocks();
		vi.mocked(connectWebSocket).mockImplementationOnce(() => {
			connectionStatus.set('connecting');
		});

		await fireEvent.click(reconnectButton);
		expect(connectWebSocket).toHaveBeenCalledTimes(1);
		await vi.dynamicImportSettled();
		expect(screen.getByText(/Connecting to server.../i)).toBeInTheDocument();
	});

	it('renders error state and allows retry', async () => {
		connectionStatus.set('error');
		connectionError.set('Something went wrong');
		render(Page as typeof SvelteComponent);

		expect(screen.getByText(/Connection Error./i)).toBeInTheDocument();
		const retryButton = screen.getByRole('button', { name: /Retry?/i });
		expect(retryButton).toBeInTheDocument();

		vi.clearAllMocks();
		vi.mocked(connectWebSocket).mockImplementationOnce(() => {
			connectionStatus.set('connecting');
		});

		await fireEvent.click(retryButton);
		expect(connectWebSocket).toHaveBeenCalledTimes(1);
		await vi.dynamicImportSettled();
		expect(screen.getByText(/Connecting to server.../i)).toBeInTheDocument();
	});


	it('shows username form when connected and needs username', async () => {
		render(Page as typeof SvelteComponent);
		await vi.dynamicImportSettled();
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(get(connectionStatus)).toBe('open');
		expect(get(gameStateStore)).toBe('NeedsUsername');

		expect(screen.getByText(/Connected! Please enter a username./i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Choose a Username:/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Join Game/i })).toBeInTheDocument();
	});

	it('does not call connectWebSocket if already connecting or open on mount', () => {
		connectionStatus.set('connecting');
		render(Page as typeof SvelteComponent);
		expect(connectWebSocket).not.toHaveBeenCalled();

		cleanup();
		connectionStatus.set('open');
		render(Page as typeof SvelteComponent);
		expect(connectWebSocket).not.toHaveBeenCalled();
	});

	it('calls closeWebSocket on destroy', () => {
		const { unmount } = render(Page as typeof SvelteComponent);
		unmount();
		expect(closeWebSocket).toHaveBeenCalledTimes(1);
	});

	describe('Username Form Interaction', () => {
		beforeEach(async () => {
			await resetStores();
			render(Page as typeof SvelteComponent);
			await vi.dynamicImportSettled();
			await new Promise(resolve => setTimeout(resolve, 50));
			expect(screen.getByLabelText(/Choose a Username:/i)).toBeInTheDocument();
		});

		it('requires username input', async () => {
			const submitButton = screen.getByRole('button', { name: /Join Game/i });
			const usernameInput = screen.getByLabelText(/Choose a Username:/i);

			await fireEvent.input(usernameInput, { target: { value: '   ' } });
			expect(submitButton).toBeDisabled();

			await fireEvent.input(usernameInput, { target: { value: '' } });
			expect(submitButton).toBeDisabled();

			await fireEvent.click(submitButton);
			expect(sendWebSocketMessage).not.toHaveBeenCalled();
			expect(screen.getByText(/Username cannot be empty./i)).toBeInTheDocument();
		});

		it('enables submit button when username is entered', async () => {
			const submitButton = screen.getByRole('button', { name: /Join Game/i });
			const usernameInput = screen.getByLabelText(/Choose a Username:/i);

			expect(submitButton).toBeDisabled();
			await fireEvent.input(usernameInput, { target: { value: 'TestUser' } });
			expect(submitButton).toBeEnabled();
		});

		it('sends setUsername message on valid submission', async () => {
			const usernameInput = screen.getByLabelText(/Choose a Username:/i);
			const submitButton = screen.getByRole('button', { name: /Join Game/i });

			await fireEvent.input(usernameInput, { target: { value: ' ValidUser ' } });
			await fireEvent.click(submitButton);

			expect(sendWebSocketMessage).toHaveBeenCalledTimes(1);
			expect(sendWebSocketMessage).toHaveBeenCalledWith({
				type: 'setUsername',
				payload: { username: 'ValidUser' }
			});
		});

		it('displays connection error if submission fails due to connection issue', async () => {
			connectionStatus.set('closed');
			const usernameInput = screen.getByLabelText(/Choose a Username:/i);
			const submitButton = screen.getByRole('button', { name: /Join Game/i });

			await fireEvent.input(usernameInput, { target: { value: 'TestUser' } });
			await fireEvent.click(submitButton);

			expect(sendWebSocketMessage).not.toHaveBeenCalled();
			expect(screen.getByText(/Not connected to server/i)).toBeInTheDocument();
		});

		it('displays backend error message if username is taken', async () => {
			vi.mocked(sendWebSocketMessage).mockImplementationOnce(() => {
				connectionError.set('Username is already taken.');
				gameStateStore.set('NeedsUsername');
			});

			const usernameInput = screen.getByLabelText(/Choose a Username:/i);
			const submitButton = screen.getByRole('button', { name: /Join Game/i });

			await fireEvent.input(usernameInput, { target: { value: 'TakenUser' } });
			await fireEvent.click(submitButton);

			expect(sendWebSocketMessage).toHaveBeenCalledTimes(1);
			await vi.dynamicImportSettled();
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(screen.getByText(/Username is already taken./i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Choose a Username:/i)).toBeInTheDocument();
		});

		it('clears local error when game state changes away from NeedsUsername', async () => {
			const usernameInput = screen.getByLabelText(/Choose a Username:/i);
			const submitButton = screen.getByRole('button', { name: /Join Game/i });

			await fireEvent.click(submitButton); // Submit empty
			expect(screen.getByText(/Username cannot be empty./i)).toBeInTheDocument();

			connectionStatus.set('closed'); // Change state
			await vi.dynamicImportSettled();
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(screen.queryByText(/Username cannot be empty./i)).not.toBeInTheDocument();
		});
	});

	it('renders main game view placeholder when username is set', async () => {
		usernameStore.set('ExistingUser');
		gameStateStore.set('Betting');
		connectionStatus.set('open');

		render(Page as typeof SvelteComponent);

		expect(screen.getByText(/Welcome, ExistingUser!/i)).toBeInTheDocument();
		expect(screen.getByText(/Current Game State:/i)).toBeInTheDocument();
		expect(screen.getByText(/Betting/i)).toBeInTheDocument();
		expect(screen.getByText(/Game Area Placeholder/i)).toBeInTheDocument();

		expect(screen.queryByLabelText(/Choose a Username:/i)).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Join Game/i })).not.toBeInTheDocument();
	});
});
