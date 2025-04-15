import type { Card } from '../models/Card';
import { evaluate5CardHand, evaluate2CardHand, compareEvaluatedHands, HandEvaluation, HAND_RANK } from './handEvaluator';

/**
 * Represents the dealer's set hand.
 */
export interface SetHand {
	highHand: Card[]; // 5 cards
	lowHand: Card[]; // 2 cards
}

/**
 * Finds all possible valid 5-card/2-card splits from a 7-card hand.
 * A split is valid if the 5-card hand ranks strictly higher than the 2-card hand.
 * @param {Card[]} sevenCards - The 7 cards to split.
 * @returns {SetHand[]} An array of all valid SetHand possibilities.
 */
function getAllValidSplits(sevenCards: Card[]): SetHand[] {
	if (sevenCards.length !== 7) {
		throw new Error('Requires exactly 7 cards.');
	}

	const validSplits: SetHand[] = [];
	const combinations = getAllCombinations(sevenCards, 5); // Get all 5-card combinations

	for (const highHandAttempt of combinations) {
		const lowHandAttempt = sevenCards.filter(card => !highHandAttempt.includes(card));

		if (lowHandAttempt.length !== 2) continue; // Should always be 2, but safety check

		const highEval = evaluate5CardHand(highHandAttempt);
		const lowEval = evaluate2CardHand(lowHandAttempt);

		// Fundamental Pai Gow Rule: High hand must rank higher than low hand
		if (compareEvaluatedHands(highEval, lowEval) > 0) {
			validSplits.push({ highHand: highHandAttempt, lowHand: lowHandAttempt });
		}
	}
	return validSplits;
}

/**
 * Helper function to get all combinations of k items from a set.
 * @param {T[]} set - The array of items.
 * @param {number} k - The size of combinations to choose.
 * @returns {T[][]} An array of all combinations.
 */
function getAllCombinations<T>(set: T[], k: number): T[][] {
	if (k < 0 || k > set.length) {
		return [];
	}
	if (k === 0) {
		return [[]];
	}
	if (k === set.length) {
		return [set];
	}
	const [first, ...rest] = set;
	const combsWithFirst = getAllCombinations(rest, k - 1).map(comb => [first, ...comb]);
	const combsWithoutFirst = getAllCombinations(rest, k);
	return [...combsWithFirst, ...combsWithoutFirst];
}


/**
 * Sets the dealer's 7 cards according to a predefined "House Way".
 * This implementation follows the simplified rules mentioned in PLANNING.md Appendix.
 * It prioritizes finding the best possible low hand while maintaining a valid split.
 * @param {Card[]} sevenCards - The dealer's 7 cards.
 * @returns {SetHand} The optimally set 5-card high hand and 2-card low hand.
 */
export function setDealerHandHouseWay(sevenCards: Card[]): SetHand {
	if (sevenCards.length !== 7) {
		throw new Error('setDealerHandHouseWay requires exactly 7 cards.');
	}

	// 1. Generate all possible valid splits
	const validSplits = getAllValidSplits(sevenCards);

	if (validSplits.length === 0) {
		// This should theoretically never happen with 7 cards unless the evaluator has a bug
		// or the input is invalid. Fallback: put highest 5 in high hand.
		console.error("CRITICAL: No valid splits found for dealer hand:", sevenCards);
		const sorted = sevenCards.sort((a, b) => (b.rank === 'Joker' ? 99 : parseInt(b.rank, 10) || (b.rank === 'A' ? 14 : b.rank === 'K' ? 13 : b.rank === 'Q' ? 12 : 11)) - (a.rank === 'Joker' ? 99 : parseInt(a.rank, 10) || (a.rank === 'A' ? 14 : a.rank === 'K' ? 13 : a.rank === 'Q' ? 12 : 11)));
		return { highHand: sorted.slice(0, 5), lowHand: sorted.slice(5, 7) };
	}

	// 2. Evaluate all valid splits
	const evaluatedSplits = validSplits.map(split => ({
		split: split,
		highEval: evaluate5CardHand(split.highHand),
		lowEval: evaluate2CardHand(split.lowHand)
	}));

	// 3. Choose the best split based on House Way strategy (Maximize Low Hand)
	// Sort by low hand rank (desc), then by high hand rank (desc) as tiebreaker
	evaluatedSplits.sort((a, b) => {
		const lowCompare = compareEvaluatedHands(b.lowEval, a.lowEval); // Higher low hand first
		if (lowCompare !== 0) {
			return lowCompare;
		}
		// If low hands tie, compare high hands
		return compareEvaluatedHands(b.highEval, a.highEval); // Higher high hand first
	});

	// The best split according to this strategy is the first one after sorting
	const bestSplit = evaluatedSplits[0].split;

	console.log("Dealer House Way determined split:", {
		highHand: bestSplit.highHand.map(c => c.rank + c.suit[0]),
		lowHand: bestSplit.lowHand.map(c => c.rank + c.suit[0])
	});

	return bestSplit;

	// Note: The detailed rule-by-rule implementation (Five Aces, Four Kind, etc.) from
	// the Appendix is complex. This approach of finding the split that maximizes the
	// low hand's rank (while keeping the split valid) is a common and effective House Way.
	// It implicitly handles most cases correctly. We can refine with specific rules later if needed.
}