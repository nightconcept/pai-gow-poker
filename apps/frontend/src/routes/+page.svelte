<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { writable, get } from 'svelte/store'; // Import writable and get
	import TopBar from '$lib/components/TopBar.svelte';
	import DealerArea from '$lib/components/DealerArea.svelte';
	import PlayerArea from '$lib/components/PlayerArea.svelte';
	import OtherPlayersArea from '$lib/components/OtherPlayersArea.svelte';
	import UsernameSelection from '$lib/components/UsernameSelection.svelte';
	import SystemChatBox from '$lib/components/SystemChatBox.svelte'; // Import the new component
	import {
		usernameStore,
		gameStateStore, // Import necessary stores
		playersStore,
		systemMessagesStore,
		type PlayerInfo, // Import types
		type SystemMessage,
		type GameState
	} from '$lib/stores/game';

	// --- Constants for System Messages ---
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

	// --- Local State for Tracking Changes ---
	let currentUsername: string | null = null;
	let previousPlayers = writable<PlayerInfo[]>([]); // Store previous player list
	let previousHostUsername = writable<string | null>(null); // Store previous host

	// --- Helper Function ---
	function addSystemMessage(text: string) {
		const newMessage: SystemMessage = {
			timestamp: Date.now(),
			text: text
		};
		systemMessagesStore.update((messages) => [...messages, newMessage]);
	}

	// --- Subscriptions ---
	const unsubscribeUsername = usernameStore.subscribe((value) => {
		currentUsername = value;
	});

	const unsubscribeGameState = gameStateStore.subscribe((newState) => {
		const message = phaseMessages[newState];
		if (message) {
			addSystemMessage(`Phase: ${message}`);
		}
	});

	const unsubscribePlayers = playersStore.subscribe((newPlayers) => {
		const oldPlayers = get(previousPlayers); // Get current value of previousPlayers store
		const oldUsernames = new Set(oldPlayers.map(p => p.username));
		const newUsernames = new Set(newPlayers.map(p => p.username));

		// Check for joins
		newUsernames.forEach(username => {
			if (!oldUsernames.has(username)) {
				addSystemMessage(`${username} has joined.`);
			}
		});

		// Check for leaves
		oldUsernames.forEach(username => {
			if (!newUsernames.has(username)) {
				addSystemMessage(`${username} has left.`);
			}
		});

		// Check for host change (conditional)
		const oldHost = oldPlayers.find(p => p.isHost);
		const newHost = newPlayers.find(p => p.isHost);
		const currentPrevHostUsername = get(previousHostUsername); // Get current value

		if (newHost && newHost.username !== currentPrevHostUsername) {
			addSystemMessage(`${newHost.username} is now the host.`);
			previousHostUsername.set(newHost.username); // Update the previous host store
		} else if (!newHost && currentPrevHostUsername) {
			// Handle case where host leaves or steps down (if applicable)
			// addSystemMessage(`Host (${currentPrevHostUsername}) is no longer hosting.`); // Optional message
			previousHostUsername.set(null); // Clear previous host store
		}

		// Update the previous players store for the next comparison
		previousPlayers.set(newPlayers);
	});


	// --- Lifecycle ---
	// Initialize previous state on mount if needed (e.g., if players can be present on load)
	onMount(() => {
		previousPlayers.set(get(playersStore));
		const currentHost = get(playersStore).find(p => p.isHost);
		previousHostUsername.set(currentHost ? currentHost.username : null);
	});

	// Unsubscribe logic
	onDestroy(() => {
		unsubscribeUsername();
		unsubscribeGameState();
		unsubscribePlayers();
		// No need to unsubscribe from previousPlayers or previousHostUsername as they are local writable stores
	});

</script>
	
<main class="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
	<h1 class="text-2xl font-bold mb-4 text-center">Pai Gow Poker</h1>

	{#if currentUsername}
		<div class="w-full max-w-[960px] p-4 border rounded bg-green-100 shadow-lg">
			<TopBar />

			<div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
				<DealerArea />
				<PlayerArea />
				<OtherPlayersArea />
			</div>

			<!-- ADD THE NEW COMPONENT HERE -->
			<div class="mt-4">
				 <SystemChatBox />
			</div>
		</div>
	{:else}
		<UsernameSelection />
	{/if}
</main>
