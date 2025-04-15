import { Player } from './Player';
import type { Card } from './Card';
import { Deck } from '../utils/Deck';
import { setDealerHandHouseWay } from '../utils/houseWay'; // Import house way logic
import { evaluate5CardHand, HAND_RANK } from '../utils/handEvaluator'; // Import evaluator for Ace-High check

/**
 * Represents the state of a single Pai Gow Poker game table/session.
 * For the MVP, there will only be one instance of this.
 */
export class GameTable {
	id: string; // Unique identifier for the table (e.g., generated UUID)
	hostId: string | null; // Player.id of the host (simplified for MVP)
	players: Map<string, Player>; // Map of Player.id to Player object
	gameState: string; // e.g., 'WaitingForPlayers', 'Betting', 'Dealing', 'PlayerAction', 'Showdown'
	deck: Deck; // Use the Deck class instance
	dealerHand: {
		// Structure for the dealer's hand
		dealtCards: Card[] | null;
		highHand: Card[] | null; // 5-card hand
		lowHand: Card[] | null; // 2-card hand
		isAceHighPaiGow: boolean;
	};
	gameSettings: {
		// Basic game settings
		startingDB: number;
		fixedBetAmount: number; // For MVP
	};
	// turnHistory: any[]; // Optional for step-back, not in MVP

	/**
	 * Creates a new GameTable instance.
	 * @param {string} id - The unique ID for the game table.
	 */
	constructor(id: string) {
		this.id = id;
		this.hostId = null; // Will be assigned to the first player in MVP
		this.players = new Map<string, Player>();
		this.gameState = 'WaitingForPlayers'; // Initial state
		this.deck = new Deck(); // Initialize the deck instance
		this.dealerHand = {
			dealtCards: null,
			highHand: null,
			lowHand: null,
			isAceHighPaiGow: false,
		};
		this.gameSettings = {
			startingDB: 1000, // Default starting DannyBucks
			fixedBetAmount: 10, // Default fixed bet for MVP
		};
		// this.turnHistory = [];
	}

	/**
	 * Adds a player to the game table.
	 * @param {Player} player - The player object to add.
	 */
	addPlayer(player: Player) {
		if (!this.players.has(player.id)) {
			this.players.set(player.id, player);
			console.log(`Player ${player.id} added to table ${this.id}. Total players: ${this.players.size}`);
			// Assign host if first player (MVP simplification)
			if (this.players.size === 1) {
				this.hostId = player.id;
				player.isHost = true;
				console.log(`Player ${player.id} assigned as host.`);
			}
		}
	}

	/**
	 * Removes a player from the game table.
	 * @param {string} playerId - The ID of the player to remove.
	 */
	removePlayer(playerId: string) {
		const player = this.players.get(playerId);
		if (player) {
			this.players.delete(playerId);
			console.log(`Player ${playerId} (${player.username || 'unknown'}) removed from table ${this.id}. Total players: ${this.players.size}`);

			// Handle host leaving (simple reassignment for MVP if needed, or end game)
			if (this.hostId === playerId) {
				console.log(`Host ${playerId} left.`);
				// For MVP, we might just stop or let it continue without a host if simple.
				// Or assign to the next player if any remain.
				if (this.players.size > 0) {
					const nextHost = this.players.values().next().value as Player;
					this.hostId = nextHost.id;
					nextHost.isHost = true;
					console.log(`New host assigned: ${nextHost.id} (${nextHost.username || 'unknown'})`);
				} else {
					this.hostId = null;
					console.log('Table is now empty.');
					// Reset game state?
					this.gameState = 'WaitingForPlayers';
				}
			}
		}
	}

	/**
	 * Retrieves a player by their WebSocket connection ID.
	 * Note: This assumes player ID matches connection ID for simplicity now.
	 * @param {string} connectionId - The WebSocket connection ID.
	 * @returns {Player | undefined} The player object or undefined if not found.
	 */
	getPlayerByConnectionId(connectionId: string): Player | undefined {
		// In this implementation, we are using the player ID as the key,
		// which we will generate based on the connection initially.
		return this.players.get(connectionId);
	}

	// TODO: Add methods for game logic (set state, etc.)

	/**
	 * Starts a new round of Pai Gow Poker.
	 * Resets/shuffles the deck and deals cards to active players and the dealer.
	 * Assumes betting has already occurred for the players involved.
	 */
	startNewRound() {
		console.log(`Starting new round for table ${this.id}...`);
		this.gameState = 'Dealing';

		// Reset hands and deck
		this.deck.reset();
		this.deck.shuffle();
		this.dealerHand = {
			dealtCards: null,
			highHand: null,
			lowHand: null,
			isAceHighPaiGow: false,
		};
		this.players.forEach((player) => {
			player.currentHand = null;
			// player.currentBet = null; // Bet should persist from betting phase
		});

		// Identify active players (those with usernames who have placed a bet - simplified for now)
		// Identify active players (those with usernames who have placed a bet)
		const activePlayers = Array.from(this.players.values()).filter(
			(p) => p.username && p.currentBet !== null && p.currentBet > 0
		);

		if (activePlayers.length === 0) {
			console.log('No active players to start round.');
			this.gameState = 'WaitingForPlayers';
			return; // Don't deal if no one is playing
		}

		console.log(`Dealing cards to ${activePlayers.length} players and dealer.`);

		// Deal 7 cards to each active player
		activePlayers.forEach((player) => {
			player.currentHand = this.deck.deal(7);
			console.log(`Dealt 7 cards to player ${player.id} (${player.username}). Deck remaining: ${this.deck.remainingCards()}`);
			// Send the hand specifically to this player
			if (player.ws.readyState === player.ws.OPEN) { // Check if connection is open
				player.ws.send(JSON.stringify({
					type: 'dealHand',
					payload: { hand: player.currentHand }
				}));
			} else {
				console.warn(`Could not send hand to player ${player.id} (${player.username}) - WebSocket not open.`);
			}
		});

		// Deal 7 cards to the dealer
		// Deal 7 cards to the dealer
		this.dealerHand.dealtCards = this.deck.deal(7); // Original line restored
		console.log(`Dealt 7 cards to dealer. Deck remaining: ${this.deck.remainingCards()}`);
		// --- Leftover comment removed ---


		if (!this.dealerHand.dealtCards) {
			console.error("CRITICAL: Dealer cards were not dealt correctly.");
			// Handle error appropriately, maybe reset state
			this.gameState = 'WaitingForPlayers';
			return;
		}

		// --- Set Dealer Hand using House Way ---
		const dealerSetHand = setDealerHandHouseWay(this.dealerHand.dealtCards);
		this.dealerHand.highHand = dealerSetHand.highHand;
		this.dealerHand.lowHand = dealerSetHand.lowHand;
		console.log("Dealer hand set via House Way.");

		// --- Check for Ace-High Pai Gow ---
		const dealerHighEval = evaluate5CardHand(this.dealerHand.highHand);
		this.dealerHand.isAceHighPaiGow = dealerHighEval.isAceHighPaiGow ?? false; // Use the flag from evaluator

		if (this.dealerHand.isAceHighPaiGow) {
			console.log("Dealer has Ace-High Pai Gow! Round is a push.");
			this.gameState = 'AceHighPush';
		} else {
			console.log("Dealer does not have Ace-High Pai Gow. Proceeding to player action.");
			this.gameState = 'PlayerAction'; // State where players set their hands
		}
		console.log(`Dealing and dealer setting complete. Game state changed to: ${this.gameState}`);

		// TODO: Broadcast game state update including dealer's revealed 7 cards,
		// set hands, and aceHighPaiGow status (Likely done back in index.ts after calling this)
	}
}