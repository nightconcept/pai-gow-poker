<script lang="ts">
	// Removed onMount import, kept onDestroy for unsubscribing
	import { onDestroy } from 'svelte';
	import {
		usernameStore,
		gameStateStore,
		type GameState,
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

	// --- Reactive Subscriptions ---
	let currentUsername: string | null = null;
	let currentGameState: GameState = 'Connecting'; // Initial state might be set by layout now
	let currentConnectionStatus: ConnectionStatus = 'closed'; // Initial state
	let currentConnectionError: string | null = null;

	const unsubscribeUsername = usernameStore.subscribe((value) => {
		currentUsername = value;
	});
	const unsubscribeGameState = gameStateStore.subscribe((value) => {
		currentGameState = value;
		// Clear local form error when game state changes significantly
		if (value !== 'NeedsUsername') {
			localError = null;
		}
	});
	const unsubscribeConnectionStatus = connectionStatus.subscribe((value) => {
		currentConnectionStatus = value;
	});
	const unsubscribeConnectionError = connectionError.subscribe((value) => {
		currentConnectionError = value;
		// If a connection error occurs while trying to set username, show it
		if (currentGameState === 'NeedsUsername' && value) {
			localError = value;
		}
	});

	// --- Lifecycle ---
	// onMount connection logic removed, handled in layout
	// onDestroy connection closing removed, handled by browser tab closure or explicit disconnect button (future)

	// Unsubscribe logic should still run if component is destroyed for other reasons
	onDestroy(() => {
		console.log('Page destroying. Unsubscribing from stores.');
		unsubscribeUsername();
		unsubscribeGameState();
		unsubscribeConnectionStatus();
		unsubscribeConnectionError();
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
</script>

<div class="container mx-auto p-4">
	<h1 class="text-2xl font-bold mb-4 text-center">Pai Gow Poker</h1>

	{#if currentUsername}
		<!-- === Main Game View (Placeholder) === -->
		<div class="p-4 border rounded bg-green-100">
			<h2 class="text-xl mb-2">Welcome, {currentUsername}!</h2>
			<p>Current Game State: <strong>{currentGameState}</strong></p>
			<!-- === Game Table Layout === -->
			<div class="mt-4 grid grid-cols-3 gap-4">
				<!-- Dealer Area (Top Span) -->
				<div class="col-span-3 p-4 border rounded bg-blue-100 min-h-[150px]">
					<h3 class="text-lg font-semibold mb-2">Dealer Area</h3>
					<!-- Dealer cards and status will go here -->
					<p class="text-sm text-gray-600">(Dealer info placeholder)</p>
				</div>

				<!-- Player Area (Bottom Left/Center) -->
				<div class="col-span-3 md:col-span-2 p-4 border rounded bg-yellow-100 min-h-[200px]">
					<h3 class="text-lg font-semibold mb-2">{currentUsername}'s Area</h3>
					<!-- Player hand, betting controls, hand setting UI will go here -->
					<p class="text-sm text-gray-600">(Player hand & actions placeholder)</p>
				</div>

				<!-- Opponent List (Bottom Right) -->
				<div class="col-span-3 md:col-span-1 p-4 border rounded bg-purple-100 min-h-[200px]">
					<h3 class="text-lg font-semibold mb-2">Other Players</h3>
					<!-- List of other players' usernames and status will go here -->
					<p class="text-sm text-gray-600">(Opponent list placeholder)</p>
				</div>
			</div>
		</div>
	{:else}
		<!-- === Username Input / Connection Status === -->
		<div class="max-w-md mx-auto p-6 border rounded shadow-md">
			<h2 class="text-xl font-semibold mb-4 text-center">Join Game</h2>

			<!-- Connection Status Display -->
			<div class="mb-4 p-2 rounded text-center
				{currentConnectionStatus === 'open' ? 'bg-green-200 text-green-800' : ''}
				{currentConnectionStatus === 'connecting' ? 'bg-yellow-200 text-yellow-800' : ''}
				{currentConnectionStatus === 'closed' ? 'bg-gray-200 text-gray-800' : ''}
				{currentConnectionStatus === 'error' ? 'bg-red-200 text-red-800' : ''}"
			>
				{#if currentConnectionStatus === 'open' && currentGameState === 'NeedsUsername'}
					Connected! Please enter a username.
				{:else if currentConnectionStatus === 'open'}
					Connected (State: {currentGameState}) <!-- Should not happen if username not set -->
				{:else if currentConnectionStatus === 'connecting'}
					Connecting to server...
				{:else if currentConnectionStatus === 'closed'}
					Disconnected from server. <button class="text-blue-600 underline hover:text-blue-800" on:click={handleReconnect}>Reconnect?</button>
				{:else if currentConnectionStatus === 'error'}
					Connection Error. <button class="text-blue-600 underline hover:text-blue-800" on:click={handleReconnect}>Retry?</button>
				{/if}
			</div>

			<!-- Username Form (Show only if connected and needs username) -->
			{#if currentConnectionStatus === 'open' && currentGameState === 'NeedsUsername'}
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
</div>
