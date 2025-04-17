<script lang="ts">
	import { playersStore } from '$lib/stores/game';
	import type { PlayerInfo } from '$lib/stores/game'; // Import type if needed

	// No need for props if using stores directly
	// export let players: PlayerInfo[];
</script>

<div class="col-span-1 md:col-span-1 p-4 border rounded bg-purple-100 min-h-[200px]">
	<h3 class="text-lg font-semibold mb-2">Other Players ({$playersStore.length})</h3>
	{#if $playersStore.length > 0}
		<ul class="list-disc list-inside">
			{#each $playersStore as player (player.username)}
				<li>{player.username}</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-gray-500 italic">Waiting for others...</p>
	{/if}
</div>