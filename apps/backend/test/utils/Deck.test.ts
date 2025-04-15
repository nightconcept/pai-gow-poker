import { describe, it, expect, beforeEach } from 'vitest';
import { Deck } from '../../src/utils/Deck';
import { Card } from '../../src/models/Card';

describe('Deck', () => {
	let deck: Deck;

	beforeEach(() => {
		deck = new Deck();
	});

	/**
	 * @test {Deck} - Verify deck initialization (Task 5 Verify Step)
	 * @description Checks if a new deck contains exactly 53 unique cards.
	 */
	it('should initialize with 53 unique cards', () => {
		expect(deck.remainingCards()).toBe(53);

		// Deal all cards to check content
		const allCards = deck.deal(53);
		expect(allCards).toHaveLength(53);
		expect(deck.remainingCards()).toBe(0);

		// Check for uniqueness
		const cardStrings = allCards.map((card) => `${card.rank}-${card.suit}`);
		const uniqueCardStrings = new Set(cardStrings);
		expect(uniqueCardStrings.size).toBe(53);

		// Check for Joker
		const joker = allCards.find((card) => card.rank === 'Joker');
		expect(joker).toBeDefined();
		expect(joker?.suit).toBe('Joker');
	});

	/**
	 * @test {Deck#shuffle} - Verify deck shuffling (Task 5 Verify Step)
	 * @description Checks if shuffling changes the order of cards by comparing the order before and after shuffling.
	 */
	it('should shuffle the cards changing their order', () => {
		const originalOrder = deck.deal(53); // Deal all cards to get initial order
		deck.reset(); // Reset to a full deck
		deck.shuffle();
		const shuffledOrder = deck.deal(53); // Deal all cards again after shuffle

		expect(shuffledOrder).toHaveLength(53);
		expect(originalOrder).toHaveLength(53);

		// Ensure the shuffled order is different from the original (highly likely)
		expect(shuffledOrder).not.toEqual(originalOrder);

		// Ensure the shuffled deck still contains the same unique set of cards
		const originalSet = new Set(originalOrder.map((c) => `${c.rank}-${c.suit}`));
		const shuffledSet = new Set(shuffledOrder.map((c) => `${c.rank}-${c.suit}`));
		expect(shuffledSet).toEqual(originalSet);
	});

	/**
	 * @test {Deck#deal} - Verify card dealing (Task 5 Verify Step)
	 * @description Checks if dealing removes the correct number of cards from the deck and returns them.
	 */
	it('should deal the specified number of cards and update remaining count', () => {
		const numCardsToDeal = 7;
		const initialRemaining = deck.remainingCards();
		expect(initialRemaining).toBe(53);

		const dealtHand = deck.deal(numCardsToDeal);

		expect(dealtHand).toHaveLength(numCardsToDeal);
		expect(deck.remainingCards()).toBe(initialRemaining - numCardsToDeal);

		// Ensure dealt cards are unique within the hand
		const dealtCardStrings = dealtHand.map((card) => `${card.rank}-${card.suit}`);
		const uniqueDealtStrings = new Set(dealtCardStrings);
		expect(uniqueDealtStrings.size).toBe(numCardsToDeal);
	});

	/**
	 * @test {Deck#deal} - Verify dealing more cards than available
	 * @description Checks that attempting to deal more cards than available returns an empty array and doesn't change the remaining count.
	 */
	it('should return an empty array when dealing more cards than available', () => {
		const initialRemaining = deck.remainingCards();
		const numToDeal = initialRemaining + 5;

		const dealtHand = deck.deal(numToDeal);

		expect(dealtHand).toEqual([]); // Expect empty array based on Deck.ts implementation
		expect(deck.remainingCards()).toBe(initialRemaining); // Remaining count should not change
	});

	/**
	 * @test {Deck#reset} - Verify deck reset
	 * @description Checks if resetting the deck restores the remaining card count to 53.
	 */
	it('should reset the deck to 53 remaining cards', () => {
		deck.shuffle();
		deck.deal(10);
		expect(deck.remainingCards()).toBe(43);

		deck.reset();
		expect(deck.remainingCards()).toBe(53);

		// Optional: Verify content after reset by dealing again
		const allCardsAfterReset = deck.deal(53);
		expect(allCardsAfterReset).toHaveLength(53);
		const cardStrings = allCardsAfterReset.map((card) => `${card.rank}-${card.suit}`);
		const uniqueCardStrings = new Set(cardStrings);
		expect(uniqueCardStrings.size).toBe(53);
	});
});