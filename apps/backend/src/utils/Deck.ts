import type { Card } from '../models/Card';

/**
 * Represents a standard 53-card deck (including Joker) for Pai Gow Poker.
 * Provides functionality for creating, shuffling, and dealing cards.
 */
export class Deck {
	private cards: Card[];

	/**
	 * Initializes a new Deck instance with a standard 53-card set.
	 */
	constructor() {
		this.cards = this.generateDeck();
	}

	/**
	 * Generates a standard 53-card deck.
	 * @returns {Card[]} An array representing the deck.
	 */
	private generateDeck(): Card[] {
		const suits = ['♠️', '♥️', '♦️', '♣️'];
		const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
		const deck: Card[] = [];

		for (const suit of suits) {
			for (const rank of ranks) {
				deck.push({ suit, rank });
			}
		}

		// Add the Joker
		deck.push({ suit: 'Joker', rank: 'Joker' });

		return deck;
	}

	/**
	 * Shuffles the deck using the Fisher-Yates (Knuth) algorithm.
	 */
	shuffle(): void {
		let currentIndex = this.cards.length;
		let randomIndex: number;

		// While there remain elements to shuffle.
		while (currentIndex !== 0) {
			// Pick a remaining element.
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;

			// And swap it with the current element.
			[this.cards[currentIndex], this.cards[randomIndex]] = [
				this.cards[randomIndex],
				this.cards[currentIndex],
			];
		}
		console.log('Deck shuffled.');
	}

	/**
	 * Deals a specified number of cards from the top of the deck.
	 * Removes the dealt cards from the deck.
	 * @param {number} numberOfCards - The number of cards to deal.
	 * @returns {Card[]} An array of dealt cards. Returns empty array if not enough cards.
	 */
	deal(numberOfCards: number): Card[] {
		if (numberOfCards > this.cards.length) {
			console.error(`Not enough cards in deck to deal ${numberOfCards}. Remaining: ${this.cards.length}`);
			return [];
		}
		// Deal from the "top" (end of the array)
		return this.cards.splice(-numberOfCards, numberOfCards);
	}

	/**
	 * Returns the number of cards remaining in the deck.
	 * @returns {number} The number of cards left.
	 */
	remainingCards(): number {
		return this.cards.length;
	}

	/**
	 * Resets the deck to a full, unshuffled 53-card set.
	 */
	reset(): void {
		this.cards = this.generateDeck();
		console.log('Deck reset to full 53 cards.');
	}
}