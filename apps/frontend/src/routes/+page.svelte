<script lang="ts">
	import { onDestroy } from 'svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import DealerArea from '$lib/components/DealerArea.svelte';
	import PlayerArea from '$lib/components/PlayerArea.svelte';
	import OtherPlayersArea from '$lib/components/OtherPlayersArea.svelte';
	import UsernameSelection from '$lib/components/UsernameSelection.svelte';
	import {
		usernameStore
	} from '$lib/stores/game';

	let currentUsername: string | null = null;

	const unsubscribeUsername = usernameStore.subscribe((value) => {
		currentUsername = value;
	});

	// Unsubscribe logic
	onDestroy(() => {
		unsubscribeUsername();
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
		</div>
	{:else}
		<UsernameSelection />
	{/if}
</main>
