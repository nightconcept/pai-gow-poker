<script lang="ts">
	// Removed onMount import, kept onDestroy for unsubscribing
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	// CardComponent is now used within child components
	// import CardComponent from '$lib/components/Card.svelte';
	import TopBar from '$lib/components/TopBar.svelte'; // Added
	import DealerArea from '$lib/components/DealerArea.svelte'; // Added
	import PlayerArea from '$lib/components/PlayerArea.svelte'; // Added
	import OtherPlayersArea from '$lib/components/OtherPlayersArea.svelte'; // Added
	import {
		usernameStore,
		gameStateStore,
		// playersStore, // Used in OtherPlayersArea
		// dannyBucksStore, // Used in TopBar
		// dealerHandStore, // Used in DealerArea & PlayerArea
		// myHandStore, // Used in PlayerArea
		type GameState,
		// type PlayerInfo, // Used in OtherPlayersArea
		// type DealerHand, // Used in DealerArea
		// type Card, // Used in PlayerArea & DealerArea
		// lastResultStore, // Used in PlayerArea
		// type RoundResult, // Used in PlayerArea
	} from '$lib/stores/game';
	import {
		connectWebSocket, // Keep for reconnect buttons
		sendWebSocketMessage,
		// closeWebSocket, // Removed as connection persists with layout
		connectionStatus,
		connectionError,
		type ConnectionStatus
	 } from '$lib/services/websocket';

	// WEBSOCKET_URL removed, handled in layout

	// --- Local State ---
	let enteredUsername = '';
	let localError: string | null = null; // For form validation errors
	// selectedLowHandIndices moved to PlayerArea.svelte
	// handSettingError moved to PlayerArea.svelte
	
	// --- Reactive Subscriptions ---
	let currentUsername: string | null = null;
	// let currentGameState: GameState = 'Connecting'; // Removed for auto-subscription
	let currentConnectionStatus: ConnectionStatus = 'closed'; // Initial state
	let currentConnectionError: string | null = null;
	// currentPlayers subscription moved (implicitly via OtherPlayersArea)
	// currentDannyBucks subscription moved (implicitly via TopBar)
	// currentDealerHand subscription moved (implicitly via DealerArea/PlayerArea)
	// currentMyHand subscription moved (implicitly via PlayerArea)
	// currentLastResult subscription moved (implicitly via PlayerArea)
	
	const unsubscribeUsername = usernameStore.subscribe((value) => {
		currentUsername = value;
	});
	// const unsubscribeGameState = gameStateStore.subscribe((value) => { // Removed
	// 	currentGameState = value; // Removed
	// 	// Clear local form error when game state changes significantly // Removed
	// 	if (value !== 'NeedsUsername') { // Removed
	// 		localError = null; // Removed
	// 	} // Removed
	// }); // Removed
	const unsubscribeConnectionStatus = connectionStatus.subscribe((value) => {
		currentConnectionStatus = value;
	});
	const unsubscribeConnectionError = connectionError.subscribe((value) => {
		currentConnectionError = value;
		// If a connection error occurs while trying to set username, show it
		// Use get() here as we don't have the reactive variable anymore
		if (get(gameStateStore) === 'NeedsUsername' && value) {
			localError = value;
		}
	});
	// unsubscribePlayers removed
	// unsubscribeDannyBucks removed
	// unsubscribeDealerHand removed
	// unsubscribeMyHand removed
	// unsubscribeLastResult removed
	
	// --- Lifecycle ---
	// onMount connection logic removed, handled in layout
	// onDestroy connection closing removed, handled by browser tab closure or explicit disconnect button (future)

	// Unsubscribe logic should still run if component is destroyed for other reasons
	onDestroy(() => {
		console.log('Page destroying. Unsubscribing from stores.');
		unsubscribeUsername();
		// unsubscribeGameState(); // Removed
		unsubscribeConnectionStatus();
		unsubscribeConnectionError();
		// unsubscribePlayers removed
		// unsubscribeDannyBucks removed
		// unsubscribeDealerHand removed
		// unsubscribeMyHand removed
		// unsubscribeLastResult removed
	});
	
	
	// --- Event Handlers ---
	function handleUsernameSubmit() {
		localError = null; // Clear previous local errors
		connectionError.set(null); // Clear previous connection errors

		const trimmedUsername = enteredUsername.trim();
		if (!trimmedUsername) {
			localError = 'Username cannot be empty.';
			return;
		}

		if (currentConnectionStatus !== 'open') {
			localError = 'Not connected to server. Please wait or try refreshing.';
			return;
		}

		console.log('Submitting username:', trimmedUsername);
		sendWebSocketMessage({
			type: 'setUsername',
			payload: { username: trimmedUsername }
		});
	}

	function handleReconnect() {
		console.log('Reconnect button clicked.');
		// The URL should be handled within the connectWebSocket function now
		connectWebSocket();
	}
	
	// --- Event Handlers moved to PlayerArea.svelte ---
	// handlePlaceBetClick
	// handleTempStartGame
	// handleCardClick
	// handleConfirmHand
	// handleNextRoundClick
	
	// --- Helper Functions (Removed renderCard and renderHand) ---
	
	// --- Reactive Logging ---
	$: { // Log whenever the store value changes as seen by the component
		console.log('COMPONENT sees $gameStateStore change:', $gameStateStore);
	}

	// --- Reactive Computations moved to PlayerArea.svelte ---
	// isHandSettingEnabled
	// isHandSettingValid
	// Logic to clear selection
</script>
	
<main class="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
	<h1 class="text-2xl font-bold mb-4 text-center">Pai Gow Poker</h1>

	{#if currentUsername}
		<!-- === Main Game View === -->
		<div class="w-full max-w-[960px] p-4 border rounded bg-green-100 shadow-lg">
			<!-- Use TopBar component -->
			<TopBar />
	
			<!-- === Game Table Layout === -->
			<div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Use DealerArea component -->
				<DealerArea />
	
				<!-- Use PlayerArea component -->
				<PlayerArea />
	
				<!-- Use OtherPlayersArea component -->
				<OtherPlayersArea />
			</div>
		</div>
	{:else}
		<!-- === Username Input / Connection Status === -->
		<div class="w-full max-w-md p-6 border rounded shadow-md bg-white">
			<h2 class="text-xl font-semibold mb-4 text-center">Join Game</h2>

			<!-- Connection Status Display -->
			<div class="mb-4 p-2 rounded text-center
				{currentConnectionStatus === 'open' ? 'bg-green-200 text-green-800' : ''}
				{currentConnectionStatus === 'connecting' ? 'bg-yellow-200 text-yellow-800' : ''}
				{currentConnectionStatus === 'closed' ? 'bg-gray-200 text-gray-800' : ''}
				{currentConnectionStatus === 'error' ? 'bg-red-200 text-red-800' : ''}"
			>
				{#if currentConnectionStatus === 'open' && $gameStateStore === 'NeedsUsername'} <!-- Use $gameStateStore -->
					Connected! Please enter a username.
				{:else if currentConnectionStatus === 'open'}
					Connected (State: {$gameStateStore}) <!-- Use $gameStateStore --> <!-- Should not happen if username not set -->
				{:else if currentConnectionStatus === 'connecting'}
					Connecting to server...
				{:else if currentConnectionStatus === 'closed'}
					Disconnected from server. <button class="text-blue-600 underline hover:text-blue-800" on:click={handleReconnect}>Reconnect?</button>
				{:else if currentConnectionStatus === 'error'}
					Connection Error. <button class="text-blue-600 underline hover:text-blue-800" on:click={handleReconnect}>Retry?</button>
				{/if}
			</div>

			<!-- Username Form (Show only if connected and needs username) -->
			{#if currentConnectionStatus === 'open' && $gameStateStore === 'NeedsUsername'} <!-- Use $gameStateStore -->
				<form on:submit|preventDefault={handleUsernameSubmit}>
					<div class="mb-4">
						<label for="username" class="block text-sm font-medium text-gray-700 mb-1">
							Choose a Username:
						</label>
						<input
							type="text"
							id="username"
							bind:value={enteredUsername}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							placeholder="e.g., PlayerOne"
							required
							maxlength="20"
							aria-describedby="username-error"
						/>
					</div>

					{#if localError || currentConnectionError}
						<p id="username-error" class="text-sm text-red-600 mb-3" role="alert">
							{localError || currentConnectionError}
						</p>
					{/if}

					<button
						type="submit"
						class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
						disabled={!enteredUsername.trim() || currentConnectionStatus !== 'open'}
					>
						Join Game
					</button>
				</form>
			{:else if currentConnectionStatus !== 'open' && currentConnectionStatus !== 'connecting'}
				<p class="text-center text-gray-600">
					Cannot join game until connected to the server.
				</p>
			{/if}
		</div>
	{/if}
</main>
