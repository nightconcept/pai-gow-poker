<!-- apps/frontend/src/lib/components/Card.svelte -->
<script lang="ts">
  // Note: Adjust the import path if the backend Card type definition moves or is shared differently.
  // Assuming a shared types package isn't set up yet, we might need a local definition or relative path.
  // For now, let's define a local interface matching the backend structure.
  interface CardDef {
    rank: string; // '2', '3', ..., 'K', 'A', 'Joker'
    suit: string; // 'Spades', 'Hearts', 'Diamonds', 'Clubs', '' for Joker
  }

  /**
   * Props for the Card component.
   */
  export let rank: CardDef['rank'];
  export let suit: CardDef['suit'];
  export let displayMode: 'text' | 'image' = 'text'; // Default to text/emoji
  export let isSelected: boolean = false; // For potential future interactions
  export let isDisabled: boolean = false; // For potential future interactions

  // --- Reactive Computations ---

  // Determine suit color and emoji
  $: suitDetails = (() => {
    // Handle Joker specifically
    if (rank === 'Joker') {
        return { emoji: '🃏', colorClass: 'text-purple-600' }; // Or another distinct style
    }
    switch (suit) {
      case 'Hearts':
        return { emoji: '♥️', colorClass: 'text-red-600' };
      case 'Diamonds':
        return { emoji: '♦️', colorClass: 'text-red-600' };
      case 'Spades':
        return { emoji: '♠️', colorClass: 'text-black' };
      case 'Clubs':
        return { emoji: '♣️', colorClass: 'text-black' };
      default:
        return { emoji: '?', colorClass: 'text-gray-500' }; // Handle unexpected suits
    }
  })();

  // Determine display rank (e.g., 'T' for 10)
  $: displayRank = (() => {
    if (rank === 'Joker') return 'JK';
    if (rank === '10') return '10';
    return rank;
  })();

  // Base classes for the card
  const baseCardClasses =
    'border border-gray-400 bg-white rounded-md shadow-sm flex flex-col items-center justify-center p-1 aspect-[2.5/3.5] min-w-[40px] min-h-[56px] select-none transition-all duration-150 ease-in-out text-center'; // Added text-center

  // Dynamic classes based on state
  $: cardClasses = `
    ${baseCardClasses}
    ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 scale-105 shadow-lg' : ''}
    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:scale-105'}
    ${suitDetails.colorClass}
  `; // Added hover scale
</script>

{#if displayMode === 'text'}
  <!-- Text/Emoji Representation -->
  <div class={cardClasses} on:click>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="text-xs font-semibold w-full text-center">{displayRank}</div> <!-- Removed pl-1, added w-full text-center -->
    <div class="text-xl font-bold my-auto flex-grow flex items-center justify-center">{suitDetails.emoji}</div> <!-- Added flex-grow and centering for emoji -->
    <!-- Removed bottom rotated rank -->
  </div>
{:else if displayMode === 'image'}
  <!-- Image Representation (Placeholder) -->
  <div class={cardClasses + ' border'} on:click>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!--
      TODO: Replace with actual image rendering logic.
            Need image assets (e.g., /cards/AS.png, /cards/KC.png)
            The src might be dynamically generated: `/cards/${rank}${suit.charAt(0)}.png` (needs mapping)
    -->
    <img
      src={`/placeholder-card.png`}
      alt={`${rank} of ${suit}`}
      class="w-full h-full object-contain"
      loading="lazy"
    />
    <!-- Apply 1px border via parent div's border class -->
  </div>
{/if}

<style>
  /* Ensure aspect ratio is maintained */
  div[class*="aspect-"] {
    position: relative;
  }
  div[class*="aspect-"] > * {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  /* Override for flex layout in text mode */
  .flex {
    position: static; /* Reset position for flex items */
  }
  .flex > * {
     position: static; /* Reset position for flex items */
  }
</style>