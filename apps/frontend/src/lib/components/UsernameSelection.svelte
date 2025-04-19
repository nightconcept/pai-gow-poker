<script lang="ts">
	import { onDestroy } from 'svelte';
	// Removed unused 'get' import
	import { gameStateStore, type GameState } from '$lib/stores/game';
	import {
		connectWebSocket,
		sendWebSocketMessage,
		connectionStatus,
		connectionError,
		type ConnectionStatus
	} from '$lib/services/websocket';

	// --- Local State ---
	let enteredUsername = '';
	let localError: string | null = null; // For form validation errors

	// --- Reactive Subscriptions ---
	// No need for currentUsername subscription here, parent handles that switch
	let currentConnectionStatus: ConnectionStatus = 'closed'; // Initial state
	let currentConnectionError: string | null = null;
	let currentGameState: GameState = 'Connecting'; // Initial state

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
	const unsubscribeGameState = gameStateStore.subscribe((value) => {
		currentGameState = value;
		// Clear local error if game state changes away from needing username
		if (value !== 'NeedsUsername') {
			localError = null;
		}
	});


	// Unsubscribe logic
	onDestroy(() => {
		console.log('UsernameSelection destroying. Unsubscribing from stores.');
		unsubscribeConnectionStatus();
		unsubscribeConnectionError();
		unsubscribeGameState();
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
		// usernameStore will be updated by the websocket message handler in layout/service
	}

	function handleReconnect() {
		console.log('Reconnect button clicked.');
		// The URL should be handled within the connectWebSocket function now
		connectWebSocket();
	}

</script>

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
		{#if currentConnectionStatus === 'open' && currentGameState === 'NeedsUsername'}
			Connected! Please enter a username.
		{:else if currentConnectionStatus === 'open'}
			<!-- Avoid showing intermediate game states here. Parent will hide this component soon. -->
			Connected. Processing...
		{:else if currentConnectionStatus === 'connecting'}
			Connecting to server...
		{:else if currentConnectionStatus === 'closed'}
			Disconnected from server. <button class="text-blue-600 underline hover:text-blue-800" on:click={handleReconnect}>Reconnect?</button>
		{:else if currentConnectionStatus === 'error'}
			Connection Error: {currentConnectionError || 'Unknown error'}. <button class="text-blue-600 underline hover:text-blue-800" on:click={handleReconnect}>Retry?</button>
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