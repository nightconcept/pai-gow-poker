<script lang="ts">
	import { systemMessagesStore, gameStateStore, type SystemMessage, type GameState } from '$lib/stores/game';
	import { tick } from 'svelte';
	// Removed unused: onMount, onDestroy, writable, get

	// --- Constants ---
	const phaseMessages: Partial<Record<GameState, string>> = {
		WaitingForPlayers: 'Waiting for players to join or the host to start...',
		Betting: 'Betting Phase: Place your bets!',
		Dealing: 'Dealing cards...',
		PlayerAction: 'Player Action: Set your hand!',
		Showdown: 'Showdown: Revealing hands and determining results...',
		RoundOver: 'Round Over. Click "Start Next Round" below.',
		AceHighPush: 'Dealer has Ace-High Pai Gow - Push!',
		NeedsUsername: 'Please enter a username to join.',
		Connecting: 'Connecting to server...',
		Disconnected: 'Disconnected from server.',
		Error: 'An error occurred.'
		// Add others as needed
	};

	// --- Local State ---
	let chatBoxElement: HTMLDivElement | null = null;
	let isUserScrolledUp = false; // Track if user has scrolled away from the bottom
	let showScrollButton = false; // Control visibility of the "Scroll to Newest" button
	const scrollThreshold = 50; // Pixels from bottom to be considered "at bottom"

	// --- Functions ---

	/** Checks if the chatbox is scrolled near the bottom */
	function isNearBottom(): boolean {
		if (!chatBoxElement) return true; // Assume at bottom if element not ready
		return (
			chatBoxElement.scrollHeight - chatBoxElement.scrollTop - chatBoxElement.clientHeight <
			scrollThreshold
		);
	}

	/** Scrolls the chatbox to the absolute bottom */
	async function scrollToBottom(force: boolean = false) {
		if (chatBoxElement && (force || !isUserScrolledUp)) {
			await tick(); // Wait for DOM update
			chatBoxElement.scrollTop = chatBoxElement.scrollHeight;
			showScrollButton = false; // Hide button after scrolling
			isUserScrolledUp = false; // User is now at the bottom
		}
	}

	/** Handles manual scrolling by the user */
	function handleScroll() {
		if (!chatBoxElement) return;

		const nearBottom = isNearBottom();
		isUserScrolledUp = !nearBottom;

		// If user scrolls back down manually, hide the button
		if (nearBottom && showScrollButton) {
			showScrollButton = false;
		}
	}

	// --- Lifecycle & Effects ---

	// React to game state changes to add phase messages
	$: {
		const currentState = $gameStateStore;
		const messageText = phaseMessages[currentState];

		if (messageText) {
			// Check if the *very last* message is the same as the one we're about to add.
			// This prevents adding duplicates if the state changes but the message text is the same,
			// or if the state rapidly changes back and forth resulting in the same message.
			const lastMessage = $systemMessagesStore[$systemMessagesStore.length - 1];
			if (!lastMessage || lastMessage.text !== messageText) {
				const newMessage: SystemMessage = { text: messageText, timestamp: Date.now() };
				systemMessagesStore.update((messages) => [...messages, newMessage]);

				// Now handle scrolling based on the *newly added* message
				// Need a tick to allow the DOM to update with the new message before scrolling
				tick().then(() => {
					if (chatBoxElement) {
						if (isUserScrolledUp) {
							// User is scrolled up, show the button instead of scrolling
							showScrollButton = true;
						} else {
							// User is near the bottom, scroll automatically
							scrollToBottom(); // Use existing function which scrolls to bottom
						}
					}
				});
			}
		}
	}

	// Helper to format timestamp
	function formatTimestamp(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'});
	}

</script>

<div class="p-4 border rounded bg-gray-100 dark:bg-gray-700">
	<h3 class="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">System Messages</h3>

	<!-- Message Display Area -->
	<div
		bind:this={chatBoxElement}
		class="relative h-40 overflow-y-auto border rounded p-2 bg-white dark:bg-gray-800 space-y-1 text-sm mb-2"
		on:scroll={handleScroll}
	>
		{#each $systemMessagesStore as message (message.timestamp)}
			<div class="text-gray-700 dark:text-gray-300 break-words">
				<span class="text-gray-500 dark:text-gray-400 mr-1">[{formatTimestamp(message.timestamp)}]</span>
				{message.text}
			</div>
		{:else}
			<p class="text-gray-400 italic">No system messages yet.</p>
		{/each}

		<!-- "Scroll to Newest" Button -->
		{#if showScrollButton}
			<button
				on:click={() => scrollToBottom(true)}
				class="absolute bottom-2 right-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-1 px-2 rounded-full shadow transition-opacity duration-200"
				aria-label="Scroll to newest messages"
			>
				↓ New Messages
			</button>
		{/if}
	</div>

	<!-- Commented-out Input Area (for future chat feature) -->
	<!--
	<div class="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600 flex items-center gap-2">
		<div class="flex-shrink-0">
			<label for="chat-recipient" class="text-sm font-medium text-gray-700 dark:text-gray-300">To:</label>
			<select
				id="chat-recipient"
				class="ml-1 p-1 border rounded text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
				disabled
			>
				<option>Everyone</option>
				<! -- Add other players later -- >
			</select>
		</div>
		<input
			type="text"
			placeholder="Chat disabled for now..."
			class="flex-grow p-1 border rounded bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-100 cursor-not-allowed"
			disabled
		/>
		<button
			class="p-1 px-3 border rounded bg-gray-200 dark:bg-gray-500 text-gray-600 dark:text-gray-200 cursor-not-allowed"
			disabled
		>
			Send
		</button>
	</div>
	-->
</div>