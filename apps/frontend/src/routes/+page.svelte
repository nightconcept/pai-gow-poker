<script lang="ts">
	// Removed onMount import, kept onDestroy for unsubscribing
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store'; // Import get
	import {
		usernameStore,
		gameStateStore,
		playersStore, // Added
		dannyBucksStore, // Added
		dealerHandStore, // Added
		myHandStore, // Added
		type GameState,
		type PlayerInfo, // Added
		type DealerHand, // Added
		type Card, // Added
		lastResultStore, // Added for Task 20
		type RoundResult, // Added for Task 20
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
	let selectedLowHandIndices = new Set<number>(); // Indices (0-6) of cards selected for low hand
	let handSettingError: string | null = null; // For hand setting validation errors

	// --- Reactive Subscriptions ---
	let currentUsername: string | null = null;
	// let currentGameState: GameState = 'Connecting'; // Removed for auto-subscription
	let currentConnectionStatus: ConnectionStatus = 'closed'; // Initial state
	let currentConnectionError: string | null = null;
	let currentPlayers: PlayerInfo[] = []; // Added
	let currentDannyBucks: number = 0; // Added
	let currentDealerHand: DealerHand | null = null; // Added
	let currentMyHand: Card[] | null = null; // Added
	let currentLastResult: RoundResult | null = null; // Added for Task 20
	
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
	const unsubscribePlayers = playersStore.subscribe((value) => { // Added
		currentPlayers = value; // Added
	}); // Added
	const unsubscribeDannyBucks = dannyBucksStore.subscribe((value) => { // Added
		currentDannyBucks = value; // Added
	}); // Added
	const unsubscribeDealerHand = dealerHandStore.subscribe((value) => { // Added
		currentDealerHand = value; // Added
	}); // Added
	const unsubscribeMyHand = myHandStore.subscribe((value) => { // Added
		currentMyHand = value; // Added
	}); // Added
	const unsubscribeLastResult = lastResultStore.subscribe((value) => { // Added for Task 20
		currentLastResult = value; // Added for Task 20
	}); // Added for Task 20
	
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
		unsubscribePlayers(); // Added
		unsubscribeDannyBucks(); // Added
		unsubscribeDealerHand(); // Added
		unsubscribeMyHand(); // Added
		unsubscribeLastResult(); // Added for Task 20
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

	// --- Event Handlers ---
	function handlePlaceBetClick() {
		console.log('Place Bet button clicked');
		// MVP uses fixed bet amount defined on backend
		sendWebSocketMessage({ type: 'placeBet', payload: {} });
	}
  
	// --- Temporary Test Handlers ---
	// Keep handleTempStartGame for now until proper host controls exist
	function handleTempStartGame() {
		console.log('Sending temp startGame message');
		sendWebSocketMessage({ type: 'startGame', payload: {} });
	}

	function handleCardClick(index: number) {
		if (!isHandSettingEnabled) return; // Don't allow clicks if not enabled

		handSettingError = null; // Clear previous errors on interaction

		if (selectedLowHandIndices.has(index)) {
			selectedLowHandIndices.delete(index);
		} else {
			if (selectedLowHandIndices.size < 2) {
				selectedLowHandIndices.add(index);
			} else {
				// Already 2 selected, maybe provide feedback? For now, just ignore.
				console.warn('Already selected 2 cards for the low hand.');
				handSettingError = 'You can only select 2 cards for the low hand.';
			}
		}
		selectedLowHandIndices = selectedLowHandIndices; // Trigger reactivity
	}

	function handleConfirmHand() {
		if (!isHandSettingValid) {
			handSettingError = 'You must select exactly 2 cards for the low hand.';
			return;
		}
		if (!currentMyHand) {
			handSettingError = 'Cannot set hand, no cards available.';
			return;
		}

		const lowHand: Card[] = [];
		const highHand: Card[] = [];

		currentMyHand.forEach((card, index) => {
			if (selectedLowHandIndices.has(index)) {
				lowHand.push(card);
			} else {
				highHand.push(card);
			}
		});

		// Basic client-side check (backend *must* validate rigorously)
		if (lowHand.length !== 2 || highHand.length !== 5) {
			handSettingError = 'Invalid split: Must have 2 cards in low hand and 5 in high hand.';
			console.error('Hand split calculation error', lowHand, highHand);
			return;
		}

		console.log('Confirming hand:', { lowHand, highHand });
		sendWebSocketMessage({
			type: 'setPlayerHand',
			payload: { lowHand, highHand }
		});

		// Optionally clear selection after sending, or wait for backend confirmation/state change
		// selectedLowHandIndices.clear();
		// selectedLowHandIndices = selectedLowHandIndices;
	}

	function handleNextRoundClick() {
		console.log('Sending readyForNextRound message');
		sendWebSocketMessage({ type: 'readyForNextRound', payload: {} });
		// Optionally clear the last result immediately on click,
		// or wait for the backend to transition state which should clear it.
		// lastResultStore.set(null);
	}

	// --- Helper Functions ---
	/** Renders a card object into a string like "AH" or "TS" */
	function renderCard(card: Card | undefined | null): string {
		if (!card) return '';
		if (card.rank === 'JOKER') return 'JK';
		// Use 'T' for 10
		const rankDisplay = card.rank === '10' ? 'T' : card.rank;
		// Use first letter of suit
		const suitDisplay = card.suit ? card.suit.charAt(0) : ''; // Handle potential missing suit for Joker
		return `${rankDisplay}${suitDisplay}`;
	}

	/** Renders an array of cards into a space-separated string */
	function renderHand(hand: Card[] | undefined | null): string {
		if (!hand || hand.length === 0) return '(No cards)';
		return hand.map(renderCard).join(' ');
	}

	// --- Reactive Logging ---
	$: { // Log whenever the store value changes as seen by the component
		console.log('COMPONENT sees $gameStateStore change:', $gameStateStore);
	}

	// --- Reactive Computations ---
	// Use 'PlayerAction' as received from backend logs
	$: isHandSettingEnabled = $gameStateStore === 'PlayerAction' && !$dealerHandStore?.isAceHighPaiGow;
	$: isHandSettingValid = selectedLowHandIndices.size === 2;

	// Clear selection if hand setting becomes disabled (e.g., state changes)
	$: if (!isHandSettingEnabled && selectedLowHandIndices.size > 0) {
		console.log('Hand setting disabled, clearing selection.');
		selectedLowHandIndices.clear();
		selectedLowHandIndices = selectedLowHandIndices; // Trigger reactivity
		handSettingError = null; // Clear errors too
	}
</script>

<div class="container mx-auto p-4">
	<h1 class="text-2xl font-bold mb-4 text-center">Pai Gow Poker</h1>

	{#if currentUsername}
		<!-- === Main Game View (Placeholder) === -->
		<div class="p-4 border rounded bg-green-100">
			<div class="flex justify-between items-center mb-2">
				<h2 class="text-xl">Welcome, {currentUsername}!</h2>
				<span class="font-semibold">💰 {currentDannyBucks} DB</span>
			</div>
			<p class="text-center font-medium mb-3">Game State: <strong class="uppercase">{$gameStateStore}</strong></p> <!-- Use $gameStateStore -->
			<!-- === Game Table Layout === -->
			<div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Dealer Area (Top Span on small, still top on medium+) -->
				<div class="col-span-3 p-4 border rounded bg-blue-100 min-h-[150px]">
					<h3 class="text-lg font-semibold mb-2">Dealer Area</h3>
					{#if currentDealerHand}
						{#if currentDealerHand.isAceHighPaiGow}
							<p class="text-red-600 font-bold mb-2">Dealer has Ace-High Pai Gow!</p>
						{/if}
						<div class="mb-2">
							<span class="font-medium">Revealed (7):</span>
							<span class="ml-2 font-mono text-sm bg-white px-1 py-0.5 rounded">{renderHand(currentDealerHand.revealed)}</span>
						</div>
						<div class="mb-1">
							<span class="font-medium">High Hand (5):</span>
							<span class="ml-2 font-mono text-sm bg-white px-1 py-0.5 rounded">{renderHand(currentDealerHand.highHand)}</span>
						</div>
						<div>
							<span class="font-medium">Low Hand (2):</span>
							<span class="ml-2 font-mono text-sm bg-white px-1 py-0.5 rounded">{renderHand(currentDealerHand.lowHand)}</span>
						</div>
					{:else if $gameStateStore === 'Dealing' || $gameStateStore === 'Betting' || $gameStateStore === 'WaitingForPlayers'} <!-- Use $gameStateStore -->
						<p class="text-sm text-gray-500 italic">Waiting for deal...</p>
					{:else}
						<p class="text-sm text-gray-600">(Dealer info not available yet)</p>
					{/if}
				</div>

				<!-- Player Area (Middle on small, bottom left/center on medium+) -->
				<div class="col-span-1 md:col-span-2 p-4 border rounded bg-yellow-100 min-h-[200px]">
					<h3 class="text-lg font-semibold mb-2">{currentUsername}'s Area</h3>
					<!-- DEBUGGING -->
					<p class="my-2 p-1 bg-red-200 text-red-800 font-bold">DEBUG State Seen by Template: ["{$gameStateStore}"]</p>
					<!-- END DEBUGGING -->
					<div class="my-4">
						<h4 class="font-medium mb-1">Your Hand (7 Cards):</h4>
						{#if currentMyHand}
							<!-- Make cards clickable -->
							<div class="p-2 border rounded border-gray-300 bg-gray-50">
								{#each currentMyHand as card, index (index)}
									<button
										type="button"
										class="inline-block font-mono text-lg px-2 py-1 rounded shadow-sm mx-0.5 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150"
										class:bg-white={!selectedLowHandIndices.has(index)}
										class:text-black={!selectedLowHandIndices.has(index)}
										class:bg-yellow-300={selectedLowHandIndices.has(index)}
										class:text-yellow-900={selectedLowHandIndices.has(index)}
										class:border-2={selectedLowHandIndices.has(index)}
										class:border-yellow-500={selectedLowHandIndices.has(index)}
										class:hover:bg-gray-100={!selectedLowHandIndices.has(index) && isHandSettingEnabled}
										class:hover:bg-yellow-400={selectedLowHandIndices.has(index) && isHandSettingEnabled}
										disabled={!isHandSettingEnabled}
										on:click={() => handleCardClick(index)}
										title={isHandSettingEnabled ? `Click to toggle selection for low hand (${selectedLowHandIndices.size}/2 selected)` : 'Hand setting not active'}
									>
										{renderCard(card)}
									</button>
								{/each}
							</div>
						{:else if $gameStateStore === 'Dealing' || $gameStateStore === 'Betting' || $gameStateStore === 'WaitingForPlayers'} <!-- Use $gameStateStore -->
							<p class="text-sm text-gray-500 italic">Waiting for cards...</p>
						{:else}
							<p class="text-sm text-gray-600">(No hand dealt yet)</p>
						{/if}
					</div>

					<!-- === Betting Area === -->
					<div class="mt-4 pt-4 border-t">
						{#if $gameStateStore === 'Betting'} <!-- Use $gameStateStore -->
							<button
								class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
								on:click={handlePlaceBetClick}
								disabled={$gameStateStore !== 'Betting'}
							>
								Place Bet (Fixed Amount)
							</button>
						{:else if $gameStateStore !== 'WaitingForPlayers'} <!-- Use $gameStateStore -->
							<!-- Show placeholder or status when not in betting phase -->
							<p class="text-sm text-gray-500 italic">
								(Betting closed for state: {$gameStateStore}) <!-- Use $gameStateStore -->
							</p>
						{/if}
					</div>
					<!-- === END Betting Area === -->

					<!-- === TEMPORARY TEST BUTTONS (Start Game Only) === -->
					<div class="mt-2 space-x-2">
						{#if $gameStateStore === 'Betting'} <!-- Use $gameStateStore -->
							<button
								class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded text-sm"
								on:click={handleTempStartGame}
								disabled={$gameStateStore !== 'Betting'}
							>
								TEMP: Start Game
							</button>
						{/if}
					</div>
					<!-- === END TEMPORARY TEST BUTTONS === -->


					<!-- === Hand Setting Area === -->
					<div class="mt-4 pt-4 border-t">
						{#if isHandSettingEnabled}
							<h4 class="font-medium mb-2">Set Your Hand ({selectedLowHandIndices.size} / 2 selected for Low Hand)</h4>
							{#if handSettingError}
								<p class="text-sm text-red-600 mb-2" role="alert">{handSettingError}</p>
							{/if}
							<button
								class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
								disabled={!isHandSettingValid}
								on:click={handleConfirmHand}
							>
								Confirm Hand Split
							</button>
							<p class="text-xs text-gray-500 mt-1">Select exactly 2 cards for your Low Hand by clicking them above.</p>
						{:else if $gameStateStore === 'WaitingForOthers'}
							<p class="text-sm text-green-700 italic">Hand submitted. Waiting for other players...</p>
						{:else if $gameStateStore !== 'WaitingForPlayers' && $gameStateStore !== 'Betting' && $gameStateStore !== 'Dealing'}
							<p class="text-sm text-gray-500 italic">(Hand setting not active for state: {$gameStateStore})</p>
						{/if}
					</div>
					<!-- === END Hand Setting Area === -->

					<!-- === Round Result Area (Task 20) === -->
					<div class="mt-4 pt-4 border-t">
						{#if $lastResultStore}
							<h4 class="font-medium mb-2">Round Result</h4>
							<div
								class="p-3 rounded text-center font-bold text-lg
								{$lastResultStore.outcome === 'Win' ? 'bg-green-200 text-green-800' : ''}
								{$lastResultStore.outcome === 'Loss' || $lastResultStore.outcome === 'Foul' ? 'bg-red-200 text-red-800' : ''}
								{$lastResultStore.outcome === 'Push' ? 'bg-gray-200 text-gray-800' : ''}"
							>
								{$lastResultStore.outcome.toUpperCase()}
								{#if $lastResultStore.outcome === 'Win' || $lastResultStore.outcome === 'Loss'}
									({$lastResultStore.amount > 0 ? '+' : ''}{$lastResultStore.amount} DB)
								{/if}
							</div>
							<p class="text-center mt-1 text-sm">
								New Balance: 💰 {$dannyBucksStore} DB
							</p>
							<!-- Optionally show hands here later -->

							<!-- Add button to proceed -->
							<div class="mt-3 text-center">
								<button
									class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
									on:click={handleNextRoundClick}
								>
									Start Next Round
								</button>
							</div>
						{:else if $gameStateStore === 'Showdown'}
							<p class="text-sm text-blue-700 italic">Determining results...</p>
						{/if}
					</div>
					<!-- === END Round Result Area === -->
				</div>

				<!-- Opponent List (Bottom on small, bottom right on medium+) -->
				<div class="col-span-1 md:col-span-1 p-4 border rounded bg-purple-100 min-h-[200px]">
					<h3 class="text-lg font-semibold mb-2">Other Players ({currentPlayers.length})</h3>
					{#if currentPlayers.length > 0}
						<ul class="list-disc list-inside">
							{#each currentPlayers as player (player.username)}
								<li>{player.username}</li>
							{/each}
						</ul>
					{:else}
						<p class="text-sm text-gray-500 italic">Waiting for others...</p>
					{/if}
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
</div>
