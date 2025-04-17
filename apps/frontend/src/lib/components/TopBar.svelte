<script lang="ts">
	import { usernameStore, gameStateStore, dannyBucksStore } from '$lib/stores/game';

	// No need to export props if directly using stores
	// export let username: string | null;
	// export let gameState: string;
	// export let dannyBucks: number;
</script>

<div class="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded">
	{#if $usernameStore}
		<h2 class="text-xl">Welcome, {$usernameStore}!</h2>
	{:else}
		<h2 class="text-xl">Welcome!</h2> <!-- Fallback if username isn't set yet -->
	{/if}
	<span class="font-semibold">💰 {$dannyBucksStore} DB</span>
</div>
<p class="text-center font-medium mb-3">Game State: <strong class="uppercase">{$gameStateStore}</strong></p>