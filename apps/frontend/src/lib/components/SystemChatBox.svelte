<script lang="ts">
	import { systemMessagesStore, type SystemMessage, type GameState } from '$lib/stores/game';
	import { onMount, onDestroy } from 'svelte';
	import { writable, get } from 'svelte/store';

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
	let chatBoxElement: HTMLDivElement;

	// --- Lifecycle & Effects ---
	// Scroll to bottom when new messages arrive
	$: if (chatBoxElement && $systemMessagesStore.length) {
		// Use timeout to ensure DOM is updated before scrolling
		setTimeout(() => {
			chatBoxElement.scrollTop = chatBoxElement.scrollHeight;
		}, 0);
	}

	// Helper to format timestamp (optional)
	function formatTimestamp(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'});
	}

</script>

<div class="p-4 border rounded bg-gray-100 dark:bg-gray-700">
	<h3 class="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">System Messages</h3>

	<!-- Message Display Area -->
	<div
		bind:this={chatBoxElement}
		class="h-40 overflow-y-auto border rounded p-2 bg-white dark:bg-gray-800 space-y-1 text-sm mb-2"
	>
		{#each $systemMessagesStore as message (message.timestamp)}
			<div class="text-gray-700 dark:text-gray-300">
				<span class="text-gray-500 dark:text-gray-400 mr-1">[{formatTimestamp(message.timestamp)}]</span>
				{message.text}
			</div>
		{:else}
			<p class="text-gray-400 italic">No system messages yet.</p>
		{/each}
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