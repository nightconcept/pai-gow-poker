<script lang="ts">
	import { get } from 'svelte/store';
	import CardComponent from '$lib/components/Card.svelte';
	import {
		usernameStore,
		gameStateStore,
		myHandStore,
		lastPlayerResultStore, // UPDATED: Use new store
		dannyBucksStore,
		dealerHandStore, // Needed for isAceHighPaiGow check
		playersStore, // ADDED: For host check
		playerIdStore, // ADDED: For host check
		type Card,
		type PlayerRoundResult // UPDATED: Use new type
	} from '$lib/stores/game';
	import { sendWebSocketMessage } from '$lib/services/websocket';

	// --- Reactive Computations for Host Status ---
	$: currentPlayerId = $playerIdStore;
	$: hostPlayer = $playersStore.find(p => p.isHost);
	$: isHost = !!(currentPlayerId && hostPlayer && currentPlayerId === hostPlayer.id);

	// --- Local State ---
	let selectedLowHandIndices = new Set<number>(); // Indices (0-6) of cards selected for low hand
	let handSettingError: string | null = null; // For hand setting validation errors

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

	// --- Event Handlers ---
	function handlePlaceBetClick() {
		console.log('Place Bet button clicked');
		// MVP uses fixed bet amount defined on backend
		sendWebSocketMessage({ type: 'placeBet', payload: {} });
	}

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
		const currentMyHand = get(myHandStore); // Get current value non-reactively
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

		// Clear selection after sending
		selectedLowHandIndices.clear();
		selectedLowHandIndices = selectedLowHandIndices;
		handSettingError = null;
	}

	function handleNextRoundClick() {
		console.log('Sending readyForNextRound message');
		sendWebSocketMessage({ type: 'readyForNextRound', payload: {} });
		// Backend should clear the last result when transitioning state
	}
</script>

<div class="col-span-1 md:col-span-2 p-4 border rounded bg-yellow-100 min-h-[200px]">
	<h3 class="text-lg font-semibold mb-2">{$usernameStore}'s Area</h3>
	<div class="my-4">
		<h4 class="font-medium mb-1">Your Hand (7 Cards):</h4>
		{#if $myHandStore}
			<!-- Make cards clickable -->
			<div class="p-2 border rounded border-gray-300 bg-gray-50">
				<div class="flex flex-wrap gap-2"> <!-- Use flex-wrap and gap for layout -->
					{#each $myHandStore as card, index (index)}
						<div
							role="button"
							tabindex="0"
							class="focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 rounded-md"
							on:click={() => handleCardClick(index)}
							on:keydown={(e) => e.key === 'Enter' && handleCardClick(index)}
							title={isHandSettingEnabled ? `Click to toggle selection for low hand (${selectedLowHandIndices.size}/2 selected)` : 'Hand setting not active'}
						>
							<CardComponent
								rank={card.rank}
								suit={card.suit}
								isSelected={selectedLowHandIndices.has(index)}
								isDisabled={!isHandSettingEnabled}
							/>
						</div>
					{/each} <!-- Correctly close the #each block here -->
				</div> <!-- Close the flex container -->
			</div>
		{:else if $gameStateStore === 'Dealing' || $gameStateStore === 'Betting' || $gameStateStore === 'WaitingForPlayers'}
			<p class="text-sm text-gray-500 italic">Waiting for cards...</p>
		{:else}
			<p class="text-sm text-gray-600">(No hand dealt yet)</p>
		{/if}
	</div>

	<!-- === Betting Area === -->
	<div class="mt-4 pt-4">
		{#if $gameStateStore === 'Betting'}
			<button
				class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
				on:click={handlePlaceBetClick}
				disabled={$gameStateStore !== 'Betting'}
			>
				Place Bet ($10 DB)
			</button>
		{:else if $gameStateStore !== 'WaitingForPlayers'}
			<!-- Show placeholder or status when not in betting phase -->
			<p class="text-sm text-gray-500 italic">
				(Betting closed for state: {$gameStateStore})
			</p>
		{/if}
	</div>
	<!-- === END Betting Area === -->

	<div class="mt-4 pt-4 space-x-2">
		{#if ($gameStateStore === 'Betting' || $gameStateStore === 'WaitingForPlayers') && isHost}
			<button
				class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded text-sm"
				on:click={handleTempStartGame}
				disabled={!isHost}
			>
				Start Game
			</button>
		{/if}
	</div>


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
		{:else if $gameStateStore === 'PlayerAction'}
			<p class="text-sm text-green-700 italic">Hand submitted. Waiting for other players...</p>
		{:else if $gameStateStore !== 'WaitingForPlayers' && $gameStateStore !== 'Betting' && $gameStateStore !== 'Dealing'}
			<p class="text-sm text-gray-500 italic">(Hand setting not active for state: {$gameStateStore})</p>
		{/if}
	</div>
	<!-- === END Hand Setting Area === -->

	<!-- === Round Result Area === -->
	<div class="mt-4 pt-4 border-t">
		{#if $lastPlayerResultStore}
			<h4 class="font-medium mb-2">Round Result</h4>
			<div
				class="p-3 rounded text-center font-bold text-lg
				{$lastPlayerResultStore.outcome === 'Win' ? 'bg-green-200 text-green-800' : ''}
				{$lastPlayerResultStore.outcome === 'Loss' || $lastPlayerResultStore.outcome === 'Foul' ? 'bg-red-200 text-red-800' : ''}
				{$lastPlayerResultStore.outcome === 'Push' ? 'bg-gray-200 text-gray-800' : ''}"
			>
				{$lastPlayerResultStore.outcome.toUpperCase()}
				<!-- Display DB Change -->
				{#if $lastPlayerResultStore.outcome !== 'Push' && $lastPlayerResultStore.outcome !== 'Error'}
					<span class="ml-2 font-semibold
						{$lastPlayerResultStore.dbChange > 0 ? 'text-green-600' : ''}
						{$lastPlayerResultStore.dbChange < 0 ? 'text-red-600' : ''}"
					>
						({$lastPlayerResultStore.dbChange > 0 ? '+' : ''}{$lastPlayerResultStore.dbChange} DB)
					</span>
				{/if}
			</div>
			<p class="text-center mt-1 text-sm">
				New Balance: 💰 {$dannyBucksStore} DB <!-- Balance is updated via store -->
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