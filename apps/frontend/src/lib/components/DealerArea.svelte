<script lang="ts">
	import { dealerHandStore, gameStateStore } from '$lib/stores/game';
	import CardComponent from '$lib/components/Card.svelte';
	import type { DealerHand } from '$lib/stores/game'; // Ensure Card type is imported if needed by CardComponent internally or for validation
</script>

<div class="col-span-3 p-4 border rounded bg-blue-100 min-h-[150px]">
	<h3 class="text-lg font-semibold mb-2">Dealer Area</h3>
	{#if $dealerHandStore}
		{#if $dealerHandStore.isAceHighPaiGow}
			<p class="text-red-600 font-bold mb-2">Dealer has Ace-High Pai Gow!</p>
		{/if}
		<div class="mb-2">
			<span class="font-medium">Revealed (7):</span>
			<div class="ml-2 flex flex-wrap gap-1 mt-1">
				{#each $dealerHandStore.revealed as card (card.rank + card.suit)}
					<CardComponent rank={card.rank} suit={card.suit} />
				{/each}
			</div>
		</div>
		<div class="mb-1">
			<span class="font-medium">High Hand (5):</span>
			<div class="ml-2 flex flex-wrap gap-1 mt-1">
				{#each $dealerHandStore.highHand as card (card.rank + card.suit)}
					<CardComponent rank={card.rank} suit={card.suit} />
				{/each}
			</div>
		</div>
		<div>
			<span class="font-medium">Low Hand (2):</span>
			<div class="ml-2 flex flex-wrap gap-1 mt-1">
				{#each $dealerHandStore.lowHand as card (card.rank + card.suit)}
					<CardComponent rank={card.rank} suit={card.suit} />
				{/each}
			</div>
		</div>
	{:else if $gameStateStore === 'Dealing' || $gameStateStore === 'Betting' || $gameStateStore === 'WaitingForPlayers'}
		<p class="text-sm text-gray-500 italic">Waiting for deal...</p>
	{:else}
		<p class="text-sm text-gray-600">(Dealer info not available yet)</p>
	{/if}
</div>