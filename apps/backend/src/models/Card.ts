/**
 * Represents a single playing card.
 */
export interface Card {
	rank: string; // '2', '3', ..., 'K', 'A', 'Joker'
	suit: string; // 'Spades', 'Hearts', 'Diamonds', 'Clubs', 'Joker'
}