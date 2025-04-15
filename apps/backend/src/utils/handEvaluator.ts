import type { Card } from '../models/Card';

// --- Constants for Hand Ranks ---
// Higher number means better hand
export const HAND_RANK = {
	HIGH_CARD: 0,
	ONE_PAIR: 1,
	TWO_PAIR: 2,
	THREE_OF_A_KIND: 3,
	STRAIGHT: 4,
	FLUSH: 5,
	FULL_HOUSE: 6,
	FOUR_OF_A_KIND: 7,
	STRAIGHT_FLUSH: 8,
	ROYAL_FLUSH: 9,
	FIVE_ACES: 10, // Highest possible hand
};

// --- Card Value Mapping ---
// Map card ranks to numerical values for comparison. Ace can be high or low.
// Joker needs special handling.
const cardValues: { [key: string]: number } = {
	'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
	'J': 11, 'Q': 12, 'K': 13, 'A': 14, // Ace high by default
	'Joker': 99, // Special value for Joker
};

/**
 * Represents the evaluated rank and kickers of a hand.
 */
export interface HandEvaluation {
	rank: number; // One of HAND_RANK values
	values: number[]; // Sorted numerical values of cards determining rank (e.g., [10, 10, 8, 8, 5] for two pair)
	kickers?: number[]; // Sorted numerical values of non-ranking cards (e.g., [5] for the two pair above)
	isAceHighPaiGow?: boolean; // Specific flag for Ace-High Pai Gow (5-card hand only)
}

// --- Helper Functions ---

/**
 * Sorts cards by rank, highest first. Handles Joker.
 * @param {Card[]} cards - Array of cards.
 * @returns {Card[]} Sorted array of cards.
 */
function sortCards(cards: Card[]): Card[] {
	return [...cards].sort((a, b) => cardValues[b.rank] - cardValues[a.rank]);
}

/**
 * Counts occurrences of each rank in a hand.
 * @param {Card[]} cards - Array of cards.
 * @returns {{ [key: number]: number }} Map of card value to count.
 */
function getRankCounts(cards: Card[]): { [key: number]: number } {
	const counts: { [key: number]: number } = {};
	for (const card of cards) {
		const value = cardValues[card.rank];
		counts[value] = (counts[value] || 0) + 1;
	}
	return counts;
}

/**
 * Counts occurrences of each suit in a hand.
 * @param {Card[]} cards - Array of cards (Joker suit ignored unless needed for flush).
 * @returns {{ [key: string]: number }} Map of suit to count.
 */
function getSuitCounts(cards: Card[]): { [key: string]: number } {
	const counts: { [key: string]: number } = {};
	for (const card of cards) {
		if (card.suit !== 'Joker') {
			counts[card.suit] = (counts[card.suit] || 0) + 1;
		}
	}
	return counts;
}

// --- 5-Card Hand Evaluation ---

/**
 * Evaluates a 5-card Pai Gow hand, considering the Joker.
 * @param {Card[]} hand - Exactly 5 cards.
 * @returns {HandEvaluation} The evaluated hand rank and values.
 */
export function evaluate5CardHand(hand: Card[]): HandEvaluation {
	if (hand.length !== 5) {
		throw new Error('evaluate5CardHand requires exactly 5 cards.');
	}

	const sortedHand = sortCards(hand);
	const values = sortedHand.map(c => cardValues[c.rank]);
	const rankCounts = getRankCounts(sortedHand);
	const suitCounts = getSuitCounts(sortedHand);
	const hasJoker = values.includes(cardValues.Joker);
	const numJokers = rankCounts[cardValues.Joker] || 0;

	// --- Check for Flush/Straight Possibilities (handling Joker) ---
	let isFlush = false;
	let flushSuit: string | null = null;
	const suitsPresent = Object.keys(suitCounts);
	if (suitsPresent.length === 1) {
		isFlush = true;
		flushSuit = suitsPresent[0];
	} else if (hasJoker && suitsPresent.length === 1 && suitCounts[suitsPresent[0]] === 5 - numJokers) {
		isFlush = true; // Joker completes the flush
		flushSuit = suitsPresent[0];
	}

	// Check for Straight (more complex with Joker)
	// Create values array without Joker for initial straight check
	const nonJokerValues = values.filter(v => v !== cardValues.Joker).sort((a, b) => b - a);
	let isStraight = false;
	let straightHighCard = 0;

	// Helper to check for straight in a set of values
	const checkStraight = (vals: number[]): { isStraight: boolean; highCard: number } => {
		if (vals.length < 5) return { isStraight: false, highCard: 0 };
		let uniqueSorted = Array.from(new Set(vals)).sort((a, b) => b - a);
		// Ace low straight check (A, 2, 3, 4, 5) -> values [14, 5, 4, 3, 2]
		if (uniqueSorted.length >= 5 && uniqueSorted[0] === 14 && uniqueSorted[uniqueSorted.length - 4] === 5) {
			// Check if 5,4,3,2 are present
			if ([5, 4, 3, 2].every(v => uniqueSorted.includes(v))) {
				return { isStraight: true, highCard: 5 }; // A-5 straight high card is 5
			}
		}
		// Standard straight check
		for (let i = 0; i <= uniqueSorted.length - 5; i++) {
			if (uniqueSorted[i] - uniqueSorted[i + 4] === 4) {
				return { isStraight: true, highCard: uniqueSorted[i] };
			}
		}
		return { isStraight: false, highCard: 0 };
	};

	// Check straight without Joker first
	let straightCheckResult = checkStraight(nonJokerValues);
	isStraight = straightCheckResult.isStraight;
	straightHighCard = straightCheckResult.highCard;

	// If no natural straight, check if Joker can complete one
	if (!isStraight && hasJoker && nonJokerValues.length === 4) {
		let uniqueSorted = Array.from(new Set(nonJokerValues)).sort((a, b) => b - a);
		// Try inserting Joker (as any needed value)
		for (let i = 0; i < uniqueSorted.length; i++) {
			// Check gap before current card
			if (i > 0 && uniqueSorted[i-1] - uniqueSorted[i] > 1) {
				let potentialStraight = [...uniqueSorted];
				potentialStraight.splice(i, 0, uniqueSorted[i-1] - 1); // Insert missing card value
				straightCheckResult = checkStraight(potentialStraight);
				if (straightCheckResult.isStraight) break;
			}
			// Check gap after last card
			if (i === uniqueSorted.length - 1 && uniqueSorted.length === 4) {
				let potentialStraight = [...uniqueSorted, uniqueSorted[i] - 1];
				straightCheckResult = checkStraight(potentialStraight);
				if (straightCheckResult.isStraight) break;
				// Check gap before first card
				potentialStraight = [uniqueSorted[0] + 1, ...uniqueSorted];
				straightCheckResult = checkStraight(potentialStraight);
				if (straightCheckResult.isStraight) break;
			}
		}
		// Special Ace-low check with Joker: A,2,3,4 + Joker -> [14, 4, 3, 2] + Joker
		if (uniqueSorted.length === 4 && uniqueSorted[0] === 14 && uniqueSorted[1] === 4 && uniqueSorted[2] === 3 && uniqueSorted[3] === 2) {
		    straightCheckResult = { isStraight: true, highCard: 5 };
		}
		// Special Ace-high check with Joker: A,K,Q,J + Joker -> [14, 13, 12, 11] + Joker
		if (uniqueSorted.length === 4 && uniqueSorted[0] === 14 && uniqueSorted[1] === 13 && uniqueSorted[2] === 12 && uniqueSorted[3] === 11) {
		    straightCheckResult = { isStraight: true, highCard: 14 };
		}

		isStraight = straightCheckResult.isStraight;
		straightHighCard = straightCheckResult.highCard;
	}


	// --- Determine Hand Rank ---

	// 1. Five Aces (AAAA Joker)
	if (hasJoker && rankCounts[cardValues.A] === 4) {
		return { rank: HAND_RANK.FIVE_ACES, values: [14, 14, 14, 14, 14] }; // Treat Joker as Ace value
	}

	// 2. Straight Flush (and Royal Flush)
	if (isStraight && isFlush) {
		// Use the straightHighCard value determined earlier
		const rank = (straightHighCard === 14) ? HAND_RANK.ROYAL_FLUSH : HAND_RANK.STRAIGHT_FLUSH;
		return { rank, values: [straightHighCard] };
	}

	// 3. Four of a Kind
	const fourKindValue = Object.keys(rankCounts).find(v => rankCounts[Number(v)] === 4);
	if (fourKindValue) {
		const kicker = values.find(v => v !== Number(fourKindValue) && v !== cardValues.Joker);
		return { rank: HAND_RANK.FOUR_OF_A_KIND, values: [Number(fourKindValue)], kickers: kicker ? [kicker] : [] };
	}
	// Check Four of a Kind with Joker
	const threeKindValueForFour = Object.keys(rankCounts).find(v => rankCounts[Number(v)] === 3);
	if (hasJoker && threeKindValueForFour) {
		const kicker = values.find(v => v !== Number(threeKindValueForFour) && v !== cardValues.Joker);
		return { rank: HAND_RANK.FOUR_OF_A_KIND, values: [Number(threeKindValueForFour)], kickers: kicker ? [kicker] : [] };
	}

	// 4. Full House
	const threeKindValue = Object.keys(rankCounts).find(v => rankCounts[Number(v)] === 3);
	const pairValue = Object.keys(rankCounts).find(v => rankCounts[Number(v)] === 2);
	if (threeKindValue && pairValue) {
		return { rank: HAND_RANK.FULL_HOUSE, values: [Number(threeKindValue), Number(pairValue)] };
	}
	// Check Full House with Joker (Joker acts as part of a pair)
	const pairsForFull = Object.keys(rankCounts).filter(v => rankCounts[Number(v)] === 2);
	if (hasJoker && pairsForFull.length === 2) {
		const highPair = Math.max(...pairsForFull.map(Number));
		const lowPair = Math.min(...pairsForFull.map(Number));
		// Joker completes the higher pair to make trips
		return { rank: HAND_RANK.FULL_HOUSE, values: [highPair, lowPair] };
	}

	// 5. Flush
	if (isFlush) {
		// Use non-Joker values, treat Joker as Ace if possible, else highest needed card
		let flushValues = nonJokerValues;
		if (hasJoker) {
			// If Joker makes it a flush, its value is effectively the highest missing card of that suit,
			// but for ranking purposes, we just use the actual cards + Joker as Ace if no Ace present.
			if (!nonJokerValues.includes(14)) {
				flushValues = [14, ...nonJokerValues].sort((a, b) => b - a);
			} else {
				// Joker acts as highest card *not* present to avoid duplicate Ace. Find highest possible value < 14 not present.
				let highestPossible = 13;
				while(nonJokerValues.includes(highestPossible)) highestPossible--;
				flushValues = [highestPossible, ...nonJokerValues].sort((a, b) => b - a);
			}
		}
		return { rank: HAND_RANK.FLUSH, values: flushValues.slice(0, 5) }; // Take top 5 values
	}

	// 6. Straight
	if (isStraight) {
		return { rank: HAND_RANK.STRAIGHT, values: [straightHighCard] };
	}

	// 7. Three of a Kind
	if (threeKindValue) {
		const kickers = values.filter(v => v !== Number(threeKindValue)).sort((a, b) => b - a);
		return { rank: HAND_RANK.THREE_OF_A_KIND, values: [Number(threeKindValue)], kickers: kickers.slice(0, 2) };
	}
	// Check Three of a Kind with Joker
	if (hasJoker && pairValue) {
		const kickers = values.filter(v => v !== Number(pairValue) && v !== cardValues.Joker).sort((a, b) => b - a);
		return { rank: HAND_RANK.THREE_OF_A_KIND, values: [Number(pairValue)], kickers: kickers.slice(0, 2) };
	}

	// 8. Two Pair
	const pairs = Object.keys(rankCounts).filter(v => rankCounts[Number(v)] === 2);
	if (pairs.length === 2) {
		const highPair = Math.max(...pairs.map(Number));
		const lowPair = Math.min(...pairs.map(Number));
		const kicker = values.find(v => v !== highPair && v !== lowPair);
		return { rank: HAND_RANK.TWO_PAIR, values: [highPair, lowPair], kickers: kicker ? [kicker] : [] };
	}
	// Check Two Pair with Joker (Joker makes second pair with highest singleton)
	if (hasJoker && pairs.length === 1) {
		const existingPair = Number(pairs[0]);
		const singletons = values.filter(v => v !== existingPair && v !== cardValues.Joker).sort((a, b) => b - a);
		const secondPair = singletons[0]; // Joker pairs with the highest singleton
		const kicker = singletons[1];
		const highPairValue = Math.max(existingPair, secondPair);
		const lowPairValue = Math.min(existingPair, secondPair);
		return { rank: HAND_RANK.TWO_PAIR, values: [highPairValue, lowPairValue], kickers: kicker ? [kicker] : [] };
	}

	// 9. One Pair
	if (pairValue) {
		const kickers = values.filter(v => v !== Number(pairValue)).sort((a, b) => b - a);
		return { rank: HAND_RANK.ONE_PAIR, values: [Number(pairValue)], kickers: kickers.slice(0, 3) };
	}
	// Check One Pair with Joker (Joker pairs with highest singleton -> becomes Ace pair if no Ace)
	if (hasJoker) {
		const singletons = values.filter(v => v !== cardValues.Joker).sort((a, b) => b - a);
		let pairVal = 14; // Joker defaults to Ace if no pair made
		if (singletons.includes(14)) { // If Ace already present, Joker pairs with King (or next highest)
			pairVal = singletons[1] || 13; // Pair with highest card that isn't the Ace
		}
		const kickers = singletons.filter(v => v !== pairVal).sort((a, b) => b - a);
		return { rank: HAND_RANK.ONE_PAIR, values: [pairVal], kickers: kickers.slice(0, 3) };
	}

	// 10. High Card
	const highCardValues = values.sort((a, b) => b - a);
	const isAceHighPaiGow = highCardValues[0] === 14 && !isStraight && !isFlush && !pairValue && !threeKindValue; // Check specifically for Ace-High non-pair/flush/straight

	return { rank: HAND_RANK.HIGH_CARD, values: highCardValues.slice(0, 5), isAceHighPaiGow };
}


// --- 2-Card Hand Evaluation ---

/**
 * Evaluates a 2-card Pai Gow hand.
 * @param {Card[]} hand - Exactly 2 cards.
 * @returns {HandEvaluation} The evaluated hand rank and values.
 */
export function evaluate2CardHand(hand: Card[]): HandEvaluation {
	if (hand.length !== 2) {
		throw new Error('evaluate2CardHand requires exactly 2 cards.');
	}

	const sortedHand = sortCards(hand);
	const values = sortedHand.map(c => cardValues[c.rank]);
	const hasJoker = values.includes(cardValues.Joker);

	// Check for Pair
	if (values[0] === values[1]) { // Natural pair
		return { rank: HAND_RANK.ONE_PAIR, values: [values[0]] };
	}
	if (hasJoker) { // Joker always makes a pair of Aces in 2-card hand
		return { rank: HAND_RANK.ONE_PAIR, values: [cardValues.A] };
	}

	// High Card
	return { rank: HAND_RANK.HIGH_CARD, values: values }; // values are already sorted high-low
}

// --- Hand Comparison ---

/**
 * Compares two evaluated hands (5-card or 2-card).
 * @param {HandEvaluation} hand1Eval - Evaluation of the first hand.
 * @param {HandEvaluation} hand2Eval - Evaluation of the second hand.
 * @returns {number} 1 if hand1 > hand2, -1 if hand1 < hand2, 0 if tie.
 */
export function compareEvaluatedHands(hand1Eval: HandEvaluation, hand2Eval: HandEvaluation): number {
	if (hand1Eval.rank > hand2Eval.rank) return 1;
	if (hand1Eval.rank < hand2Eval.rank) return -1;

	// Ranks are equal, compare primary values
	for (let i = 0; i < hand1Eval.values.length; i++) {
		if (i >= hand2Eval.values.length) return 1; // hand1 has more primary values (shouldn't happen with same rank)
		if (hand1Eval.values[i] > hand2Eval.values[i]) return 1;
		if (hand1Eval.values[i] < hand2Eval.values[i]) return -1;
	}
	if (hand2Eval.values.length > hand1Eval.values.length) return -1; // hand2 has more primary values

	// Primary values are equal, compare kickers (if any)
	const kickers1 = hand1Eval.kickers || [];
	const kickers2 = hand2Eval.kickers || [];
	const maxKickers = Math.max(kickers1.length, kickers2.length);

	for (let i = 0; i < maxKickers; i++) {
		const k1 = kickers1[i] ?? -1; // Use -1 if kicker doesn't exist
		const k2 = kickers2[i] ?? -1;
		if (k1 > k2) return 1;
		if (k1 < k2) return -1;
	}

	// Hands are identical
	return 0;
}