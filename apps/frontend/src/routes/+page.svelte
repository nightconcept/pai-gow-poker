<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	// Removed unused imports: writable, get, gameStateStore, playersStore, systemMessagesStore, PlayerInfo, SystemMessage, GameState
	import TopBar from '$lib/components/TopBar.svelte';
	import DealerArea from '$lib/components/DealerArea.svelte';
	import PlayerArea from '$lib/components/PlayerArea.svelte';
	import OtherPlayersArea from '$lib/components/OtherPlayersArea.svelte';
	import UsernameSelection from '$lib/components/UsernameSelection.svelte';
	import SystemChatBox from '$lib/components/SystemChatBox.svelte'; // Import the new component
	import {
		usernameStore
	} from '$lib/stores/game';


	// --- Local State ---
	let currentUsername: string | null = null;
	// Removed previousPlayers and previousHostUsername state

	// --- Subscriptions ---
	const unsubscribeUsername = usernameStore.subscribe((value) => {
		currentUsername = value;
	});

	// Removed gameStateStore and playersStore subscriptions as message logic moved to websocket.ts


	// --- Lifecycle ---
	// Removed onMount logic


	// Unsubscribe logic
	onDestroy(() => {
		unsubscribeUsername();
		// Removed gameStateStore and playersStore unsubscribes
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
