import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameTable } from '../../src/models/GameTable';
import { Player } from '../../src/models/Player';
import type { Card } from '../../src/models/Card'; // Import Card type
import { Deck } from '../../src/utils/Deck';
import type { WebSocket } from 'ws';
import * as houseWayUtils from '../../src/utils/houseWay'; // Import module for spying
import * as handEvaluatorUtils from '../../src/utils/handEvaluator'; // Import module for spying
import { HAND_RANK } from '../../src/utils/handEvaluator'; // Import HAND_RANK directly

// Mock the Deck class to control its behavior
vi.mock('../../src/utils/Deck');
// We don't need to mock houseWay or handEvaluator globally if we spy on specific methods


// Mock WebSocket - we only need the interface, not actual connection
const createMockWebSocket = (): WebSocket => {
	// Basic mock satisfying the type, add properties/methods if needed by tested code
	return {
		OPEN: 1,
		readyState: 1, // Mock as open
		send: vi.fn(),
		// Add other methods/properties used by GameTable or Player if any
	} as unknown as WebSocket;
};

describe('GameTable', () => {
	let gameTable: GameTable;
	let mockPlayer1: Player;
	let mockPlayer2: Player;
	let mockPlayer3: Player;

	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();

		// Create a new GameTable instance
		gameTable = new GameTable('test-table-1');

		// Create mock players
		mockPlayer1 = new Player('p1', createMockWebSocket());
		mockPlayer1.username = 'Alice';
		mockPlayer2 = new Player('p2', createMockWebSocket());
		mockPlayer2.username = 'Bob';
        mockPlayer3 = new Player('p3', createMockWebSocket());
        // Player 3 has no username initially

        // --- Spies will be set up on the instance in tests where needed ---

 });

	/**
	 * @test {GameTable#addPlayer} - Verify adding players (Task 3 Verify Step)
	 */
	it('should add players correctly and assign host to the first player', () => {
		expect(gameTable.players.size).toBe(0);
		expect(gameTable.hostId).toBeNull();

		gameTable.addPlayer(mockPlayer1);
		expect(gameTable.players.size).toBe(1);
		expect(gameTable.players.get('p1')).toBe(mockPlayer1);
		expect(gameTable.hostId).toBe('p1');
		expect(mockPlayer1.isHost).toBe(true);

		gameTable.addPlayer(mockPlayer2);
		expect(gameTable.players.size).toBe(2);
		expect(gameTable.players.get('p2')).toBe(mockPlayer2);
		expect(gameTable.hostId).toBe('p1'); // Host should not change
		expect(mockPlayer2.isHost).toBe(false);

        // Try adding the same player again
        gameTable.addPlayer(mockPlayer1);
        expect(gameTable.players.size).toBe(2); // Size should not change
	});

    /**
	 * @test {GameTable#removePlayer} - Verify removing players (Task 3 Verify Step)
	 */
	it('should remove players correctly', () => {
        gameTable.addPlayer(mockPlayer1);
        gameTable.addPlayer(mockPlayer2);
        expect(gameTable.players.size).toBe(2);

        gameTable.removePlayer('p2');
        expect(gameTable.players.size).toBe(1);
        expect(gameTable.players.has('p2')).toBe(false);
        expect(gameTable.hostId).toBe('p1'); // Host remains p1

        gameTable.removePlayer('p1'); // Remove the host
        expect(gameTable.players.size).toBe(0);
        expect(gameTable.players.has('p1')).toBe(false);
        expect(gameTable.hostId).toBeNull(); // Host should be null
        expect(gameTable.gameState).toBe('WaitingForPlayers'); // State should reset
    });

    /**
	 * @test {GameTable#removePlayer} - Verify host reassignment (Task 3 Verify Step)
	 */
	it('should reassign host correctly when the current host leaves', () => {
        gameTable.addPlayer(mockPlayer1); // Host
        gameTable.addPlayer(mockPlayer2);
        gameTable.addPlayer(mockPlayer3); // No username yet
        mockPlayer3.username = 'Charlie'; // Give p3 a username

        expect(gameTable.hostId).toBe('p1');

        gameTable.removePlayer('p1'); // Remove host
        expect(gameTable.players.size).toBe(2);
        expect(gameTable.hostId).toBe('p2'); // Should reassign to p2 (next added)
        expect(mockPlayer2.isHost).toBe(true);
        expect(mockPlayer3.isHost).toBe(false);

        gameTable.removePlayer('p2'); // Remove new host
        expect(gameTable.players.size).toBe(1);
        expect(gameTable.hostId).toBe('p3'); // Should reassign to p3
        expect(mockPlayer3.isHost).toBe(true);

        gameTable.removePlayer('p3'); // Remove last player
        expect(gameTable.players.size).toBe(0);
        expect(gameTable.hostId).toBeNull();
    });

    /**
	 * @test {GameTable#startNewRound} - Verify dealing logic (Task 5 Verify Step)
	 */
	it('should reset deck, shuffle, and deal 7 cards to active players and dealer', () => {
        mockPlayer1.currentBet = gameTable.gameSettings.fixedBetAmount;
        mockPlayer2.currentBet = gameTable.gameSettings.fixedBetAmount;
        // Player 3 has no username/bet, should not be dealt cards

        gameTable.addPlayer(mockPlayer1);
        gameTable.addPlayer(mockPlayer2);
        gameTable.addPlayer(mockPlayer3);

        // Spy on the specific deck instance *after* table creation
        const resetSpy = vi.spyOn(gameTable.deck, 'reset');
        const shuffleSpy = vi.spyOn(gameTable.deck, 'shuffle');
        const dealSpy = vi.spyOn(gameTable.deck, 'deal');
        // Mock deal implementation on the instance spy
        dealSpy.mockImplementation((numCards: number) => {
             const hand: Card[] = [];
             for (let i = 0; i < numCards; i++) {
                 // Use slightly different cards for dealer/player for clarity if needed
                 hand.push({ rank: 'K', suit: 'D' });
             }
             return hand;
         });


        gameTable.startNewRound();

        // Verify deck interactions on the instance
        expect(resetSpy).toHaveBeenCalledTimes(1);
        expect(shuffleSpy).toHaveBeenCalledTimes(1);
        // 2 players + 1 dealer = 3 deals of 7 cards
        expect(dealSpy).toHaveBeenCalledTimes(3);
        expect(dealSpy).toHaveBeenCalledWith(7);

        // Verify players received hands
        expect(mockPlayer1.currentHand).toHaveLength(7);
        expect(mockPlayer2.currentHand).toHaveLength(7);
        expect(mockPlayer3.currentHand).toBeNull(); // Player 3 was inactive

        // Verify dealer received hand
        expect(gameTable.dealerHand.dealtCards).toHaveLength(7);

        // Verify WebSocket send was called for active players
        expect(mockPlayer1.ws.send).toHaveBeenCalledTimes(1);
        expect(mockPlayer2.ws.send).toHaveBeenCalledTimes(1);
        expect(mockPlayer3.ws.send).not.toHaveBeenCalled();
	});

    /**
	 * @test {GameTable#startNewRound} - Verify dealer hand setting and Ace-High check (Task 6 Verify Step)
	 */
	it('should set dealer hand using House Way and check for Ace-High Pai Gow', async () => { // Make test async
	       mockPlayer1.currentBet = gameTable.gameSettings.fixedBetAmount;
	       gameTable.addPlayer(mockPlayer1);

	       // Spy on the imported modules
	       const houseWaySpy = vi.spyOn(houseWayUtils, 'setDealerHandHouseWay');
	       const evalSpy = vi.spyOn(handEvaluatorUtils, 'evaluate5CardHand');

	          // Mock the deal method on the specific instance *before* calling startNewRound
	          const dealSpy = vi.spyOn(gameTable.deck, 'deal');
	          // Ensure the mock returns a valid 7-card array for the dealer deal
	          dealSpy.mockImplementation((numCards: number) => {
	              const hand: Card[] = [];
	              // Ensure exactly 7 cards are returned for the dealer/player
	              const count = numCards === 7 ? 7 : 0;
	              for (let i = 0; i < count; i++) {
	                  hand.push({ rank: `${10-i}`, suit: 'S' }); // Deal specific cards
	              }
	              return hand;
	          });


	       // --- Test Ace-High Case ---
	       // Mock the evaluator *before* calling startNewRound
	       evalSpy.mockReturnValue({ rank: HAND_RANK.HIGH_CARD, values: [14, 10, 8, 5, 2], isAceHighPaiGow: true });

	       gameTable.startNewRound();

	          // Verify deal was called (at least once for the dealer)
	          expect(dealSpy).toHaveBeenCalled();
	          // Verify dealer got cards *before* checking houseWay call
	          expect(gameTable.dealerHand.dealtCards).toBeInstanceOf(Array);
	          expect(gameTable.dealerHand.dealtCards).toHaveLength(7);
	          // Now check if houseWay was called
	       expect(houseWaySpy).toHaveBeenCalledOnce();
	       expect(gameTable.dealerHand.highHand).toBeDefined();
	       expect(gameTable.dealerHand.lowHand).toBeDefined();
	       // Check the result based on the mocked evaluation
	       expect(gameTable.dealerHand.isAceHighPaiGow).toBe(true);
	       expect(gameTable.gameState).toBe('AceHighPush');

	       // --- Test Non-Ace-High Case (in a separate test or clear mocks carefully) ---
	       // Resetting state or using a new test is cleaner
	       // For simplicity here, we'll clear and mock again
	       houseWaySpy.mockClear();
	       evalSpy.mockClear();
	       // Mock for non-Ace-High
	       evalSpy.mockReturnValue({ rank: HAND_RANK.ONE_PAIR, values: [10], kickers: [14, 8, 5], isAceHighPaiGow: false });

	       // Need to reset player bets/hands if startNewRound modifies them, or use fresh players
	       mockPlayer1.currentHand = null;
	       mockPlayer1.currentBet = gameTable.gameSettings.fixedBetAmount; // Ensure player is active again
	       gameTable.dealerHand = { dealtCards: null, highHand: null, lowHand: null, isAceHighPaiGow: false }; // Reset dealer hand state

	       gameTable.startNewRound(); // Call again

	       expect(houseWaySpy).toHaveBeenCalledOnce(); // Called again this round
	       // Check the result based on the new mocked evaluation
	       expect(gameTable.dealerHand.isAceHighPaiGow).toBe(false);
	       expect(gameTable.gameState).toBe('PlayerAction');

	});

    /**
	 * @test {GameTable#startNewRound} - Verify active player filtering (Task 7 Verify Step part)
	 */
	it('should only deal cards to players with username and a valid bet', () => {
        gameTable.addPlayer(mockPlayer1); // Has username
        gameTable.addPlayer(mockPlayer2); // Has username
        gameTable.addPlayer(mockPlayer3); // No username

        mockPlayer1.currentBet = gameTable.gameSettings.fixedBetAmount; // p1 bets
        mockPlayer2.currentBet = 0; // p2 has zero bet
        // p3 has no bet (null) and no username

        // Spy on the specific deck instance *after* adding players and setting bets
        const dealSpy = vi.spyOn(gameTable.deck, 'deal');
        // Ensure the mock returns 7 cards when called with 7
        dealSpy.mockImplementation((numCards: number) => {
             const hand: Card[] = [];
             const count = numCards === 7 ? 7 : 0;
             for (let i = 0; i < count; i++) {
                 hand.push({ rank: 'K', suit: 'D' });
             }
             return hand;
         });

        gameTable.startNewRound();

        // Verify deal was called for player1 (and dealer)
        expect(dealSpy).toHaveBeenCalled();
        // Check player1's hand directly
        expect(mockPlayer1.currentHand).toBeInstanceOf(Array); // Verify it's an array first
        expect(mockPlayer1.currentHand).toHaveLength(7); // Should get cards
        expect(mockPlayer2.currentHand).toBeNull(); // Should NOT get cards (zero bet)
        expect(mockPlayer3.currentHand).toBeNull(); // Should NOT get cards (no username/bet)

        // Check deal call count *after* startNewRound
        // Dealer + 1 active player = 2 deals
        expect(dealSpy).toHaveBeenCalledTimes(2);
 });

    /**
	 * @test {GameTable#startNewRound} - Verify state change when no active players
	 */
    it('should not deal and set state to WaitingForPlayers if no active players', () => {
        gameTable.addPlayer(mockPlayer1);
        gameTable.addPlayer(mockPlayer2);
        // No players place a bet
        mockPlayer1.currentBet = null;
        mockPlayer2.currentBet = null;

        // Spy on the specific deck instance *after* adding players and setting bets
        const dealSpy = vi.spyOn(gameTable.deck, 'deal');
        gameTable.startNewRound();

        expect(dealSpy).not.toHaveBeenCalled();
        expect(mockPlayer1.currentHand).toBeNull();
        expect(mockPlayer2.currentHand).toBeNull();
        expect(gameTable.dealerHand.dealtCards).toBeNull();
        expect(gameTable.gameState).toBe('WaitingForPlayers');
    });

});